import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// --- Helpers ---
export const generatePageId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createBlankTexture = () => {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1325;
  canvas.height = 1771;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
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

// --- Atoms ---
export const bookPagesAtom = atom(initialPages);
export const currentPageAtom = atom(0);
export const editModeAtom = atom(false);
export const editingPageAtom = atom(null);
export const languageAtom = atomWithStorage('language', 'en');
export const clipboardAtom = atom(null);

// NEW: Persistent Builder State (Keeps URLs when you reopen menu)
export const builderDataAtom = atomWithStorage('builder-state', {
  title: '',
  coverUrl: '',
  urls: '',
  itemsPerPage: 1,
  coverColor: '#000000',
  coverFontSize: '60'
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
