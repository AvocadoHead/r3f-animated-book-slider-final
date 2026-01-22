import * as fabric from 'fabric';
import { PAGE_DIMENSIONS } from '../config/pageConfig';
import { createBlankTexture } from '../store/atoms';

/**
 * Reconstruct a texture from fabricJSON
 * Used when loading shared books that only have fabricJSON saved
 */
export const reconstructTextureFromFabricJSON = async (fabricJSON, backgroundTexture = null) => {
  // Return blank texture if no valid fabricJSON
  if (!fabricJSON || !fabricJSON.objects || fabricJSON.objects.length === 0) {
    return backgroundTexture || createBlankTexture();
  }

  return new Promise((resolve) => {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn('Texture reconstruction timed out, using blank texture');
      resolve(createBlankTexture());
    }, 30000); // 30 second timeout per page

    try {
      // Create an off-screen canvas
      const canvasEl = document.createElement('canvas');
      canvasEl.width = PAGE_DIMENSIONS.width;
      canvasEl.height = PAGE_DIMENSIONS.height;

      const fabricCanvas = new fabric.Canvas(canvasEl, {
        width: PAGE_DIMENSIONS.width,
        height: PAGE_DIMENSIONS.height,
        backgroundColor: '#ffffff'
      });

      // Load the fabricJSON content
      fabricCanvas.loadFromJSON(fabricJSON, () => {
        try {
          fabricCanvas.renderAll();

          // Export to data URL at full resolution
          const multiplier = PAGE_DIMENSIONS.actualWidth / PAGE_DIMENSIONS.width;
          const dataUrl = fabricCanvas.toDataURL({
            format: 'png',
            multiplier: multiplier,
            quality: 0.9
          });

          clearTimeout(timeout);
          fabricCanvas.dispose();
          resolve(dataUrl);
        } catch (exportErr) {
          console.error('Failed to export canvas:', exportErr);
          clearTimeout(timeout);
          fabricCanvas.dispose();
          resolve(createBlankTexture());
        }
      }, (o, obj) => {
        // Handle image objects - set crossOrigin for CORS
        if (obj && obj.type === 'image') {
          obj.set({ crossOrigin: 'anonymous' });
        }
      }).catch((err) => {
        console.error('Failed to load fabricJSON:', err);
        clearTimeout(timeout);
        fabricCanvas.dispose();
        resolve(createBlankTexture());
      });
    } catch (err) {
      console.error('Failed to create canvas for reconstruction:', err);
      clearTimeout(timeout);
      resolve(createBlankTexture());
    }
  });
};

/**
 * Reconstruct all textures for a book's pages
 * @param {Array} pages - Array of page objects with fabricJSON
 * @param {Function} onProgress - Optional callback for progress updates (0-100)
 */
export const reconstructBookTextures = async (pages, onProgress = null) => {
  if (!Array.isArray(pages)) {
    console.error('reconstructBookTextures: pages is not an array', pages);
    return [];
  }

  const reconstructedPages = [];
  const totalSteps = pages.length * 2; // front + back for each page
  let currentStep = 0;

  const updateProgress = () => {
    currentStep++;
    if (onProgress) {
      onProgress(Math.round((currentStep / totalSteps) * 100));
    }
  };

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    try {
      // Check if texture already exists and is valid
      const isValidTexture = (tex) => tex && typeof tex === 'string' &&
        (tex.startsWith('data:') || tex.startsWith('http'));

      const hasFrontTexture = isValidTexture(page.front?.texture);
      const hasBackTexture = isValidTexture(page.back?.texture);

      // Check if fabricJSON has actual content worth reconstructing
      const hasFrontFabric = page.front?.fabricJSON?.objects?.length > 0;
      const hasBackFabric = page.back?.fabricJSON?.objects?.length > 0;

      // Reconstruct front texture: use existing texture, or reconstruct from fabricJSON, or blank
      let frontTexture;
      if (hasFrontTexture) {
        frontTexture = page.front.texture;
      } else if (hasFrontFabric) {
        frontTexture = await reconstructTextureFromFabricJSON(page.front.fabricJSON);
      } else {
        frontTexture = createBlankTexture();
      }
      updateProgress();

      // Reconstruct back texture: use existing texture, or reconstruct from fabricJSON, or blank
      let backTexture;
      if (hasBackTexture) {
        backTexture = page.back.texture;
      } else if (hasBackFabric) {
        backTexture = await reconstructTextureFromFabricJSON(page.back.fabricJSON);
      } else {
        backTexture = createBlankTexture();
      }
      updateProgress();

      reconstructedPages.push({
        ...page,
        id: page.id || `page-${i}`,
        pageNumber: page.pageNumber ?? i,
        front: {
          ...page.front,
          texture: frontTexture,
          type: page.front?.type || 'page'
        },
        back: {
          ...page.back,
          texture: backTexture,
          type: page.back?.type || 'page'
        }
      });
    } catch (err) {
      console.error(`Failed to reconstruct page ${i}:`, err);
      // Add page with blank textures on error
      reconstructedPages.push({
        ...page,
        id: page.id || `page-${i}`,
        pageNumber: page.pageNumber ?? i,
        front: {
          ...page.front,
          texture: createBlankTexture(),
          type: page.front?.type || 'page'
        },
        back: {
          ...page.back,
          texture: createBlankTexture(),
          type: page.back?.type || 'page'
        }
      });
      updateProgress();
      updateProgress();
    }
  }

  console.log(`Reconstructed ${reconstructedPages.length} pages`);
  return reconstructedPages;
};
