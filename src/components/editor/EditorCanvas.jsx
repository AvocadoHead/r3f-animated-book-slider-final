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

const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Impact'];

// Added 'onNavigate' prop
export const EditorCanvas = ({ initialData, onSave, onClose, pageInfo, onNavigate }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fontFamily, setFontFamily] = useState('Arial');
  
  // History state
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Init
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // History Listeners
    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    loadContent(initialData);

    return () => { canvas.dispose(); };
  }, []);

  // Update content when initialData changes (e.g. Navigation)
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
            // Reset history for new page
            setHistory([]); 
            setHistoryStep(-1);
        }, (o, obj) => {
            if (obj.type === 'image') obj.set({ crossOrigin: 'anonymous' });
        });
    }
  };

  const saveHistory = () => {
      if(!fabricCanvasRef.current) return;
      const json = fabricCanvasRef.current.toJSON(['videoMetadata']);
      setHistory(prev => [...prev.slice(0, historyStep + 1), json]);
      setHistoryStep(prev => prev + 1);
  };

  const undo = () => {
      if (historyStep > 0) {
          fabricCanvasRef.current.loadFromJSON(history[historyStep - 1], () => {
              fabricCanvasRef.current.renderAll();
              setHistoryStep(prev => prev - 1);
          });
      }
  };

  const handleSave = () => {
      if(!fabricCanvasRef.current) return;
      setIsLoading(true);
      setStatus('Saving...');
      
      const json = fabricCanvasRef.current.toJSON(['videoMetadata']);
      
      if (initialData.texture) {
          fabric.Image.fromURL(initialData.texture, (bgImg) => {
              bgImg.set({ left:0, top:0, scaleX: PAGE_DIMENSIONS.width/bgImg.width, scaleY: PAGE_DIMENSIONS.height/bgImg.height, selectable:false });
              fabricCanvasRef.current.add(bgImg);
              fabricCanvasRef.current.sendToBack(bgImg);
              
              const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
              const dataUrl = fabricCanvasRef.current.toDataURL({ format:'png', multiplier, quality:0.9 });
              
              fabricCanvasRef.current.remove(bgImg);
              onSave({ texture: dataUrl, fabricJSON: json });
              setIsLoading(false);
              setStatus('Saved!');
              setTimeout(() => {
                  onClose(); // CLOSE AFTER SAVE
              }, 500);
          }, { crossOrigin: 'anonymous' });
      }
  };

  const addText = useCallback(() => {
    const t = new fabric.IText('Type Here', { left: 100, top: 100, fontSize: 40, fontFamily: fontFamily });
    fabricCanvasRef.current.add(t);
    fabricCanvasRef.current.setActiveObject(t);
  }, [fontFamily]);

  // ... (Keep addImageFromUrl, copy, paste, delete same as before) ...
  const addImageFromUrl = useCallback(() => { const url = prompt("Image URL"); if(url) fabric.Image.fromURL(url, (img)=>{ img.scaleToWidth(300); fabricCanvasRef.current.add(img); }, {crossOrigin:'anonymous'}); }, []);
  const copyObject = useCallback(async () => { const active = fabricCanvasRef.current?.getActiveObject(); if (active) { setClipboard(await active.clone()); setStatus('Copied'); setTimeout(()=>setStatus(''),1000); } }, [setClipboard]);
  const pasteObject = useCallback(async () => { if (!clipboard) return; const cloned = await clipboard.clone(); cloned.set({ left: cloned.left+20, top: cloned.top+20, evented:true }); if(cloned.type==='activeSelection') { cloned.canvas=fabricCanvasRef.current; cloned.forEachObject(o=>fabricCanvasRef.current.add(o)); cloned.setCoords(); } else fabricCanvasRef.current.add(cloned); fabricCanvasRef.current.setActiveObject(cloned); fabricCanvasRef.current.requestRenderAll(); }, [clipboard]);
  const deleteSelected = useCallback(() => { const active = fabricCanvasRef.current?.getActiveObject(); if(active) fabricCanvasRef.current.remove(active); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ width: PAGE_DIMENSIONS.width + 100, height: '95vh' }}>
        
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate(-1)} className="hover:bg-gray-700 px-3 py-1 rounded">← Prev</button>
            <div className="flex flex-col items-center">
                <h2 className="font-bold">Page Editor</h2>
                <span className="text-xs text-gray-400">{pageInfo}</span>
            </div>
            <button onClick={() => onNavigate(1)} className="hover:bg-gray-700 px-3 py-1 rounded">Next →</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-yellow-400">{status}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-red-600 rounded-full">✕</button>
          </div>
        </div>

        <div className="bg-gray-100 p-2 flex gap-2 border-b justify-center flex-wrap items-center">
           <select 
             value={fontFamily} 
             onChange={(e) => setFontFamily(e.target.value)}
             className="px-2 py-1 border rounded text-sm h-8"
           >
             {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
           </select>
           <button onClick={addText} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">📝 Text</button>
           <div className="w-px bg-gray-300 mx-1 h-6"/>
           <button onClick={addImageFromUrl} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">🖼️ Img</button>
           <button onClick={copyObject} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">Copy</button>
           <button onClick={pasteObject} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">Paste</button>
           <div className="w-px bg-gray-300 mx-1 h-6"/>
           <button onClick={undo} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm">↶ Undo</button>
           <button onClick={deleteSelected} className="px-3 py-1 text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-sm">Del</button>
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
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Close</button>
            <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">{isLoading ? 'Saving...' : 'Save & Close'}</button>
        </div>
      </div>
    </div>
  );
};
