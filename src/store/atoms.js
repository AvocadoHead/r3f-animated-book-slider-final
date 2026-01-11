import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { watercolorPages } from '../data/watercolorSeries.js';
// --- Helpers ---
export const generatePageId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createBlankTexture = () => {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1325;
  canvas.height = 1771;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f5'; // Light gray paper
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

// Convert watercolor URLs to page format
const watercolorPagesFormatted = watercolorPages.flatMap((urlGroup, groupIndex) => {
  const pageNumber = groupIndex * 2;
  return [
    {
      id: generatePageId(),
      pageNumber: pageNumber,
      front: { texture: urlGroup[0], type: pageNumber === 0 ? 'cover' : 'page' },
      back: { texture: urlGroup[1], type: 'page' }
    },
    {
      id: generatePageId(),
      pageNumber: pageNumber + 1,
      front: { texture: urlGroup[2], type: 'page' },
      back: { texture: urlGroup[3], type: groupIndex === watercolorPages.length - 1 ? 'cover' : 'page' }
    }
  ];
});

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

// --- Atoms ---
export const bookPagesAtom = atom(watercolorPagesFormatted);export const currentPageAtom = atom(0);
export const editModeAtom = atom(false);
export const editingPageAtom = atom(null);
export const languageAtom = atomWithStorage('language', 'en');
export const clipboardAtom = atom(null);

// NEW: Track the Database ID of the currently open book
export const currentBookIdAtom = atom(null);

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
        set(currentBookIdAtom, null); // <--- Start as a "New, Unsaved" book
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
  }
);
