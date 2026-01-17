import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

export const PageEditor = ({ onClose, onPageCreated }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [pageType, setPageType] = useState('page'); // 'page' or 'cover'

  useEffect(() => {
    // Initialize Fabric canvas
    const width = pageType === 'cover' ? 1920 : 1325;
    const height = pageType === 'cover' ? 2560 : 2048;
    
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
    });
    
    fabricCanvasRef.current = canvas;
    
    return () => {
      canvas.dispose();
    };
  }, [pageType]);

  const addText = () => {
    const text = new fabric.IText('הקלד טקסט כאן', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 60,
      fill: '#000000',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const addImageFromUrl = () => {
    const url = prompt('הדבק קישור לתמונה (Google Drive, או כל URL):');
    if (!url) return;
    
    // Convert Google Drive link if needed
    let imageUrl = url;
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([^\/]+)/);
      if (fileId) {
        imageUrl = `https://drive.google.com/uc?export=view&id=${fileId[1]}`;
      }
    }
    
    fabric.Image.fromURL(imageUrl, (img) => {
      img.scaleToWidth(400);
      img.set({ left: 100, top: 100 });
      fabricCanvasRef.current.add(img);
    }, { crossOrigin: 'anonymous' });
  };

  const uploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          fabric.Image.fromURL(event.target.result, (img) => {
            img.scaleToWidth(400);
            img.set({ left: 100, top: 100 });
            fabricCanvasRef.current.add(img);
          });
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const deleteSelected = () => {
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      fabricCanvasRef.current.remove(activeObject);
    }
  };

  const exportPage = () => {
    const canvas = fabricCanvasRef.current;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    
    onPageCreated({
      type: pageType,
      image: dataURL,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <h2 className="text-3xl font-bold">עורך עמודים</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        {/* Page Type Selector */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-4 items-center">
            <label className="font-medium text-gray-700">סוג עמוד:</label>
            <select 
              value={pageType} 
              onChange={(e) => setPageType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="page">עמוד רגיל (1325x2048)</option>
              <option value="cover">עמוד שער (1920x2560)</option>
            </select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex gap-3 bg-gray-50">
          <button 
            onClick={addText}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">📝</span>
            <span>הוסף טקסט</span>
          </button>
          <button 
            onClick={uploadImage}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">🖼️</span>
            <span>העלה תמונה</span>
          </button>
          <button 
            onClick={addImageFromUrl}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">🔗</span>
            <span>תמונה מקישור</span>
          </button>
          <div className="h-8 w-px bg-gray-300" />
          <button 
            onClick={deleteSelected}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <span className="text-xl">🗑️</span>
            <span>מחק</span>
          </button>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div className="flex justify-center">
            <div className="bg-white shadow-lg" style={{ display: 'inline-block' }}>
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>💡 טיפ: לחץ על אלמנט כדי לערוך, גרור כדי להזיז</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button 
              onClick={exportPage}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              צור עמוד והוסף לספר
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
