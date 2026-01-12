import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
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

// ---- Atoms ----
export const bookPagesAtom = atom(initialPages);
export const currentPageAtom = atom(0);
export const editModeAtom = atom(false);
export const editingPageAtom = atom(null);
export const languageAtom = atomWithStorage('language', 'en');
export const clipboardAtom = atom(null);

// NEW: Track the Database ID of the currently open book
export const currentBookIdAtom = atom(null);

// NEW: Persistent Builder State (keeps URLs when you reopen menu)
export const builderDataAtom = atomWithStorage('builder-state', {
  title: '',
  coverUrl: '',
  coverFontSize: '60',
  coverColor: '#000000',
  urls: '',
  itemsPerPage: 1,
});


// Derived atom for setting book pages
export const setBookPagesAtom = atom(null, (get, set, pages) => {
export const bookDataAtom = atom((get) => {
  const pages = get(bookPagesAtom);
  return pages.map(page => ({
    front: page.front.texture,
    back: page.back.texture,
  }));
});});

// Derived atom for resetting book to initial pages
export const resetBookAtom = atom(null, (get, set) => {
    set(bookPagesAtom, initialPages);
    set(currentPageAtom, 0);
  });

// Derived atom for updating a single page
export const updatePageAtom = atom(null, (get, set, updatedPage) => {
    const pages = get(bookPagesAtom);
    const updatedPages = pages.map(page => page.id === updatedPage.id ? updatedPage : page);
    set(bookPagesAtom, updatedPages);
  });

// Derived atom for adding a new page
export const addPageAtom = atom(null, (get, set, newPage) => {
    const pages = get(bookPagesAtom);
    set(bookPagesAtom, [...pages, newPage]);
  });

// Derived atom for removing a page by id
export const removePageAtom = atom(null, (get, set, pageId) => {
    const pages = get(bookPagesAtom);
    set(bookPagesAtom, pages.filter(page => page.id !== pageId));
  });
