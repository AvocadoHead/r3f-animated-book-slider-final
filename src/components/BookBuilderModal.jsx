import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import * as fabric from 'fabric';
import { bulkAddPagesAtom, resetBookAtom } from '@/store/atoms';

const PAGE_W = 800;
const PAGE_H = 1070;
const ACTUAL_W = 1325;

export const BookBuilderModal = ({ isOpen, onClose }) => {
  const [, bulkAddPages] = useAtom(bulkAddPagesAtom);
  const [, resetBook] = useAtom(resetBookAtom);
  
  // Inputs
  const [coverTitle, setCoverTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const [shouldReset, setShouldReset] = useState(true); // Default to wiping old book
  
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
        console.warn('Failed to load, trying proxy...', url);
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const retry = new Image();
        retry.crossOrigin = 'anonymous';
        retry.onload = () => resolve(retry);
        retry.onerror = () => resolve(null); // Resolve null on fail, don't crash
        retry.src = proxyUrl;
      };
      img.src = processUrl(url);
    });
  };

  // --- Layout Engine (Same Grid Logic) ---
  const generateLayout = async (images, fabricCanvas, title = null) => {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';

    // Grid Config
    const padding = 40;
    const safeW = PAGE_W - (padding * 2);
    const safeH = PAGE_H - (padding * 2);
    
    // If it's a title page (Cover)
    if (title) {
        const titleObj = new fabric.IText(title, {
            left: PAGE_W / 2,
            top: 150,
            originX: 'center',
            fontSize: 60,
            fontFamily: 'Arial',
            fill: '#333'
        });
        fabricCanvas.add(titleObj);
    }

    const gridConfig = {
      1: [{ x: 0, y: title ? 0.2 : 0, w: 1, h: title ? 0.8 : 1 }],
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
      texture: fabricCanvas.toDataURL({ format: 'png', quality: 0.8, multiplier: scaleMultiplier }),
      fabricJSON: fabricCanvas.toJSON(['videoMetadata', 'isVideo'])
    };
  };

  // --- Build Process ---
  const handleBuild = async () => {
    setIsProcessing(true);
    setStatus('Initializing...');
    
    const fCanvas = new fabric.Canvas(canvasRef.current, { width: PAGE_W, height: PAGE_H });
    const urlList = urls.match(/(https?:\/\/[^\s]+)/g) || [];
    
    try {
      // 1. Reset Book if requested
      if (shouldReset) {
        resetBook({ coverUrl: null }); // Clear everything first
      }

      const generatedPages = [];
      
      // 2. Generate Cover (Page 0 Front)
      setStatus('Creating Cover...');
      const coverImg = coverUrl ? await loadImage(coverUrl) : null;
      const coverData = await generateLayout(coverImg ? [coverImg] : [], fCanvas, coverTitle);
      
      // 3. Process Content Images
      const contentImages = [];
      for (let i = 0; i < urlList.length; i++) {
        setStatus(`Loading image ${i + 1}/${urlList.length}...`);
        const img = await loadImage(urlList[i]);
        if (img) contentImages.push(img);
      }

      // 4. Batch images into pages (Front -> Back -> Front -> Back)
      // Note: We already have Page 0 Front (Cover).
      // We need to generate: Page 0 Back, Page 1 Front, Page 1 Back, etc.
      
      // First, create the layouts for the content
      const contentLayouts = [];
      for (let i = 0; i < contentImages.length; i += itemsPerPage) {
        const batch = contentImages.slice(i, i + itemsPerPage);
        const layout = await generateLayout(batch, fCanvas);
        contentLayouts.push(layout);
      }

      // 5. Construct the specific Page Objects
      // We need to merge these layouts into the Leaf structure { front, back }
      
      // Start with the Cover we just made
      let currentLeaf = {
        front: coverData, // Page 0 Front
        back: null        // Page 0 Back (Inside Left) - Waiting for content
      };

      // Distribute content layouts
      for (let i = 0; i < contentLayouts.length; i++) {
        if (!currentLeaf.back) {
          // Fill Inside Left (Page 0 Back, Page 1 Back, etc)
          currentLeaf.back = contentLayouts[i];
          
          // Leaf is full! Push it.
          generatedPages.push(currentLeaf);
          
          // Start new Leaf
          currentLeaf = { front: null, back: null };
        } else {
          // Fill Inside Right (Page 1 Front, etc)
          currentLeaf.front = contentLayouts[i];
        }
      }

      // Handle dangling leaf (if we ended on a Front page)
      if (currentLeaf.front || currentLeaf.back) {
         // If we have a front but no back (unlikely due to logic above, but possible if odd number)
         // OR if we started a new leaf and filled 'front' (Wait, logic above fills Back first for continuity)
         
         // Let's simplify:
         // The loop logic above fills Back then pushes.
         // If we have data in 'front' that hasn't been pushed:
         if (currentLeaf.front) {
             // We need a back for this front
             currentLeaf.back = await generateLayout([], fCanvas); // Blank back
             generatedPages.push(currentLeaf);
         }
         // If we have a 'back' filled but not pushed (wait, loop pushes immediately on back fill)
      }

      // Special Case: If we only had 1 image, it went to Cover.
      // If we had Cover + 1 image:
      // Cover -> Front. Image -> Back. Pushed. Done.

      // If we have content left over that didn't fit into a "Back" slot?
      // Actually, standard books read: Cover(Right) -> Turn -> Left/Right.
      // My logic above: 
      // 1. Set Cover (Right).
      // 2. Loop contents. 
      //    Layout 1 -> Back (Left). Push Leaf.
      //    Layout 2 -> Front (Right).
      //    Layout 3 -> Back (Left). Push Leaf.
      
      // If we end with a Front (Right) that isn't pushed:
      if (currentLeaf.front && !currentLeaf.back) {
         // This is a "dangling" right page. It needs a back to be a valid leaf?
         // No, in this array structure, we push leaves.
         // If currentLeaf = { front: data, back: null }, we haven't pushed it.
         generatedPages.push({
             front: currentLeaf.front,
             back: await generateLayout([], fCanvas) // Empty back
         });
      }

      // 6. Update Atom
      bulkAddPages(generatedPages); // This atom needs to accept {front, back} objects
      
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

        {/* Section 1: Cover */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-3">1. Cover Setup</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Book Title</label>
                <input 
                    type="text" 
                    className="w-full p-2 border rounded text-sm"
                    placeholder="My Portfolio"
                    value={coverTitle}
                    onChange={e => setCoverTitle(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cover Image URL</label>
                <input 
                    type="text" 
                    className="w-full p-2 border rounded text-sm"
                    placeholder="https://..."
                    value={coverUrl}
                    onChange={e => setCoverUrl(e.target.value)}
                />
            </div>
          </div>
        </div>

        {/* Section 2: Content */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">2. Add Pages</h3>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Image URLs (Bulk)</label>
            <div className="flex gap-2">
                {[1, 2, 4].map(n => (
                    <button 
                        key={n} 
                        onClick={() => setItemsPerPage(n)}
                        className={`text-xs px-2 py-1 rounded border ${itemsPerPage === n ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}
                    >
                        {n} per page
                    </button>
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

        {/* Section 3: Options */}
        <div className="flex items-center gap-2 mb-6">
            <input 
                type="checkbox" 
                id="reset" 
                checked={shouldReset} 
                onChange={e => setShouldReset(e.target.checked)} 
            />
            <label htmlFor="reset" className="text-sm text-gray-700">Start a new book (Delete existing pages)</label>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm font-medium text-purple-600 animate-pulse">{status}</div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button 
              onClick={handleBuild}
              disabled={isProcessing}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-medium"
            >
              {isProcessing ? 'Generating...' : 'Create Book'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
