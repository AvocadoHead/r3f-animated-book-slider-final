import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import * as fabric from 'fabric';
import { bulkAddPagesAtom } from '../store/atoms';

// Dimensions must match your EditorCanvas
const PAGE_W = 800;
const PAGE_H = 1070;
const ACTUAL_W = 1325;
const ACTUAL_H = 1771;

export const BookBuilderModal = ({ isOpen, onClose }) => {
  const [, bulkAddPages] = useAtom(bulkAddPagesAtom);
  const [urls, setUrls] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(1); // 1, 2, or 4
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hidden canvas for generating textures/JSON
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  // --- 1. Helper: Process Drive Links ---
  const processUrl = (url) => {
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com')) {
      const fileId = cleanUrl.match(/\/d\/([^\/]+)/);
      return fileId ? `https://drive.google.com/uc?export=view&id=${fileId[1]}` : cleanUrl;
    }
    return cleanUrl;
  };

  // --- 2. Helper: Load Image Helper ---
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));
      img.src = processUrl(url);
    });
  };

  // --- 3. The Layout Engine ---
  const generatePage = async (images, fabricCanvas) => {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';

    const padding = 40;
    const safeW = PAGE_W - (padding * 2);
    const safeH = PAGE_H - (padding * 2);

    // Grid Configuration based on itemsPerPage
    const gridConfig = {
      1: [{ x: 0, y: 0, w: 1, h: 1 }],
      2: [ // Top and Bottom
        { x: 0, y: 0, w: 1, h: 0.5 },
        { x: 0, y: 0.5, w: 1, h: 0.5 }
      ],
      4: [ // 2x2 Grid
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ]
    };

    const slots = gridConfig[itemsPerPage] || gridConfig[1];

    // Place images into slots
    images.forEach((imgObj, index) => {
      if (index >= slots.length) return;

      const slot = slots[index];
      
      // Calculate specific slot dimensions
      const slotW = safeW * slot.w - (itemsPerPage > 1 ? 10 : 0); // gap spacing
      const slotH = safeH * slot.h - (itemsPerPage > 1 ? 10 : 0);
      const slotX = padding + (safeW * slot.x) + (itemsPerPage > 1 && slot.x > 0 ? 10 : 0);
      const slotY = padding + (safeH * slot.y) + (itemsPerPage > 1 && slot.y > 0 ? 10 : 0);

      // Create Fabric Image
      const fImg = new fabric.Image(imgObj);
      
      // Scale to fit slot (contain)
      const scale = Math.min(slotW / fImg.width, slotH / fImg.height);
      fImg.scale(scale);

      // Center in slot
      fImg.set({
        left: slotX + (slotW / 2) - ((fImg.width * scale) / 2),
        top: slotY + (slotH / 2) - ((fImg.height * scale) / 2)
      });

      fabricCanvas.add(fImg);
    });

    // Generate output
    const scaleMultiplier = ACTUAL_W / PAGE_W; // Scale up for high-res texture
    
    return {
      texture: fabricCanvas.toDataURL({ format: 'png', multiplier: scaleMultiplier }),
      fabricJSON: fabricCanvas.toJSON(['videoMetadata', 'isVideo'])
    };
  };

  // --- 4. Main Build Process ---
  const handleBuild = async () => {
    const urlList = urls.match(/(https?:\/\/[^\s]+)/g);
    if (!urlList || urlList.length === 0) {
      setStatus('❌ No valid URLs found');
      return;
    }

    setIsProcessing(true);
    setStatus('Initializing Layout Engine...');

    // Init hidden canvas
    const fCanvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_W, height: PAGE_H
    });

    const newPages = [];
    let currentBatch = [];

    try {
      // 1. Load all images first (or in chunks)
      for (let i = 0; i < urlList.length; i++) {
        setStatus(`Loading image ${i + 1}/${urlList.length}...`);
        try {
          const img = await loadImage(urlList[i]);
          currentBatch.push(img);

          // If batch is full or this is the last item
          if (currentBatch.length === itemsPerPage || i === urlList.length - 1) {
            setStatus(`Generating Page ${newPages.length + 1}...`);
            const pageData = await generatePage(currentBatch, fCanvas);
            newPages.push(pageData);
            currentBatch = []; // Reset batch
          }
        } catch (err) {
          console.error(`Skipping bad URL: ${urlList[i]}`);
        }
      }

      // 2. Update Atom
      setStatus('Finalizing Book...');
      bulkAddPages(newPages);
      
      setStatus('✅ Done!');
      setTimeout(() => {
        onClose();
        setUrls('');
        setStatus('');
        setIsProcessing(false);
      }, 1000);

    } catch (error) {
      console.error(error);
      setStatus('❌ Error building book');
      setIsProcessing(false);
    } finally {
      fCanvas.dispose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[600px] max-w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            Book Builder
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Layout Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos per Page</label>
          <div className="flex gap-4">
            {[1, 2, 4].map(num => (
              <button
                key={num}
                onClick={() => setItemsPerPage(num)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  itemsPerPage === num 
                    ? 'border-purple-600 bg-purple-50 text-purple-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-10 bg-white border border-gray-300 grid gap-0.5 p-0.5 ${
                  num === 1 ? 'grid-cols-1' : num === 2 ? 'grid-rows-2' : 'grid-cols-2 grid-rows-2'
                }`}>
                  {[...Array(num)].map((_, i) => (
                    <div key={i} className="bg-gray-200 w-full h-full"></div>
                  ))}
                </div>
                <span className="font-medium">{num} per page</span>
              </button>
            ))}
          </div>
        </div>

        {/* URL Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URLs (One per line)
          </label>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="https://..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Supports direct image links and Google Drive links.
          </p>
        </div>

        {/* Hidden Canvas for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Footer / Status */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm font-medium text-purple-600 animate-pulse">
            {status}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleBuild}
              disabled={isProcessing || !urls.trim()}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all font-medium"
            >
              {isProcessing ? 'Building...' : 'Build Pages'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
