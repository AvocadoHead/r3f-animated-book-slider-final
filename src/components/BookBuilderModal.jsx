import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import * as fabric from 'fabric';
// FIX: Path adjusted for src/components/BookBuilderModal.jsx
import { setBookPagesAtom, generatePageId, createBlankTexture, builderDataAtom } from '../store/atoms';
import { normalizeImageUrl } from '../utils/imageHelpers';
import { watercolorPages } from '../../data/watercolorSeries';

const PAGE_W = 800;
const PAGE_H = 1070;
const ACTUAL_W = 1325;

export const BookBuilderModal = ({ isOpen, onClose }) => {
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [builderData, setBuilderData] = useAtom(builderDataAtom);
  
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const updateData = (field, value) => {
    setBuilderData(prev => ({ ...prev, [field]: value }));
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
      img.src = normalizeImageUrl(url) || url;
    });
  };

  const generateLayout = async (images, fabricCanvas, titleConfig = null, forceGrid = null) => {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';

    const padding = 40;
    const safeW = PAGE_W - (padding * 2);
    const safeH = PAGE_H - (padding * 2);
    
    if (titleConfig && titleConfig.text) {
        const titleObj = new fabric.IText(titleConfig.text, {
            left: PAGE_W / 2,
            top: 200,
            originX: 'center',
            fontSize: Number(titleConfig.size),
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: titleConfig.color
        });
        fabricCanvas.add(titleObj);
    }

    const currentGrid = forceGrid || builderData.itemsPerPage;

    const gridConfig = {
      1: [{ x: 0, y: titleConfig ? 0.3 : 0, w: 1, h: titleConfig ? 0.7 : 1 }],
      2: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }],
      4: [{ x: 0,y:0,w:0.5,h:0.5 }, { x:0.5,y:0,w:0.5,h:0.5 }, { x:0,y:0.5,w:0.5,h:0.5 }, { x:0.5,y:0.5,w:0.5,h:0.5 }]
    };

    const slots = gridConfig[currentGrid] || gridConfig[1];

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
    const urlList = builderData.urls
      .split(/[\s,]+/)
      .map((entry) => normalizeImageUrl(entry))
      .filter(Boolean);
    
    try {
      setStatus('Loading images...');
      const contentImages = [];
      for (let i = 0; i < urlList.length; i++) {
        const img = await loadImage(urlList[i]);
        if (img) contentImages.push(img);
      }

      setStatus('Generating layouts...');
      const contentLayouts = [];
      for (let i = 0; i < contentImages.length; i += builderData.itemsPerPage) {
        const batch = contentImages.slice(i, i + builderData.itemsPerPage);
        contentLayouts.push(await generateLayout(batch, fCanvas));
      }

      setStatus('Creating cover...');
      const coverImg = builderData.coverUrl ? await loadImage(builderData.coverUrl) : null;
      
      const coverData = await generateLayout(
          coverImg ? [coverImg] : [], 
          fCanvas, 
          { text: builderData.title, size: builderData.coverFontSize, color: builderData.coverColor },
          1 
      );
      
      const backCoverData = await generateLayout([], fCanvas, { text: "The End", size: 40, color: '#999' }, 1);

      const newLeaves = [];

      newLeaves.push({
        front: coverData,         
        back: contentLayouts[0] || null 
      });

      let layoutIndex = 1;
      while (layoutIndex < contentLayouts.length) {
        const rightPageData = contentLayouts[layoutIndex]; 
        const leftPageData = contentLayouts[layoutIndex + 1]; 
        
        newLeaves.push({
          front: rightPageData || null,
          back: leftPageData || null
        });
        
        layoutIndex += 2;
      }

      newLeaves.push({
          front: { texture: createBlankTexture(), fabricJSON: null }, 
          back: backCoverData 
      });

      const finalPages = newLeaves.map((leaf, i) => ({
          id: generatePageId(),
          pageNumber: i,
          front: { 
            texture: leaf.front?.texture || createBlankTexture(), 
            fabricJSON: leaf.front?.fabricJSON || null,
            type: i === 0 ? 'cover' : 'page'
          },
          back: { 
            texture: leaf.back?.texture || createBlankTexture(), 
            fabricJSON: leaf.back?.fabricJSON || null,
            type: i === newLeaves.length - 1 ? 'cover' : 'page' 
          }
      }));

      setBookPages(finalPages);
      setStatus('✅ Done!');
      setTimeout(() => { onClose(); setIsProcessing(false); }, 1000);

    } catch (e) {
      console.error(e);
      setStatus('❌ Error');
      setIsProcessing(false);
    } finally {
      fCanvas.dispose();
    }
  };

  const handleLoadWatercolor = () => {
    const watercolorUrls = watercolorPages.join('\n');
    setBuilderData(prev => ({
      ...prev,
      urls: watercolorUrls,
      itemsPerPage: 4,
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[700px] max-w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
          Book Wizard
        </h2>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-3">1. Cover Setup</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Book Title</label>
                <input type="text" className="w-full p-2 border rounded text-sm" value={builderData.title} onChange={e => updateData('title', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cover Image URL</label>
                <input type="text" className="w-full p-2 border rounded text-sm" value={builderData.coverUrl} onChange={e => updateData('coverUrl', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Title Size</label>
                <select className="w-full p-2 border rounded text-sm" value={builderData.coverFontSize} onChange={e => updateData('coverFontSize', e.target.value)}>
                    <option value="40">Small (40)</option>
                    <option value="60">Medium (60)</option>
                    <option value="80">Large (80)</option>
                    <option value="120">Huge (120)</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Title Color</label>
                <div className="flex gap-2">
                    {['#000000', '#ffffff', '#dc2626', '#2563eb'].map(c => (
                        <button 
                            key={c}
                            onClick={() => updateData('coverColor', c)}
                            className={`w-8 h-8 rounded-full border-2 ${builderData.coverColor === c ? 'border-purple-600' : 'border-gray-200'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
             </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">2. Add Pages</h3>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Image URLs (Bulk)</label>
            <div className="flex gap-2">
                {[1, 2, 4].map(n => (
                    <button key={n} onClick={() => updateData('itemsPerPage', n)} className={`text-xs px-2 py-1 rounded border ${builderData.itemsPerPage === n ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>{n} per page</button>
                ))}
                <button
                  onClick={handleLoadWatercolor}
                  className="text-xs px-2 py-1 rounded border bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Load watercolor set
                </button>
            </div>
          </div>
          <textarea
            className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
            placeholder="Paste list of image URLs here..."
            value={builderData.urls}
            onChange={(e) => updateData('urls', e.target.value)}
          />
        </div>

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
