import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import * as fabric from 'fabric';
// FIX: Correct path for components folder
import { bulkAddPagesAtom, resetBookAtom } from '../store/atoms';

const PAGE_W = 800;
const PAGE_H = 1070;
const ACTUAL_W = 1325;

export const BookBuilderModal = ({ isOpen, onClose }) => {
  const [, bulkAddPages] = useAtom(bulkAddPagesAtom);
  const [, resetBook] = useAtom(resetBookAtom);
  
  const [coverTitle, setCoverTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const [shouldReset, setShouldReset] = useState(true);
  
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  // --- Helpers ---
  const processUrl = (url) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('drive.usercontent')) {
      const idMatch = cleanUrl.match(/[-\w]{25,}/);
      if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
    }
    return cleanUrl;
  };

  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const retry = new Image();
        retry.crossOrigin = 'anonymous';
        retry.onload = () => resolve(retry);
        retry.onerror = () => resolve(null);
        retry.src = proxyUrl;
      };
      img.src = processUrl(url);
    });
  };

  const generateLayout = async (images, fabricCanvas, title = null) => {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';

    const padding = 40;
    const safeW = PAGE_W - (padding * 2);
    const safeH = PAGE_H - (padding * 2);
    
    // Title Logic (Burned into texture for Cover)
    if (title) {
        const titleObj = new fabric.IText(title, {
            left: PAGE_W / 2,
            top: 200,
            originX: 'center',
            fontSize: 60,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#000000'
        });
        fabricCanvas.add(titleObj);
    }

    const gridConfig = {
      1: [{ x: 0, y: title ? 0.3 : 0, w: 1, h: title ? 0.7 : 1 }],
      2: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }],
      4: [{ x: 0,y:0,w:0.5,h:0.5 }, { x:0.5,y:0,w:0.5,h:0.5 }, { x:0,y:0.5,w:0.5,h:0.5 }, { x:0.5,y:0.5,w:0.5,h:0.5 }]
    };

    const slots = gridConfig[itemsPerPage] || gridConfig[1];

    images.forEach((imgObj, index) => {
      if (!imgObj || index >= slots.length) return;
      const slot = slots[index];
      const slotW = safeW * slot.w - 10;
      const slotH = safeH * slot.h - 10;
      const slotX = padding + (safeW * slot.x) + 5;
      const slotY = padding + (safeH * slot.y) + 5;

      const fImg = new fabric.Image(imgObj);
      const scale = Math.min(slotW / fImg.width, slotH / fImg.height);
      fImg.scale(scale);
      fImg.set({
        left: slotX + (slotW/2) - ((fImg.width * scale)/2),
        top: slotY + (slotH/2) - ((fImg.height * scale)/2)
      });
      fabricCanvas.add(fImg);
    });

    fabricCanvas.renderAll();
    const scaleMultiplier = ACTUAL_W / PAGE_W;
    return {
      texture: fabricCanvas.toDataURL({ format: 'png', quality: 0.9, multiplier: scaleMultiplier }),
      fabricJSON: fabricCanvas.toJSON(['videoMetadata', 'isVideo'])
    };
  };

  const handleBuild = async () => {
    setIsProcessing(true);
    setStatus('Initializing...');
    
    const fCanvas = new fabric.Canvas(canvasRef.current, { width: PAGE_W, height: PAGE_H });
    const urlList = urls.match(/(https?:\/\/[^\s]+)/g) || [];
    
    try {
      setStatus('Loading images...');
      const contentImages = [];
      for (let i = 0; i < urlList.length; i++) {
        const img = await loadImage(urlList[i]);
        if (img) contentImages.push(img);
      }

      setStatus('Generating layouts...');
      const contentLayouts = [];
      for (let i = 0; i < contentImages.length; i += itemsPerPage) {
        const batch = contentImages.slice(i, i + itemsPerPage);
        contentLayouts.push(await generateLayout(batch, fCanvas));
      }

      setStatus('Creating cover...');
      const coverImg = coverUrl ? await loadImage(coverUrl) : null;
      const coverData = await generateLayout(coverImg ? [coverImg] : [], fCanvas, coverTitle);
      
      if (shouldReset) {
        resetBook({ coverUrl: null }); 
      }

      // --- LOGIC FIX: LEFT/RIGHT ORDERING ---
      const newLeaves = [];

      // LEAF 0: Front Cover + Page 1 (Left)
      // Front: Cover (Right Side when closed, becomes Right when viewing cover)
      // Back: Inside Left (First page of content)
      newLeaves.push({
        front: coverData,         
        back: contentLayouts[0] || null 
      });

      // Remaining Layouts start from index 1
      // LEAF 1: Page 2 (Right) + Page 3 (Left)
      // LEAF 2: Page 4 (Right) + Page 5 (Left)
      let layoutIndex = 1;
      while (layoutIndex < contentLayouts.length) {
        const rightPageData = contentLayouts[layoutIndex]; 
        const leftPageData = contentLayouts[layoutIndex + 1]; 
        
        newLeaves.push({
          front: rightPageData || null, // Right Page
          back: leftPageData || null    // Left Page (Back of the Right page)
        });
        
        layoutIndex += 2;
      }

      bulkAddPages(newLeaves);
      
      setStatus('✅ Done!');
      setTimeout(() => { onClose(); setIsProcessing(false); setUrls(''); }, 1000);

    } catch (e) {
      console.error(e);
      setStatus('❌ Error');
      setIsProcessing(false);
    } finally {
      fCanvas.dispose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[700px] max-w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
          Book Wizard
        </h2>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-3">1. Cover Setup</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Book Title</label>
                <input type="text" className="w-full p-2 border rounded text-sm" value={coverTitle} onChange={e => setCoverTitle(e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cover Image URL</label>
                <input type="text" className="w-full p-2 border rounded text-sm" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">2. Add Pages</h3>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Image URLs (Bulk)</label>
            <div className="flex gap-2">
                {[1, 2, 4].map(n => (
                    <button key={n} onClick={() => setItemsPerPage(n)} className={`text-xs px-2 py-1 rounded border ${itemsPerPage === n ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>{n} per page</button>
                ))}
            </div>
          </div>
          <textarea
            className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
            placeholder="Paste list of image URLs here..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 mb-6">
            <input type="checkbox" id="reset" checked={shouldReset} onChange={e => setShouldReset(e.target.checked)} />
            <label htmlFor="reset" className="text-sm text-gray-700">Start a new book (Delete existing pages)</label>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm font-medium text-purple-600 animate-pulse">{status}</div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleBuild} disabled={isProcessing} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-medium">{isProcessing ? 'Generating...' : 'Create Book'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
