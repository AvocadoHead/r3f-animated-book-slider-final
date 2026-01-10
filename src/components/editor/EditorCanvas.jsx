import { useRef, useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { useAtom } from 'jotai';
import { clipboardAtom } from '../../store/atoms'; 
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
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    // Create Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Load Data
    const loadContent = () => {
        setIsLoading(true);
        console.log("Loading Editor Data:", initialData);

        // 1. Try JSON (Editable objects)
        if (initialData?.fabricJSON && Object.keys(initialData.fabricJSON).length > 0) {
            canvas.loadFromJSON(initialData.fabricJSON, () => {
                const objs = canvas.getObjects();
                // If JSON didn't result in visual objects, fallback to texture
                if (objs.length === 0 && initialData.texture) {
                    loadTextureBackground();
                } else {
                    canvas.renderAll();
                    setIsLoading(false);
                }
            }, (o, obj) => {
                if (obj.type === 'image') obj.set({ crossOrigin: 'anonymous' });
            });
        } 
        // 2. Fallback: Texture as Background Image
        else if (initialData?.texture) {
            loadTextureBackground();
        } else {
            setIsLoading(false);
        }
    };

    const loadTextureBackground = () => {
        if (!initialData.texture) { setIsLoading(false); return; }
        
        // Ensure it's not a 1x1 blank pixel
        if (initialData.texture.length < 5000 && initialData.texture.includes('base64')) {
            setIsLoading(false);
            return;
        }

        fabric.Image.fromURL(initialData.texture, (img) => {
            if (!img) { 
                console.error("Failed to load texture image");
                setIsLoading(false); 
                return; 
            }
            
            // Add as a locked background object
            img.scaleToWidth(PAGE_DIMENSIONS.width);
            img.set({ 
                left: 0, 
                top: 0, 
                selectable: false, 
                evented: false,
                opacity: 1,
                excludeFromExport: true // Don't export background twice
            });
            
            canvas.add(img);
            canvas.sendToBack(img);
            canvas.renderAll();
            setIsLoading(false);
        }, { crossOrigin: 'anonymous' });
    };

    loadContent();

    return () => { canvas.dispose(); };
  }, [initialData]);

  // ... (Tools: Copy, Paste, AddText, AddImage logic remains same)
  // ... (I omitted them here for brevity, but keep them in your file!)
  // Keep your existing tool functions here.
  
  const copyObject = useCallback(async () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
        const cloned = await active.clone();
        setClipboard(cloned);
        setStatus('📋 Copied');
        setTimeout(()=>setStatus(''), 1000);
    }
  }, [setClipboard]);

  const pasteObject = useCallback(async () => {
    if (!fabricCanvasRef.current || !clipboard) return;
    const cloned = await clipboard.clone();
    cloned.set({ left: cloned.left + 20, top: cloned.top + 20, evented: true });
    if (cloned.type === 'activeSelection') {
        cloned.canvas = fabricCanvasRef.current;
        cloned.forEachObject(o => fabricCanvasRef.current.add(o));
        cloned.setCoords();
    } else {
        fabricCanvasRef.current.add(cloned);
    }
    fabricCanvasRef.current.setActiveObject(cloned);
    fabricCanvasRef.current.requestRenderAll();
  }, [clipboard]);

  const addText = useCallback(() => {
    if(!fabricCanvasRef.current) return;
    const t = new fabric.IText('Text', { left: 100, top: 100, fontSize: 40 });
    fabricCanvasRef.current.add(t);
    fabricCanvasRef.current.setActiveObject(t);
  }, []);

  const addImageFromUrl = useCallback(() => {
     const url = prompt("Image URL");
     if(url) {
         fabric.Image.fromURL(url, (img)=>{
             img.scaleToWidth(300);
             fabricCanvasRef.current.add(img);
         }, {crossOrigin:'anonymous'});
     }
  }, []);

  const deleteSelected = useCallback(() => {
      const active = fabricCanvasRef.current?.getActiveObject();
      if(active) fabricCanvasRef.current.remove(active);
  }, []);

  const handleSave = () => {
      if(!fabricCanvasRef.current) return;
      setIsLoading(true);
      const json = fabricCanvasRef.current.toJSON(['videoMetadata']);
      const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
      
      // Temporarily hide background if needed, or include it
      // Here we include everything visible
      const dataUrl = fabricCanvasRef.current.toDataURL({ format:'png', multiplier, quality: 0.9 });
      
      onSave({ texture: dataUrl, fabricJSON: json });
      setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ width: PAGE_DIMENSIONS.width + 100, height: '95vh' }}>
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
          <div className="font-bold">Page Editor</div>
          <div className="text-sm text-yellow-400">{status}</div>
          <button onClick={onClose} className="text-xl hover:text-red-400">✕</button>
        </div>
        <div className="bg-gray-100 p-2 flex gap-2 border-b justify-center flex-wrap">
           <button onClick={addText} className="px-3 py-1 bg-white border rounded hover:bg-gray-50">📝 Text</button>
           <button onClick={addImageFromUrl} className="px-3 py-1 bg-white border rounded hover:bg-gray-50">🖼️ Image</button>
           <div className="w-px bg-gray-300 mx-1"/>
           <button onClick={copyObject} className="px-3 py-1 bg-white border rounded hover:bg-gray-50">📋 Copy</button>
           <button onClick={pasteObject} className="px-3 py-1 bg-white border rounded hover:bg-gray-50">📌 Paste</button>
           <div className="w-px bg-gray-300 mx-1"/>
           <button onClick={deleteSelected} className="px-3 py-1 text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100">🗑️ Delete</button>
        </div>
        <div className="flex-1 bg-gray-600 overflow-auto flex justify-center p-8">
           <div className="relative shadow-2xl bg-white">
              <canvas ref={canvasRef} />
              <FrameOverlay width={PAGE_DIMENSIONS.width} height={PAGE_DIMENSIONS.height} />
           </div>
        </div>
        <div className="p-4 bg-white border-t flex justify-between items-center">
            <div className="text-xs text-gray-500">Editing Side</div>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">{isLoading ? 'Saving...' : 'Save Page'}</button>
            </div>
        </div>
      </div>
    </div>
  );
};
