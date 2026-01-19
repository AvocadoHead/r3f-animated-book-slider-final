import { createBlankTexture, generatePageId } from '../store/atoms';
import { normalizeImageUrl } from './imageHelpers';
import { PAGE_DIMENSIONS, GRID_LAYOUTS } from '../config/pageConfig';

const loadImage = (url) =>
  new Promise((resolve) => {
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

const renderLayout = (images, slots) => {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_DIMENSIONS.width;
  canvas.height = PAGE_DIMENSIONS.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = PAGE_DIMENSIONS.padding;
  const safeW = PAGE_DIMENSIONS.width - padding * 2;
  const safeH = PAGE_DIMENSIONS.height - padding * 2;

  images.forEach((img, index) => {
    if (!img || index >= slots.length) return;
    const slot = slots[index];
    const slotW = safeW * slot.w - 10;
    const slotH = safeH * slot.h - 10;
    const slotX = padding + safeW * slot.x + 5;
    const slotY = padding + safeH * slot.y + 5;

    const scale = Math.min(slotW / img.width, slotH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, slotX + (slotW - drawW) / 2, slotY + (slotH - drawH) / 2, drawW, drawH);
  });

  const output = document.createElement('canvas');
  output.width = PAGE_DIMENSIONS.actualWidth;
  output.height = PAGE_DIMENSIONS.actualHeight;
  const outCtx = output.getContext('2d');
  outCtx.drawImage(canvas, 0, 0, output.width, output.height);

  return output.toDataURL('image/png');
};

const createGridSlots = (count) => {
  if (count <= 1) return GRID_LAYOUTS[1];
  if (count <= 2) return GRID_LAYOUTS[2];
  return GRID_LAYOUTS[4];
};

const chunkArray = (input, size) => {
  const chunks = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
};

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get random subset of URLs for the default book
export const getRandomWatercolors = (urls, count = 16) => {
  const shuffled = shuffleArray(urls);
  return shuffled.slice(0, Math.min(count, urls.length));
};

export const buildDefaultBookPages = async (urls, { randomize = false, count = 16 } = {}) => {
  if (typeof document === 'undefined') return null;
  if (!urls?.length) return null;

  // Optionally randomize and limit the URLs
  const selectedUrls = randomize ? getRandomWatercolors(urls, count) : urls;

  const normalizedUrls = selectedUrls.map(normalizeImageUrl).filter(Boolean);
  if (normalizedUrls.length < 2) return null;

  const coverUrl = normalizedUrls[0];
  const backUrl = normalizedUrls[normalizedUrls.length - 1];
  const contentUrls = normalizedUrls.slice(1, -1);

  const [coverImg, backImg] = await Promise.all([loadImage(coverUrl), loadImage(backUrl)]);
  const coverTexture = coverImg
    ? renderLayout([coverImg], createGridSlots(1))
    : createBlankTexture();
  const backTexture = backImg
    ? renderLayout([backImg], createGridSlots(1))
    : createBlankTexture();

  const contentImages = await Promise.all(contentUrls.map(loadImage));
  const validContentImages = contentImages.filter(Boolean);
  const contentChunks = chunkArray(validContentImages, 4);
  const contentLayouts = contentChunks.map((chunk) => ({
    texture: renderLayout(chunk, createGridSlots(chunk.length)),
    fabricJSON: null
  }));

  const blankLayout = { texture: createBlankTexture(), fabricJSON: null };
  const leaves = [];

  // Build all page sides in order: cover-front, content pages..., back-cover
  // Each leaf has a front and back side
  const allSides = [
    { texture: coverTexture, fabricJSON: null }, // Cover (front of first leaf)
    ...contentLayouts,                            // Content pages
    { texture: backTexture, fabricJSON: null }    // Back cover (back of last leaf)
  ];

  // Pair sides into leaves (2 sides per leaf)
  for (let i = 0; i < allSides.length; i += 2) {
    leaves.push({
      front: allSides[i] || blankLayout,
      back: allSides[i + 1] || blankLayout
    });
  }

  // If odd number of sides, back cover is already included
  // If the last leaf only has a front (odd count), add blank back
  // This shouldn't happen with our structure but handle it gracefully

  return leaves.map((leaf, index) => ({
    id: generatePageId(),
    pageNumber: index,
    front: {
      texture: leaf.front?.texture || createBlankTexture(),
      fabricJSON: leaf.front?.fabricJSON || null,
      type: index === 0 ? 'cover' : 'page'
    },
    back: {
      texture: leaf.back?.texture || createBlankTexture(),
      fabricJSON: leaf.back?.fabricJSON || null,
      type: index === leaves.length - 1 ? 'cover' : 'page'
    }
  }));
};
