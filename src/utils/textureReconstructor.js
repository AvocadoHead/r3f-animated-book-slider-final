import * as fabric from 'fabric';
import { PAGE_DIMENSIONS } from '../config/pageConfig';
import { createBlankTexture } from '../store/atoms';

/**
 * Reconstruct a texture from fabricJSON
 * Used when loading shared books that only have fabricJSON saved
 */
export const reconstructTextureFromFabricJSON = async (fabricJSON, backgroundTexture = null) => {
  if (!fabricJSON || !fabricJSON.objects || fabricJSON.objects.length === 0) {
    return backgroundTexture || createBlankTexture();
  }

  return new Promise((resolve) => {
    // Create an off-screen canvas
    const canvasEl = document.createElement('canvas');
    canvasEl.width = PAGE_DIMENSIONS.width;
    canvasEl.height = PAGE_DIMENSIONS.height;

    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width: PAGE_DIMENSIONS.width,
      height: PAGE_DIMENSIONS.height,
      backgroundColor: '#ffffff'
    });

    // If there's a background texture, load it first
    const loadBackground = () => {
      if (backgroundTexture && !backgroundTexture.startsWith('data:')) {
        return new Promise((res) => {
          fabric.Image.fromURL(backgroundTexture, (img) => {
            if (img) {
              img.set({
                left: 0,
                top: 0,
                scaleX: PAGE_DIMENSIONS.width / img.width,
                scaleY: PAGE_DIMENSIONS.height / img.height,
                selectable: false
              });
              fabricCanvas.add(img);
              fabricCanvas.sendToBack(img);
            }
            res();
          }, { crossOrigin: 'anonymous' });
        });
      }
      return Promise.resolve();
    };

    loadBackground().then(() => {
      // Load the fabricJSON content
      fabricCanvas.loadFromJSON(fabricJSON, () => {
        fabricCanvas.renderAll();

        // Export to data URL at full resolution
        const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
        const dataUrl = fabricCanvas.toDataURL({
          format: 'png',
          multiplier: multiplier,
          quality: 0.9
        });

        fabricCanvas.dispose();
        resolve(dataUrl);
      }, (o, obj) => {
        // Handle image objects - set crossOrigin
        if (obj.type === 'image') {
          obj.set({ crossOrigin: 'anonymous' });
        }
      });
    });
  });
};

/**
 * Reconstruct all textures for a book's pages
 */
export const reconstructBookTextures = async (pages) => {
  const reconstructedPages = [];

  for (const page of pages) {
    const frontTexture = page.front?.texture ||
      await reconstructTextureFromFabricJSON(page.front?.fabricJSON);

    const backTexture = page.back?.texture ||
      await reconstructTextureFromFabricJSON(page.back?.fabricJSON);

    reconstructedPages.push({
      ...page,
      front: {
        ...page.front,
        texture: frontTexture
      },
      back: {
        ...page.back,
        texture: backTexture
      }
    });
  }

  return reconstructedPages;
};
