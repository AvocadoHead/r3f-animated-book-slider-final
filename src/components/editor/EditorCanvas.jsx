import { useRef, useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { createVideoMetadata, loadVideoThumbnail } from '@/utils/videoHelpers';
import { FrameOverlay } from './FrameOverlay';

const PAGE_DIMENSIONS = {
  width: 800,
  height: 1070,
  actualWidth: 1325,
  actualHeight: 1771,
};

// --- Helper: Bulk Import Modal Component ---
const BulkImportModal = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-full">
        <h3 className="text-xl font-bold mb-2">Import Images</h3>
        <p className="text-sm text-gray-500 mb-4">
          Paste a list of image URLs (one per line). Supports direct links and Google Drive.
        </p>
        <textarea
          className="w-full h-48 p-3 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          placeholder="https://example.com/image1.jpg&#10;https://drive.google.com/file/d/..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button 
            onClick={() => { onImport(text); setText(''); onClose(); }}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Import Images
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export const EditorCanvas = ({ initialData, onSave, onClose }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Initialize Fabric.js
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    if (initialData?.fabricJSON) {
      try {
        canvas.loadFromJSON(initialData.fabricJSON, () => {
          canvas.renderAll();
        });
      } catch (error) {
        console.log('No previous data to load');
      }
    }

    // Event Listeners
    canvas.on('selection:created', (e) => setSelectedObject(e.selected[0]));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected[0]));
    canvas.on('selection:cleared', () => setSelectedObject(null));
    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    return () => {
      canvas.dispose();
    };
  }, []);

  const saveHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const json = fabricCanvasRef.current.toJSON(['videoMetadata', 'isVideo']);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      return [...newHistory, json];
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  const undo = useCallback(() => {
    if (historyStep > 0 && fabricCanvasRef.current) {
      const prevState = history[historyStep - 1];
      fabricCanvasRef.current.loadFromJSON(prevState, () => {
        fabricCanvasRef.current.renderAll();
        setHistoryStep(prev => prev - 1);
      });
    }
  }, [history, historyStep]);

  const redo = useCallback(() => {
    if (historyStep < history.length - 1 && fabricCanvasRef.current) {
      const nextState = history[historyStep + 1];
      fabricCanvasRef.current.loadFromJSON(nextState, () => {
        fabricCanvasRef.current.renderAll();
        setHistoryStep(prev => prev + 1);
      });
    }
  }, [history, historyStep]);

  // --- Image Processing Logic ---

  const processGoogleDriveLink = (url) => {
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([^\/]+)/);
      if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId[1]}`;
      }
    }
    return url;
  };

  const addImageToCanvas = (url, index = 0) => {
    return new Promise((resolve, reject) => {
      const processedUrl = processGoogleDriveLink(url.trim());
      
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      
      imgElement.onload = () => {
        fabric.Image.fromURL(processedUrl, (img) => {
          if (!fabricCanvasRef.current) return;

          // Smart Layout Logic
          // 1. Calculate max dimensions (leave 10% padding)
          const padding = 40;
          const availableWidth = PAGE_DIMENSIONS.width - (padding * 2);
          const availableHeight = PAGE_DIMENSIONS.height - (padding * 2);

          // 2. Determine scale to fit within bounds while maintaining aspect ratio
          const scaleX = availableWidth / img.width;
          const scaleY = availableHeight / img.height;
          const scale = Math.min(scaleX, scaleY); // fit entirely visible

          // 3. Apply scale
          img.scale(scale);

          // 4. Center object
          img.set({
            left: PAGE_DIMENSIONS.width / 2 - (img.width * img.scaleX) / 2,
            top: PAGE_DIMENSIONS.height / 2 - (img.height * img.scaleY) / 2,
          });

          // 5. If adding multiple (batch), add a slight offset so they don't stack perfectly
          if (index > 0) {
            const offset = index * 20; // 20px cascade
            img.set({
              left: img.left + offset,
              top: img.top + offset
            });
          }

          fabricCanvasRef.current.add(img);
          resolve(img);
        });
      };

      imgElement.onerror = () => reject(new Error(`Failed to load ${url}`));
      imgElement.src = processedUrl;
    });
  };

  const handleBulkImport = async (textBlock) => {
    // extract URLs based on http/https
    const urls = textBlock.match(/(https?:\/\/[^\s]+)/g);
    
    if (!urls || urls.length === 0) {
      setStatus('❌ No valid URLs found');
      return;
    }

    setIsLoading(true);
    setStatus(`Loading ${urls.length} images...`);

    let loadedCount = 0;

    try {
      // Load sequentially to prevent browser freeze on large batches
      for (let i = 0; i < urls.length; i++) {
        try {
          await addImageToCanvas(urls[i], i);
          loadedCount++;
        } catch (err) {
          console.error(err);
        }
      }
      
      fabricCanvasRef.current.renderAll();
      setStatus(`✅ Added ${loadedCount} images!`);
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus('❌ Error processing batch');
    } finally {
      setIsLoading(false);
    }
  };

  const addImageFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Allow multiple files

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      setIsLoading(true);
      setStatus(`Loading ${files.length} files...`);

      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = async (event) => {
            await addImageToCanvas(event.target.result, i);
            resolve();
          };
          reader.readAsDataURL(files[i]);
        });
      }

      fabricCanvasRef.current.renderAll();
      setIsLoading(false);
      setStatus('✓ Files added!');
      setTimeout(() => setStatus(''), 2000);
    };

    input.click();
  }, []);

  // --- Other Tools ---

  const addText = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Type text here', {
      left: 100, top: 100,
      fontFamily: 'Heebo', fontSize: 48, fill: '#000000',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  }, []);

  const addVideo = useCallback(async () => {
    const url = prompt('Enter Video URL (YouTube, Drive, or direct):');
    if (!url) return;

    setIsLoading(true);
    setStatus('Preparing video...');

    try {
      const videoMetadata = createVideoMetadata(url);
      const thumbnailImg = await loadVideoThumbnail(videoMetadata);

      fabric.Image.fromURL(thumbnailImg.src, (img) => {
        // Simple scale logic for video
        const scale = Math.min(
          (PAGE_DIMENSIONS.width * 0.7) / img.width,
          (PAGE_DIMENSIONS.height * 0.7) / img.height
        );
        img.scale(scale);

        img.set({
          left: PAGE_DIMENSIONS.width / 2 - (img.width * img.scaleX) / 2,
          top: PAGE_DIMENSIONS.height / 2 - (img.height * img.scaleY) / 2,
          videoMetadata: videoMetadata,
          isVideo: true,
        });

        const playIcon = new fabric.Text('▶️', {
          fontSize: 80,
          left: img.left + (img.width * img.scaleX) / 2 - 40,
          top: img.top + (img.height * img.scaleY) / 2 - 40,
          selectable: false, evented: false,
        });

        const group = new fabric.Group([img, playIcon], {
          videoMetadata: videoMetadata, isVideo: true,
        });

        fabricCanvasRef.current.add(group);
        fabricCanvasRef.current.renderAll();
        setIsLoading(false);
      });
    } catch (error) {
      setIsLoading(false);
      setStatus('❌ Error adding video');
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      fabricCanvasRef.current.remove(activeObject);
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    setIsLoading(true);
    setStatus('Saving...');

    const fabricJSON = fabricCanvasRef.current.toJSON(['videoMetadata', 'isVideo']);
    const scaleMultiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png', quality: 1, multiplier: scaleMultiplier,
    });

    onSave({ texture: dataURL, fabricJSON: fabricJSON });
    setIsLoading(false);
    setStatus('✓ Saved!');
    setTimeout(() => { setStatus(''); onClose(); }, 1000);
  }, [onSave, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        else if (e.key === 'y') { e.preventDefault(); redo(); }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(8px) brightness(0.7)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-4 border-white/30" style={{ width: PAGE_DIMENSIONS.width + 80, maxHeight: '95vh', overflow: 'auto' }}>
          
          {/* Header */}
          <div className="px-6 py-3 flex justify-between items-center bg-gradient-to-r from-purple-600/90 to-blue-600/90 rounded-t-2xl">
            <h2 className="text-xl font-bold text-white">Page Editor</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-xl w-8 h-8 flex items-center justify-center">✕</button>
          </div>

          {/* Status Bar */}
          {status && (
            <div className="px-4 py-2 bg-blue-50/90 text-center text-sm font-medium text-blue-800 transition-all">
              {status}
            </div>
          )}

          {/* Toolbar */}
          <div className="px-3 py-2 flex flex-wrap gap-2 bg-white/50 border-b border-gray-100">
            <button onClick={addText} disabled={isLoading} className="toolbar-btn">
              <span>📝</span> Text
            </button>

            <button onClick={addImageFromFile} disabled={isLoading} className="toolbar-btn">
              <span>🖼️</span> Upload
            </button>

            <button onClick={() => setShowImportModal(true)} disabled={isLoading} className="toolbar-btn bg-purple-50 border-purple-200 text-purple-700">
              <span>🔗</span> Import URLs
            </button>

            <button onClick={addVideo} disabled={isLoading} className="toolbar-btn">
              <span>🎬</span> Video
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button onClick={undo} disabled={isLoading || historyStep <= 0} className="toolbar-btn" title="Undo">↶</button>
            <button onClick={redo} disabled={isLoading || historyStep >= history.length - 1} className="toolbar-btn" title="Redo">↷</button>

            {selectedObject && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <button onClick={deleteSelected} className="toolbar-btn text-red-600 bg-red-50 border-red-200 hover:bg-red-100">
                  <span>🗑️</span> Delete
                </button>
              </>
            )}
          </div>

          {/* Canvas Area */}
          <div className="p-4 flex justify-center bg-gray-100/50">
            <div className="bg-white shadow-2xl border-2 border-gray-200 rounded-lg overflow-hidden relative">
              <canvas ref={canvasRef} />
              <FrameOverlay />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-white/50 flex justify-between items-center rounded-b-2xl border-t border-gray-100">
            <div className="text-xs text-gray-500">
              💡 Drag to move • Corners to resize • Backspace to delete
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isLoading} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                {isLoading ? 'Saving...' : 'Save Page'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <BulkImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onImport={handleBulkImport} 
      />

      {/* Quick style for toolbar buttons */}
      <style>{`
        .toolbar-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .toolbar-btn:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
        .toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </>
  );
};
