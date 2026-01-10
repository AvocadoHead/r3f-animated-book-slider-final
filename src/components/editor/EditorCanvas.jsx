import { useRef, useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { useAtom } from 'jotai';
import { clipboardAtom } from '@/store/atoms'; // Import clipboard
import { createVideoMetadata, loadVideoThumbnail } from '@/utils/videoHelpers';
import { FrameOverlay } from './FrameOverlay';

const PAGE_DIMENSIONS = {
  width: 800,
  height: 1070,
  actualWidth: 1325,
  actualHeight: 1771,
};

export const EditorCanvas = ({ initialData, onSave, onClose }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [clipboard, setClipboard] = useAtom(clipboardAtom); // Use global clipboard
  
  const [selectedObject, setSelectedObject] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Fabric
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Load Data
    if (initialData?.fabricJSON) {
      setIsLoading(true);
      // CRITICAL FIX: The Reviver function ensures retrieved images have CORS allowed
      canvas.loadFromJSON(
        initialData.fabricJSON, 
        () => {
          canvas.renderAll();
          setIsLoading(false);
          saveHistory(); // Initial state
        },
        (o, object) => {
          // This runs for every object in the JSON
          if (object.type === 'image') {
            object.set({ crossOrigin: 'anonymous' });
          }
        }
      );
    } else {
      // If no JSON, maybe load the texture as a background?
      // For now, start blank white.
      saveHistory();
    }

    // Events
    canvas.on('selection:created', (e) => setSelectedObject(e.selected[0]));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected[0]));
    canvas.on('selection:cleared', () => setSelectedObject(null));
    canvas.on('object:added', () => saveHistory());
    canvas.on('object:modified', () => saveHistory());
    canvas.on('object:removed', () => saveHistory());

    return () => {
      canvas.dispose();
    };
  }, []); // Run once

  // --- History System ---
  const saveHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    // Don't save if loading
    if (isLoading) return;

    const json = fabricCanvasRef.current.toJSON(['videoMetadata', 'isVideo']);
    
    // Debounce or simple check to avoid duplicates could go here
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      return [...newHistory, json];
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep, isLoading]);

  const undo = useCallback(() => {
    if (historyStep > 0 && fabricCanvasRef.current) {
      const prevState = history[historyStep - 1];
      // Disable history saving during undo
      const originalSave = saveHistory; 
      // We rely on the event listeners, so we might trigger a save. 
      // Simplified: Just load.
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

  // --- Copy / Paste Logic ---
  const copyObject = useCallback(async () => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    
    if (activeObject) {
      // Clone it to get a clean object
      const cloned = await activeObject.clone();
      setClipboard(cloned);
      setStatus('📋 Copied!');
      setTimeout(() => setStatus(''), 1000);
    }
  }, [setClipboard]);

  const pasteObject = useCallback(async () => {
    if (!fabricCanvasRef.current || !clipboard) return;

    const clonedObj = await clipboard.clone();
    
    // Offset it slightly so user sees it
    clonedObj.set({
      left: clonedObj.left + 20,
      top: clonedObj.top + 20,
      evented: true,
    });

    if (clonedObj.type === 'activeSelection') {
      // Active selection needs special handling
      clonedObj.canvas = fabricCanvasRef.current;
      clonedObj.forEachObject((obj) => {
        fabricCanvasRef.current.add(obj);
      });
      clonedObj.setCoords();
    } else {
      fabricCanvasRef.current.add(clonedObj);
    }

    fabricCanvasRef.current.setActiveObject(clonedObj);
    fabricCanvasRef.current.requestRenderAll();
    setStatus('📋 Pasted!');
    setTimeout(() => setStatus(''), 1000);
  }, [clipboard]);

  // --- Tools ---
  const addText = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100, top: 100,
      fontFamily: 'Arial', fontSize: 32, fill: '#000000',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  }, []);

  const addImageFromUrl = useCallback(() => {
    const url = prompt('Image URL:');
    if (!url) return;
    
    // Basic Drive converter
    let finalUrl = url;
    if (url.includes('drive.google.com')) {
      const id = url.match(/[-\w]{25,}/);
      if (id) finalUrl = `https://lh3.googleusercontent.com/d/${id[0]}`;
    }

    fabric.Image.fromURL(finalUrl, (img) => {
      img.scaleToWidth(300);
      img.set({ left: 100, top: 100 });
      fabricCanvasRef.current.add(img);
      fabricCanvasRef.current.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
  }, []);

  const deleteSelected = useCallback(() => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active) {
      fabricCanvasRef.current.remove(active);
      fabricCanvasRef.current.requestRenderAll();
    }
  }, []);

  // --- Save ---
  const handleSave = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    setIsLoading(true);
    setStatus('Generating High-Res Texture...');

    // 1. Get JSON state (for future edits)
    const fabricJSON = fabricCanvasRef.current.toJSON(['videoMetadata', 'isVideo']);

    // 2. Export Image (Scaled Up)
    const scaleMultiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 0.9,
      multiplier: scaleMultiplier,
    });

    onSave({ texture: dataURL, fabricJSON });
    setIsLoading(false);
  }, [onSave]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copyObject(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteObject(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyObject, pasteObject, deleteSelected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-white/20 overflow-hidden flex flex-col" 
           style={{ width: PAGE_DIMENSIONS.width + 150, maxHeight: '95vh' }}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 flex justify-between items-center">
          <h2 className="font-bold text-lg">Page Editor</h2>
          <div className="flex gap-2">
             <div className="text-sm opacity-70 mr-4">{status}</div>
             <button onClick={onClose} className="hover:text-red-400 text-xl">✕</button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-100 p-2 border-b flex flex-wrap gap-2 items-center justify-center">
          <button onClick={addText} className="tool-btn">📝 Text</button>
          <button onClick={addImageFromUrl} className="tool-btn">🖼️ Image</button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={copyObject} className="tool-btn" title="Ctrl+C">📋 Copy</button>
          <button onClick={pasteObject} className="tool-btn" title="Ctrl+V">📌 Paste</button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={undo} className="tool-btn">↶</button>
          <button onClick={redo} className="tool-btn">↷</button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={deleteSelected} className="tool-btn text-red-600 hover:bg-red-50">🗑️ Delete</button>
        </div>

        {/* Canvas Wrapper */}
        <div className="flex-1 bg-gray-200 overflow-auto p-8 flex justify-center relative">
          <div className="shadow-2xl relative bg-white">
            <canvas ref={canvasRef} />
            <FrameOverlay width={PAGE_DIMENSIONS.width} height={PAGE_DIMENSIONS.height} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      <style>{`
        .tool-btn {
          padding: 6px 12px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          transition: all 0.1s;
        }
        .tool-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
        .tool-btn:active { transform: translateY(1px); }
      `}</style>
    </div>
  );
};
