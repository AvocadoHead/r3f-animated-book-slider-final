import { useRef, useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { useAtom } from 'jotai';
import { clipboardAtom } from '../../store/atoms';
import { uploadFile } from '../../lib/supabase';
import { FrameOverlay } from './FrameOverlay';
import { createVideoMetadata, createVideoPlaceholder, isVideoUrl } from '../../utils/videoHelpers';
import { normalizeImageUrl } from '../../utils/imageHelpers';
import { PAGE_DIMENSIONS } from '../../config/pageConfig';
import { importGoogleDocToCanvas } from '../../services/googleDocsService';

const FONTS = ['Heebo', 'Rubik', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];

export const EditorCanvas = ({ initialData, onSave, onClose, pageInfo, onNavigate }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fontFamily, setFontFamily] = useState('Heebo');
  
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [videoPlayerUrl, setVideoPlayerUrl] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    loadContent(initialData);

    return () => { canvas.dispose(); };
  }, []);

  useEffect(() => {
    if (fabricCanvasRef.current) {
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.backgroundColor = 'transparent';
        loadContent(initialData);
    }
  }, [initialData]);

  const loadContent = (data) => {
    if (data?.fabricJSON && Object.keys(data.fabricJSON).length > 0) {
        setIsLoading(true);
        fabricCanvasRef.current.loadFromJSON(data.fabricJSON, () => {
            fabricCanvasRef.current.renderAll();
            setIsLoading(false);
            setHistory([]); 
            setHistoryStep(-1);
        }, (o, obj) => {
            if (obj.type === 'image') obj.set({ crossOrigin: 'anonymous' });
        });
    }
  };

  const saveHistory = () => {
      if(!fabricCanvasRef.current) return;
      const json = fabricCanvasRef.current.toJSON(['videoMetadata', 'isVideo']);
      setHistory(prev => {
          const newHist = prev.slice(0, historyStep + 1);
          newHist.push(json);
          return newHist;
      });
      setHistoryStep(prev => prev + 1);
  };

  const undo = () => {
      if (historyStep > 0) {
          const prevState = history[historyStep - 1];
          fabricCanvasRef.current.loadFromJSON(prevState, () => {
              fabricCanvasRef.current.renderAll();
              setHistoryStep(prev => prev - 1);
          });
      }
  };

  const handleSave = () => {
      if(!fabricCanvasRef.current) return;
      setIsLoading(true);
      setStatus('Saving...');

      const json = fabricCanvasRef.current.toJSON(['videoMetadata', 'isVideo']);
      
      try {
          if (initialData.texture) {
              fabric.Image.fromURL(initialData.texture, (bgImg) => {
                  if (!bgImg) { finishSave(json, null); return; }

                  bgImg.set({ 
                      left:0, top:0, 
                      scaleX: PAGE_DIMENSIONS.width/bgImg.width, 
                      scaleY: PAGE_DIMENSIONS.height/bgImg.height, 
                      selectable:false,
                      excludeFromExport: true 
                  });
                  
                  fabricCanvasRef.current.add(bgImg);
                  fabricCanvasRef.current.sendToBack(bgImg);
                  
                  const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
                  // Export to PNG
                  const dataUrl = fabricCanvasRef.current.toDataURL({ format:'png', multiplier, quality:0.9 });
                  
                  fabricCanvasRef.current.remove(bgImg);
                  finishSave(json, dataUrl);
              }, { crossOrigin: 'anonymous' });
          } else {
              const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
              const dataUrl = fabricCanvasRef.current.toDataURL({ format:'png', multiplier, quality:0.9 });
              finishSave(json, dataUrl);
          }
      } catch (err) {
          console.error(err);
          setIsLoading(false);
          setStatus("Error saving");
      }
  };

  const finishSave = (json, texture) => {
      // Pass both the JSON (for future edits) and Texture (for 3D display)
      onSave({ texture: texture || initialData.texture, fabricJSON: json });
      setIsLoading(false);
      setStatus('Saved!');
      setTimeout(() => { onClose(); }, 500); 
  };

  const addText = useCallback(() => {
    if(!fabricCanvasRef.current) return;
    const t = new fabric.IText('טקסט לדוגמה', { 
        left: 200, 
        top: 200, 
        fontSize: 40, 
        fontFamily: fontFamily,
        fill: '#000000',
        direction: 'rtl' // Better for Hebrew
    });
    fabricCanvasRef.current.add(t);
    fabricCanvasRef.current.setActiveObject(t);
    saveHistory();
  }, [fontFamily]);

  const addImageFromUrl = useCallback(() => {
     let url = prompt("Image URL (Direct link or Google Drive):");
     if(url) {
         url = normalizeImageUrl(url) || url;
         setIsLoading(true);
         fabric.Image.fromURL(url, (img)=>{
             setIsLoading(false);
             if(!img) { alert("Could not load image"); return; }

             // Scale down if too big
             if (img.width > 400) img.scaleToWidth(400);

             img.set({ left: 200, top: 200 });
             fabricCanvasRef.current.add(img);
             fabricCanvasRef.current.setActiveObject(img);
             saveHistory();
         }, {crossOrigin:'anonymous'});
     }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsLoading(true);
    setStatus('Uploading...');

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `page-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

      // Upload to Supabase storage
      const publicUrl = await uploadFile('book-assets', file, filename);

      // Add image to canvas
      fabric.Image.fromURL(publicUrl, (img) => {
        if (!img) {
          alert('Could not load uploaded image');
          setIsLoading(false);
          setStatus('');
          return;
        }

        // Scale down if too big
        if (img.width > 400) img.scaleToWidth(400);

        img.set({ left: 200, top: 200 });
        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.setActiveObject(img);
        saveHistory();
        setIsLoading(false);
        setStatus('Uploaded!');
        setTimeout(() => setStatus(''), 1500);
      }, { crossOrigin: 'anonymous' });
    } catch (err) {
      console.error('Upload failed:', err);
      setIsLoading(false);
      setStatus('Upload failed');
      setTimeout(() => setStatus(''), 2000);

      // Fallback: use local data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          if (img) {
            if (img.width > 400) img.scaleToWidth(400);
            img.set({ left: 200, top: 200 });
            fabricCanvasRef.current.add(img);
            fabricCanvasRef.current.setActiveObject(img);
            saveHistory();
          }
        });
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const addVideo = useCallback(() => {
    const url = prompt("Video URL (YouTube, Vimeo, or Google Drive):");
    if (!url) return;

    setIsLoading(true);
    setStatus('Processing video...');

    try {
      const videoMeta = createVideoMetadata(url);
      const placeholderDataUrl = createVideoPlaceholder(videoMeta);

      fabric.Image.fromURL(placeholderDataUrl, (img) => {
        if (!img) {
          alert('Could not create video placeholder');
          setIsLoading(false);
          setStatus('');
          return;
        }

        // Scale to fit nicely
        if (img.width > 350) img.scaleToWidth(350);

        // Store video metadata in the fabric object
        img.set({
          left: 200,
          top: 200,
          videoMetadata: videoMeta,
          isVideo: true,
        });

        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.setActiveObject(img);
        saveHistory();
        setIsLoading(false);
        setStatus(`${videoMeta.type} video added!`);
        setTimeout(() => setStatus(''), 1500);
      });
    } catch (err) {
      console.error('Video add failed:', err);
      setIsLoading(false);
      setStatus('Failed to add video');
      setTimeout(() => setStatus(''), 2000);
    }
  }, []);

  const handleCanvasClick = useCallback((e) => {
    const target = e.target;
    if (target && target.isVideo && target.videoMetadata) {
      // Open video player
      setVideoPlayerUrl(target.videoMetadata.embedUrl);
    }
  }, []);

  const importGoogleDocText = useCallback(async () => {
    const url = prompt(
      "Enter Google Doc URL:\n\n" +
      "The document must be shared as 'Anyone with the link can view'\n\n" +
      "Example: docs.google.com/document/d/abc123.../edit"
    );

    if (!url) return;

    setIsLoading(true);

    try {
      const result = await importGoogleDocToCanvas(
        fabric,
        fabricCanvasRef.current,
        url,
        {
          maxHeight: PAGE_DIMENSIONS.height - 100,
          onProgress: (msg) => setStatus(msg)
        }
      );

      saveHistory();
      setIsLoading(false);
      setStatus(`Imported "${result.title}" (${result.objectCount} elements)`);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error('Google Doc import failed:', err);
      setIsLoading(false);
      setStatus('Import failed');
      setTimeout(() => setStatus(''), 3000);
      alert(`Could not import document.\n\n${err.message}\n\nMake sure the document is shared as "Anyone with the link can view".`);
    }
  }, []);

  const copyObject = useCallback(async () => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active) { setClipboard(await active.clone()); setStatus('Copied'); setTimeout(()=>setStatus(''),1000); }
  }, [setClipboard]);

  const pasteObject = useCallback(async () => {
    if (!clipboard || !fabricCanvasRef.current) return;
    const cloned = await clipboard.clone();
    cloned.set({ left: cloned.left+20, top: cloned.top+20, evented:true });
    if(cloned.type==='activeSelection') { cloned.canvas=fabricCanvasRef.current; cloned.forEachObject(o=>fabricCanvasRef.current.add(o)); cloned.setCoords(); }
    else fabricCanvasRef.current.add(cloned);
    fabricCanvasRef.current.setActiveObject(cloned);
    fabricCanvasRef.current.requestRenderAll();
    saveHistory();
  }, [clipboard]);

  const deleteSelected = useCallback(() => {
      const active = fabricCanvasRef.current?.getActiveObject();
      if(active) { fabricCanvasRef.current.remove(active); saveHistory(); }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ width: PAGE_DIMENSIONS.width + 100, height: '95vh' }}>
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate(-1)} className="hover:bg-gray-700 px-3 py-1 rounded text-sm">← Prev Side</button>
            <div className="flex flex-col items-center">
                <h2 className="font-bold">Page Editor</h2>
                <span className="text-xs text-gray-400">{pageInfo}</span>
            </div>
            <button onClick={() => onNavigate(1)} className="hover:bg-gray-700 px-3 py-1 rounded text-sm">Next Side →</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-yellow-400">{status}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-red-600 rounded-full">✕</button>
          </div>
        </div>

        {/* Tools */}
        <div className="bg-gray-100 p-2 flex gap-2 border-b justify-center flex-wrap items-center">
           <select 
             value={fontFamily} 
             onChange={(e) => setFontFamily(e.target.value)}
             className="px-2 py-1 border rounded text-sm h-8 w-32"
           >
             {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
           </select>
           <button onClick={addText} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">📝 Text</button>
           <button onClick={importGoogleDocText} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm" title="Import text from Google Doc">📄 Doc</button>
           <div className="w-px bg-gray-300 mx-1 h-6"/>
           <button onClick={addImageFromUrl} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm" title="Add image from URL">🔗 URL</button>
           <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm" title="Upload image from device">📤 Upload</button>
           <button onClick={addVideo} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm" title="Add video (YouTube, Vimeo, Google Drive)">🎬 Video</button>
           <input
             ref={fileInputRef}
             type="file"
             accept="image/*"
             onChange={handleFileUpload}
             className="hidden"
           />
           <div className="w-px bg-gray-300 mx-1 h-6"/>
           <button onClick={copyObject} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">Copy</button>
           <button onClick={pasteObject} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">Paste</button>
           <div className="w-px bg-gray-300 mx-1 h-6"/>
           <button onClick={undo} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm" disabled={historyStep <= 0}>↶ Undo</button>
           <button onClick={deleteSelected} className="px-3 py-1 text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-sm">Del</button>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-600 overflow-auto flex justify-center p-8">
           <div className="relative shadow-2xl bg-white" 
                style={{ 
                    width: PAGE_DIMENSIONS.width, 
                    height: PAGE_DIMENSIONS.height,
                    backgroundImage: `url(${initialData?.texture})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
              <canvas ref={canvasRef} />
              <FrameOverlay width={PAGE_DIMENSIONS.width} height={PAGE_DIMENSIONS.height} />
           </div>
        </div>

        <div className="p-4 bg-white border-t flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">
                {isLoading ? 'Saving...' : 'Save & Close'}
            </button>
        </div>
      </div>

      {/* Video Player Modal */}
      {videoPlayerUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setVideoPlayerUrl(null)}
        >
          <div className="relative w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setVideoPlayerUrl(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕ Close
            </button>
            <iframe
              src={videoPlayerUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
