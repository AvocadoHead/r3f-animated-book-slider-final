import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import * as fabric from 'fabric';
import { bulkAddPagesAtom } from '@/store/atoms';

const PAGE_W = 800;
const PAGE_H = 1070;
const ACTUAL_W = 1325;
// const ACTUAL_H = 1771; // Not used in calculation but good for reference

export const BookBuilderModal = ({ isOpen, onClose }) => {
  const [, bulkAddPages] = useAtom(bulkAddPagesAtom);
  const [urls, setUrls] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  // --- 1. Robust URL Processor ---
  const processUrl = (url) => {
    const cleanUrl = url.trim();
    
    // Check for Google Drive links
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('drive.usercontent')) {
      // Extract ID (matches standard 33 char IDs or longer)
      const idMatch = cleanUrl.match(/[-\w]{25,}/);
      if (idMatch) {
        // "lh3.googleusercontent.com" often allows CORS for public files
        return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
      }
    }
    return cleanUrl;
  };

  // --- 2. Image Loader with Fallback ---
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // CRITICAL for WebGL
      
      const processedUrl = processUrl(url);

      img.onload = () => resolve(img);
      
      img.onerror = () => {
        // If first attempt fails, try using a CORS proxy as a fallback
        if (!url.includes('corsproxy.io')) {
          console.log(`Direct load failed, trying proxy for: ${url}`);
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(processedUrl)}`;
          
          // Create a new image for the retry
          const retryImg = new Image();
          retryImg.crossOrigin = 'anonymous';
          retryImg.onload = () => resolve(retryImg);
          retryImg.onerror = () => reject(new Error('Failed to load image via proxy'));
          retryImg.src = proxyUrl;
        } else {
          reject(new Error(`Failed to load: ${url}`));
        }
      };

      img.src = processedUrl;
    });
  };

  // --- 3. Layout Engine ---
  const generatePage = async (images, fabricCanvas) => {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';

    const padding = 40;
    const safeW = PAGE_W - (padding * 2);
    const safeH = PAGE_H - (padding * 2);

    const gridConfig = {
      1: [{ x: 0, y: 0, w: 1, h: 1 }],
      2: [ 
        { x: 0, y: 0, w: 1, h: 0.5 },
        { x: 0, y: 0.5, w: 1, h: 0.5 }
      ],
      4: [ 
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ]
    };

    const slots = gridConfig[itemsPerPage] || gridConfig[1];

    images.forEach((imgObj, index) => {
      if (index >= slots.length) return;

      const slot = slots[index];
      
      const slotW = safeW * slot.w - (itemsPerPage > 1 ? 10 : 0);
      const slotH = safeH * slot.h - (itemsPerPage > 1 ? 10 : 0);
      const slotX = padding + (safeW * slot.x) + (itemsPerPage > 1 && slot.x > 0 ? 10 : 0);
      const slotY = padding + (safeH * slot.y) + (itemsPerPage > 1 && slot.y > 0 ? 10 : 0);

      // Create Fabric Image from the HTML Image Element
      const fImg = new fabric.Image(imgObj);
      
      // Scale calculation (contain)
      const scale = Math.min(slotW / fImg.width, slotH / fImg.height);
      fImg.scale(scale);

      fImg.set({
        left: slotX + (slotW / 2) - ((fImg.width * scale) / 2),
        top: slotY + (slotH / 2) - ((fImg.height * scale) / 2)
      });

      fabricCanvas.add(fImg);
    });

    // We render immediately to get data
    fabricCanvas.renderAll();

    const scaleMultiplier = ACTUAL_W / PAGE_W;
    
    return {
      texture: fabricCanvas.toDataURL({ format: 'png', quality: 0.8, multiplier: scaleMultiplier }),
      fabricJSON: fabricCanvas.toJSON(['videoMetadata', 'isVideo'])
    };
  };

  // --- 4. Main Handler ---
  const handleBuild = async () => {
    const urlList = urls.match(/(https?:\/\/[^\s]+)/g);
    if (!urlList || urlList.length === 0) {
      setStatus('❌ No valid URLs found');
      return;
    }

    setIsProcessing(true);
    setStatus('Initializing Layout Engine...');

    const fCanvas = new fabric.Canvas(canvasRef.current, {
      width: PAGE_W, height: PAGE_H,
      backgroundColor: '#fff' // Ensure white background
    });

    const newPages = [];
    let currentBatch = [];
    let processedCount = 0;

    try {
      for (let i = 0; i < urlList.length; i++) {
        setStatus(`Processing image ${i + 1}/${urlList.length}...`);
        
        try {
          const img = await loadImage(urlList[i]);
          currentBatch.push(img);
          processedCount++;
        } catch (err) {
          console.warn(`Skipping bad URL: ${urlList[i]}`);
        }

        // Check if batch is full or we are at the end
        if (currentBatch.length === itemsPerPage || (i === urlList.length - 1 && currentBatch.length > 0)) {
          const pageData = await generatePage(currentBatch, fCanvas);
          newPages.push(pageData);
          currentBatch = [];
        }
      }

      if (newPages.length > 0) {
        setStatus(`Finalizing ${newPages.length} pages...`);
        bulkAddPages(newPages);
        setStatus(`✅ Success! Added ${processedCount} images.`);
        setTimeout(() => {
          onClose();
          setUrls('');
          setStatus('');
          setIsProcessing(false);
        }, 1500);
      } else {
        setStatus('❌ No images could be loaded. Check permissions.');
        setIsProcessing(false);
      }

    } catch (error) {
      console.error(error);
      setStatus('❌ Critical Error');
      setIsProcessing(false);
    } finally {
      fCanvas.dispose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[600px] max-w-full max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            Book Builder
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

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
                <span className="font-medium">{num}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URLs (One per line)
          </label>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="https://drive.google.com/file/d/...&#10;https://example.com/image.jpg"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Note: Google Drive images must be "Anyone with link can view".
          </p>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm font-medium text-purple-600">
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
