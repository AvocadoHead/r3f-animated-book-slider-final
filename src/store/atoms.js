import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// --- Helpers ---
export const generatePageId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createBlankTexture = () => {
  if (typeof document === 'undefined') return ''; // Safety for SSR
  const canvas = document.createElement('canvas');
  canvas.width = 1325;
  canvas.height = 1771;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f5'; // Light gray for default paper
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

// --- Atoms ---

// 1. Clipboard for moving items between pages
export const clipboardAtom = atom(null); 

// 2. Initial Pages (Clean Slate - No Sensei)
const initialPages = [
  {
    id: generatePageId(),
    pageNumber: 0,
    front: {
      texture: createBlankTexture(), // CLEAN COVER
      fabricJSON: null,
      type: 'cover'
    },
    back: {
      texture: createBlankTexture(),
      fabricJSON: null,
      type: 'page'
    }
  },
  {
    id: generatePageId(),
    pageNumber: 1,
    front: {
      texture: createBlankTexture(),
      fabricJSON: null,
      type: 'page'
    },
    back: {
      texture: createBlankTexture(),
      fabricJSON: null,
      type: 'cover'
    }
  }
];

export const bookPagesAtom = atom(initialPages);
export const currentPageAtom = atom(0);
export const editModeAtom = atom(false);
export const editingPageAtom = atom(null);
export const languageAtom = atomWithStorage('language', 'en');

export const bookDataAtom = atom((get) => {
  const pages = get(bookPagesAtom);
  return pages.map(page => ({
    front: page.front.texture,
    back: page.back.texture,
  }));
});

// --- Actions ---

export const addPageAtom = atom(
  null,
  (get, set, position = 'end') => {
    const pages = get(bookPagesAtom);
    const blankTexture = createBlankTexture();
    const newPage = {
      id: generatePageId(),
      pageNumber: pages.length,
      front: { texture: blankTexture, fabricJSON: null, type: 'page' },
      back: { texture: blankTexture, fabricJSON: null, type: 'page' }
    };

    if (position === 'end') {
      set(bookPagesAtom, [...pages, newPage]);
    } else if (typeof position === 'number') {
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
  (get, set, newPagesData) => {
    const currentPages = get(bookPagesAtom);
    const newPageObjects = newPagesData.map((data, index) => ({
      id: generatePageId(),
      pageNumber: currentPages.length + index,
      front: {
        texture: data.texture,
        fabricJSON: data.fabricJSON,
        type: 'page'
      },
      back: { texture: createBlankTexture(), fabricJSON: null, type: 'page' }
    }));
    set(bookPagesAtom, [...currentPages, ...newPageObjects]);
  }
);

export const resetBookAtom = atom(
  null,
  (get, set, { coverUrl } = {}) => {
    const coverTex = coverUrl || createBlankTexture();
    const frontCover = {
      id: generatePageId(),
      pageNumber: 0,
      front: { texture: coverTex, type: 'cover' },
      back: { texture: createBlankTexture(), type: 'page' }
    };
    const backCover = {
      id: generatePageId(),
      pageNumber: 1,
      front: { texture: createBlankTexture(), type: 'page' },
      back: { texture: coverTex, type: 'cover' }
    };
    set(bookPagesAtom, [frontCover, backCover]);
    set(currentPageAtom, 0);
  }
);
