import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PAGE_DIMENSIONS } from '../config/pageConfig';

// --- Helpers ---
export const generatePageId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createBlankTexture = () => {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_DIMENSIONS.actualWidth;
  canvas.height = PAGE_DIMENSIONS.actualHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f5'; // Light gray paper
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

// --- Initial Data ---
const initialPages = [
  {
    id: generatePageId(),
    pageNumber: 0,
    front: { texture: createBlankTexture(), type: 'cover' },
    back: { texture: createBlankTexture(), type: 'page' }
  },
  {
    id: generatePageId(),
    pageNumber: 1,
    front: { texture: createBlankTexture(), type: 'page' },
    back: { texture: createBlankTexture(), type: 'cover' }
  }
];

// --- Core State Atoms ---
export const bookPagesAtom = atom(initialPages);
export const currentPageAtom = atom(0);
export const editModeAtom = atom(false);
export const languageAtom = atomWithStorage('language', 'en');
export const clipboardAtom = atom(null);
export const currentBookIdAtom = atom(null); // Track database ID of current book

// NEW: Persistent Builder State (Keeps URLs when you reopen menu)
export const builderDataAtom = atomWithStorage('builder-state', {
  title: '',
  coverUrl: '',
  urls: '',
  itemsPerPage: 1,
  coverColor: '#000000',
  coverFontSize: '60',
  shouldReset: true
});

export const bookDataAtom = atom((get) => {
  const pages = get(bookPagesAtom);
  return pages.map(page => ({
    front: page.front.texture,
    back: page.back.texture,
  }));
});

// --- Actions ---

export const setBookPagesAtom = atom(
  null,
  (get, set, newPages) => {
    set(bookPagesAtom, newPages);
    set(currentPageAtom, 0);
  }
);

export const addPageAtom = atom(
  null,
  (get, set, position = 'end') => {
    const pages = get(bookPagesAtom);
    const blank = createBlankTexture();
    const newPage = {
      id: generatePageId(),
      pageNumber: pages.length,
      front: { texture: blank, fabricJSON: null, type: 'page' },
      back: { texture: blank, fabricJSON: null, type: 'page' }
    };

    if (position === 'end') {
      set(bookPagesAtom, [...pages, newPage]);
    } else {
      const newPages = [...pages];
      newPages.splice(position, 0, newPage);
      newPages.forEach((p, i) => p.pageNumber = i);
      set(bookPagesAtom, newPages);
    }
  }
);

export const removePageAtom = atom(
  null,
  (get, set, pageId) => {
    const pages = get(bookPagesAtom);
    const newPages = pages.filter(p => p.id !== pageId);
    newPages.forEach((p, i) => p.pageNumber = i);
    set(bookPagesAtom, newPages);
  }
);

export const updatePageAtom = atom(
  null,
  (get, set, { pageId, side, texture, fabricJSON }) => {
    const pages = get(bookPagesAtom);
    const newPages = pages.map(page => {
      if (page.id === pageId) {
        return {
          ...page,
          [side]: {
            ...page[side],
            ...(texture !== undefined && { texture }),
            ...(fabricJSON !== undefined && { fabricJSON }),
          }
        };
      }
      return page;
    });
    set(bookPagesAtom, newPages);
  }
);

export const bulkAddPagesAtom = atom(
  null,
  (get, set, newLeaves) => {
    const currentPages = get(bookPagesAtom);
    const newPageObjects = newLeaves.map((leaf, index) => ({
      id: generatePageId(),
      pageNumber: currentPages.length + index,
      front: {
        texture: leaf.front?.texture || createBlankTexture(),
        fabricJSON: leaf.front?.fabricJSON || null,
        type: 'page'
      },
      back: {
        texture: leaf.back?.texture || createBlankTexture(),
        fabricJSON: leaf.back?.fabricJSON || null,
        type: 'page'
      }
    }));
    set(bookPagesAtom, [...currentPages, ...newPageObjects]);
  }
);

export const resetBookAtom = atom(
  null,
  (get, set, { coverUrl } = {}) => {
    const coverTex = coverUrl || createBlankTexture();
    const blank = createBlankTexture();
    const frontCover = {
      id: generatePageId(),
      pageNumber: 0,
      front: { texture: coverTex, type: 'cover' },
      back: { texture: blank, type: 'page' }
    };
    const backCover = {
      id: generatePageId(),
      pageNumber: 1,
      front: { texture: blank, type: 'page' },
      back: { texture: coverTex, type: 'cover' }
    };
    set(bookPagesAtom, [frontCover, backCover]);
    set(currentPageAtom, 0);
    set(currentBookIdAtom, null);
  }
);

export const reorderPagesAtom = atom(
  null,
  (get, set, { sourceIndex, destinationIndex }) => {
    const pages = [...get(bookPagesAtom)];
    const [removed] = pages.splice(sourceIndex, 1);
    pages.splice(destinationIndex, 0, removed);
    // Update page numbers
    pages.forEach((p, i) => p.pageNumber = i);
    set(bookPagesAtom, pages);
  }
);

// Shared book viewing mode
export const viewingSharedBookAtom = atom(false);
export const sharedBookInfoAtom = atom(null); // { id, title, ownerName }

// Fullscreen media viewer
export const fullscreenMediaAtom = atom(null); // { type: 'video'|'image', url, embedUrl }

// Display settings (available to all users)
export const displaySettingsAtom = atomWithStorage('display-settings', {
  brightness: 1.0,    // 0.5 to 1.5 - light intensity
  envIntensity: 0.5,  // 0 to 1 - environment reflections (0 = matte, 1 = shiny)
  wobble: 0.2,        // 0 to 1 (0 = no wobble, 1 = full wobble)
});

// Fullscreen page viewer
export const fullscreenPageAtom = atom(null); // { texture, pageInfo }
