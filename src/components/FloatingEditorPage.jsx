import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import * as fabric from 'fabric';

export const FloatingEditorPage = ({ onClose, onSave, position = [0, 0, 3] }) => {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);
  const { controls } = useThree();
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (controls) {
      controls.enabled = false;
    }
    return () => {
      if (controls) {
        controls.enabled = true;
      }
    };
  }, [controls]);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 662,
      height: 1024,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = fabricCanvas;

    const tex = new THREE.CanvasTexture(canvasRef.current);
    tex.needsUpdate = true;
    setTexture(tex);

    fabricCanvas.on('after:render', () => {
      if (tex) {
        tex.needsUpdate = true;
      }
    });

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    setStatus('Adding text...');
    
    const text = new fabric.IText('הקלד טקסט כאן', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 40,
      fill: '#000000',
    });
    
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
    setStatus('Text added! Click to edit.');
  };

  const addImage = () => {
    const url = prompt('הדבק קישור לתמונה (Google Drive, Imgur, או כל URL ציבורי):');
    if (!url) return;

    setStatus('Loading image...');
    let imageUrl = url;

    // Convert Google Drive sharing link to direct link
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([^\/]+)/);
      if (fileId) {
        imageUrl = `https://drive.google.com/uc?export=view&id=${fileId[1]}`;
      }
    }

    // Create image element with CORS
    const imgElement = document.createElement('img');
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      try {
        const fabricImg = new fabric.Image(imgElement, {
          left: 100,
          top: 100,
          scaleX: 300 / imgElement.width,
          scaleY: 300 / imgElement.width,
        });
        
        fabricCanvasRef.current.add(fabricImg);
        fabricCanvasRef.current.renderAll();
        setStatus('Image added successfully!');
        setTimeout(() => setStatus(''), 2000);
      } catch (error) {
        setStatus('Error: Could not add image. Try a different URL.');
        console.error('Image add error:', error);
      }
    };

    imgElement.onerror = () => {
      setStatus('Error: Could not load image. Make sure the URL is public and allows embedding.');
      setTimeout(() => setStatus(''), 3000);
    };

    imgElement.src = imageUrl;
  };

  const addVideo = () => {
    const url = prompt('הדבק קישור לוידאו (Google Drive או YouTube):');
    if (!url) return;

    setStatus('Adding video placeholder...');

    // For now, add a text placeholder for video
    // Full video embedding in Fabric requires more complex setup
    const videoPlaceholder = new fabric.Rect({
      left: 100,
      top: 100,
      width: 300,
      height: 200,
      fill: '#000000',
      stroke: '#ffffff',
      strokeWidth: 3,
    });

    const videoText = new fabric.Text('VIDEO\n' + url.substring(0, 30) + '...', {
      left: 120,
      top: 150,
      fontSize: 16,
      fill: '#ffffff',
      textAlign: 'center',
    });

    const group = new fabric.Group([videoPlaceholder, videoText], {
      left: 100,
      top: 100,
    });

    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.renderAll();
    setStatus('Video placeholder added. Note: Videos are saved as screenshots.');
  };

  const uploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setStatus('Loading file...');
      const reader = new FileReader();
      
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          img.scaleToWidth(300);
          img.set({ left: 100, top: 100 });
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.renderAll();
          setStatus('File uploaded successfully!');
          setTimeout(() => setStatus(''), 2000);
        });
      };
      
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const handleClear = () => {
    if (!fabricCanvasRef.current) return;
    if (!confirm('האם למחוק את כל התוכן?')) return;
    
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = '#ffffff';
    fabricCanvasRef.current.renderAll();
    setStatus('Cleared!');
    setTimeout(() => setStatus(''), 1000);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    setStatus('Saving...');
    
    const dataURL = canvasRef.current.toDataURL('image/png', 1.0);
    onSave(dataURL);
    setStatus('Saved!');
  };

  const handleCancel = () => {
    if (fabricCanvasRef.current && fabricCanvasRef.current.getObjects().length > 0) {
      if (!confirm('האם לבטל? כל השינויים יאבדו.')) return;
    }
    onClose();
  };

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2.5, 3.8]} />
        <meshPhysicalMaterial
          map={texture}
          transparent
          opacity={0.95}
          roughness={0.1}
          metalness={0}
          clearcoat={0.5}
          clearcoatRoughness={0.1}
        />
      </mesh>

      <Html 
        position={[0, 0, 0.01]} 
        center
        transform
        style={{ pointerEvents: 'auto' }}
      >
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '20px',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          {status && (
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              marginBottom: '10px',
              textAlign: 'center',
              fontSize: '14px',
            }}>
              {status}
            </div>
          )}
          <canvas ref={canvasRef} style={{
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }} />
        </div>
      </Html>

      <Html position={[0, 2.2, 0.01]} center>
        <div className="flex gap-2 bg-white/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg flex-wrap justify-center">
          <button
            onClick={addText}
            className="px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition text-sm font-medium"
          >
            📝 טקסט
          </button>
          <button
            onClick={addImage}
            className="px-3 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition text-sm font-medium"
          >
            🖼️ תמונה
          </button>
          <button
            onClick={uploadImage}
            className="px-3 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition text-sm font-medium"
          >
            📁 העלה
          </button>
          <button
            onClick={addVideo}
            className="px-3 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition text-sm font-medium"
          >
            🎬 וידאו
          </button>
        </div>
      </Html>

      <Html position={[0, -2.2, 0.01]} center>
        <div className="flex gap-3">
          <button
            onClick={handleClear}
            className="w-12 h-12 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 transition-all hover:scale-110 flex items-center justify-center text-xl"
            title="נקה הכל"
          >
            🗑️
          </button>
          <button
            onClick={handleCancel}
            className="w-12 h-12 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110 flex items-center justify-center text-xl"
            title="ביטול"
          >
            ❌
          </button>
          <button
            onClick={handleSave}
            className="w-12 h-12 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-110 flex items-center justify-center text-xl"
            title="שמור"
          >
            ✅
          </button>
        </div>
      </Html>
    </group>
  );
};
