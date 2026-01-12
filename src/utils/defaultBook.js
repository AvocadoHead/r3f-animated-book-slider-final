import { createBlankTexture, generatePageId } from '../store/atoms';
import { getPreviewImageUrl, getProxiedImageUrl, normalizeImageUrl } from './imageHelpers';

const PAGE_W = 800;
const PAGE_H = 1070;
const ACTUAL_W = 1325;

const loadImage = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const resolvedUrl = normalizeImageUrl(url) || url;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(resolvedUrl)}`;
      const retry = new Image();
      retry.crossOrigin = 'anonymous';
      retry.onload = () => resolve(retry);
      retry.onerror = () => resolve(null);
      retry.src = proxyUrl;
    };
    const resolvedUrl = normalizeImageUrl(url) || url;
    const previewUrl = getPreviewImageUrl(resolvedUrl, 800);
    const finalUrl = previewUrl || getProxiedImageUrl(resolvedUrl) || resolvedUrl;
    img.src = finalUrl;
  });

const selectDefaultUrls = (urls, count = 42) => {
  if (!urls?.length) return [];
  const pool = [...urls];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};

const loadImagesInBatches = async (urls, batchSize = 6) => {
  const images = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const loaded = await Promise.all(batch.map(loadImage));
    images.push(...loaded);
  }
  return images;
};

const renderLayout = (images, slots) => {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = 40;
  const safeW = PAGE_W - padding * 2;
  const safeH = PAGE_H - padding * 2;

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
  output.width = ACTUAL_W;
  output.height = Math.round((ACTUAL_W / PAGE_W) * PAGE_H);
  const outCtx = output.getContext('2d');
  outCtx.drawImage(canvas, 0, 0, output.width, output.height);

  return output.toDataURL('image/png');
};

const createGridSlots = (count) => {
  if (count === 1) {
    return [{ x: 0, y: 0, w: 1, h: 1 }];
  }
  if (count === 2) {
    return [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 }
    ];
  }
  return [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
  ];
};

const chunkArray = (input, size) => {
  const chunks = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
};

export const buildDefaultBookPages = async (urls) => {
  if (typeof document === 'undefined') return null;
  if (!urls?.length) return null;

  const sampledUrls = selectDefaultUrls(urls, 42);
  const normalizedUrls = sampledUrls.map(normalizeImageUrl).filter(Boolean);
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

  const contentImages = await loadImagesInBatches(contentUrls, 6);
  const contentChunks = chunkArray(contentImages.filter(Boolean), 4);
  const contentLayouts = contentChunks.map((chunk) => ({
    texture: renderLayout(chunk, createGridSlots(chunk.length)),
    fabricJSON: null
  }));

  const blankLayout = { texture: createBlankTexture(), fabricJSON: null };
  const leaves = [];
  leaves.push({
    front: { texture: coverTexture, fabricJSON: null },
    back: contentLayouts[0] || blankLayout
  });

  let layoutIndex = 1;
  while (layoutIndex < contentLayouts.length) {
    leaves.push({
      front: contentLayouts[layoutIndex] || blankLayout,
      back: contentLayouts[layoutIndex + 1] || blankLayout
    });
    layoutIndex += 2;
  }

  leaves.push({
    front: blankLayout,
    back: { texture: backTexture, fabricJSON: null }
  });

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
