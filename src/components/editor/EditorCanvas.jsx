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

export const EditorCanvas = ({ initialData, onSave, onClose, pageInfo }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    canvas.on('object:added', () => setIsDirty(true));
    canvas.on('object:modified', () => setIsDirty(true));
    canvas.on('object:removed', () => setIsDirty(true));

    if (initialData?.fabricJSON && Object.keys(initialData.fabricJSON).length > 0) {
        setIsLoading(true);
        canvas.loadFromJSON(initialData.fabricJSON, () => {
            canvas.renderAll();
            setIsLoading(false);
        }, (o, obj) => {
            if (obj.type === 'image') obj.set({ crossOrigin: 'anonymous' });
        });
    }

    return () => { canvas.dispose(); };
  }, [initialData]);

  const handleClose = () => {
    if (isDirty) {
      if (confirm('Unsaved changes. Close anyway?')) onClose();
    } else {
      onClose();
    }
  };

  const handleSave = () => {
      if(!fabricCanvasRef.current) return;
      setIsLoading(true);
      const json = fabricCanvasRef.current.toJSON(['videoMetadata']);
      
      if (initialData.texture) {
          fabric.Image.fromURL(initialData.texture, (bgImg) => {
              bgImg.set({ 
                  left: 0, top: 0, 
                  scaleX: PAGE_DIMENSIONS.width / bgImg.width,
                  scaleY: PAGE_DIMENSIONS.height / bgImg.height,
                  selectable: false 
              });
              
              fabricCanvasRef.current.add(bgImg);
              fabricCanvasRef.current.sendToBack(bgImg);
              
              const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
              const dataUrl = fabricCanvasRef.current.toDataURL({ format:'png', multiplier, quality: 0.9 });
              
              fabricCanvasRef.current.remove(bgImg);
              
              onSave({ texture: dataUrl, fabricJSON: json });
              setIsLoading(false);
              setIsDirty(false);
              onClose();
          }, { crossOrigin: 'anonymous' });
      } else {
          const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
          const dataUrl = fabricCanvasRef.current.toDataURL({ format:'png', multiplier, quality: 0.9 });
          onSave({ texture: dataUrl, fabricJSON: json });
          setIsLoading(false);
          setIsDirty(false);
          onClose();
      }
  };

  const copyObject = useCallback(async () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
        setClipboard(await active.clone());
        setStatus('Copied');
        setTimeout(()=>setStatus(''),1000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ width: PAGE_DIMENSIONS.width + 100, height: '95vh' }}>
        
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg">Page Editor</h2>
            {pageInfo && <span className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">{pageInfo}</span>}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-yellow-400">{status}</span>
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-red-600 rounded-full transition-colors">✕</button>
          </div>
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
            <button onClick={handleClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">{isLoading ? 'Saving...' : 'Save & Close'}</button>
        </div>
      </div>
    </div>
  );
};
