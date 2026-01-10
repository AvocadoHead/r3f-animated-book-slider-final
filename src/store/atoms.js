import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Generate unique ID for pages
export const generatePageId = () =>
  `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create blank white page texture
const createBlankTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1325;
  canvas.height = 1771;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

// Initial pages from the existing setup
const initialPages = [
  {
    id: generatePageId(),
    pageNumber: 0,
    front: {
      texture: '/textures/שאלות לי אליך cover.png',
      fabricJSON: null,
      type: 'cover',
    },
    back: {
      texture: '/textures/IzenBook/IzenBook001.png',
      fabricJSON: null,
      type: 'page',
    },
  },
  {
    id: generatePageId(),
    pageNumber: 1,
    front: {
      texture: '/textures/IzenBook/IzenBook002.png',
      fabricJSON: null,
      type: 'page',
    },
    back: {
      texture: '/textures/IzenBook/IzenBook003.png',
      fabricJSON: null,
      type: 'page',
    },
  },
  {
    id: generatePageId(),
    pageNumber: 2,
    front: {
      texture: '/textures/IzenBook/IzenBook004.png',
      fabricJSON: null,
      type: 'page',
    },
    back: {
      texture: '/textures/IzenBook/IzenBook005.png',
      fabricJSON: null,
      type: 'page',
    },
  },
  {
    id: generatePageId(),
    pageNumber: 3,
    front: {
      texture: '/textures/IzenBook/IzenBook006.png',
      fabricJSON: null,
      type: 'page',
    },
    back: {
      texture: '/textures/IzenBook/IzenBook007.png',
      fabricJSON: null,
      type: 'page',
    },
  },
  {
    id: generatePageId(),
    pageNumber: 4,
    front: {
      texture: '/textures/IzenBook/IzenBook008.png',
      fabricJSON: null,
      type: 'page',
    },
    back: {
      texture: '/textures/IzenBook/IzenBook009.png',
      fabricJSON: null,
      type: 'page',
    },
  },
  {
    id: generatePageId(),
    pageNumber: 5,
    front: {
      texture: '/textures/IzenBook/IzenBook10.png',
      fabricJSON: null,
      type: 'page',
    },
    back: {
      texture: '/textures/IzenBook/IzenBook011.png',
      fabricJSON: null,
      type: 'page',
    },
  },
  {
    id: generatePageId(),
    pageNumber: 6,
    front: {
      texture: '/textures/IzenBook/IzenBook011.png',
      fabricJSON: null,
      type: 'page',
    },
    back: {
      texture: '/textures/שאלה לי אליך back cover.png',
      fabricJSON: null,
      type: 'cover',
    },
  },
];

// Book pages - can be persisted to localStorage for session persistence
export const bookPagesAtom = atomWithStorage('book-pages', initialPages);

// Current page being viewed in the 3D book
export const currentPageAtom = atom(0);

// Edit mode toggle
export const editModeAtom = atom(false);

// Currently editing page (null or { pageId, side: 'front' | 'back' })
export const editingPageAtom = atom(null);

// Language toggle ('en' or 'he')
export const languageAtom = atomWithStorage('language', 'en');

// Derived atom: Get page for Book.jsx format
export const bookDataAtom = atom((get) => {
  const pages = get(bookPagesAtom);
  return pages.map((page) => ({
    front: page.front.texture,
    back: page.back.texture,
  }));
});

// --- NEW ATOM ACTION: Bulk Add Pages ---
export const bulkAddPagesAtom = atom(
  null,
  (get, set, newPagesData) => {
    const currentPages = get(bookPagesAtom);

    // Convert the raw data into the full page structure
    const newPageObjects = newPagesData.map((data, index) => ({
      id: generatePageId(),
      pageNumber: currentPages.length + index,
      front: {
        texture: data.texture,
        fabricJSON: data.fabricJSON,
        type: 'page',
      },
      back: {
        texture: createBlankTexture(), // Default white back
        fabricJSON: null,
        type: 'page',
      },
    }));

    set(bookPagesAtom, [...currentPages, ...newPageObjects]);
  },
);

// Page management actions
export const addPageAtom = atom(
  null,
  (get, set, position = 'end') => {
    const pages = get(bookPagesAtom);
    const blankTexture = createBlankTexture();
    const newPage = {
      id: generatePageId(),
      pageNumber: pages.length,
      front: {
        texture: blankTexture,
        fabricJSON: null,
        type: 'page',
      },
      back: {
        texture: blankTexture,
        fabricJSON: null,
        type: 'page',
      },
    };

    if (position === 'end') {
      set(bookPagesAtom, [...pages, newPage]);
    } else if (typeof position === 'number') {
      const newPages = [...pages];
      newPages.splice(position, 0, newPage);
      // Renumber pages
      newPages.forEach((page, index) => {
        page.pageNumber = index;
      });
      set(bookPagesAtom, newPages);
    }

    return newPage;
  },
);

export const removePageAtom = atom(
  null,
  (get, set, pageId) => {
    const pages = get(bookPagesAtom);
    const newPages = pages.filter((p) => p.id !== pageId);
    // Renumber pages
    newPages.forEach((page, index) => {
      page.pageNumber = index;
    });
    set(bookPagesAtom, newPages);
  },
);

export const updatePageAtom = atom(
  null,
  (get, set, { pageId, side, texture, fabricJSON }) => {
    const pages = get(bookPagesAtom);
    const newPages = pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          [side]: {
            ...page[side],
            ...(texture !== undefined && { texture }),
            ...(fabricJSON !== undefined && { fabricJSON }),
          },
        };
      }
      return page;
    });
    set(bookPagesAtom, newPages);
  },
);
