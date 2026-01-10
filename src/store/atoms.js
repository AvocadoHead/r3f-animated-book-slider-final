import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// --- Helpers ---

export const generatePageId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createBlankTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1325;
  canvas.height = 1771;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

// --- Initial Data ---

const initialPages = [
  {
    id: generatePageId(),
    pageNumber: 0,
    front: {
      // CHANGED: Removed the specific Hebrew cover, used generic roughness map
      texture: '/textures/book-cover-roughness.jpg', 
      fabricJSON: null,
      type: 'cover'
    },
    back: {
      texture: '/textures/IzenBook/IzenBook001.png',
      fabricJSON: null,
      type: 'page'
    }
  },
  {
    id: generatePageId(),
    pageNumber: 1,
    front: {
      texture: '/textures/IzenBook/IzenBook002.png',
      fabricJSON: null,
      type: 'page'
    },
    back: {
      texture: '/textures/IzenBook/IzenBook003.png',
      fabricJSON: null,
      type: 'page'
    }
  },
  {
    id: generatePageId(),
    pageNumber: 2,
    front: {
      texture: '/textures/IzenBook/IzenBook004.png',
      fabricJSON: null,
      type: 'page'
    },
    back: {
      texture: '/textures/IzenBook/IzenBook005.png',
      fabricJSON: null,
      type: 'page'
    }
  }
];

// --- State Atoms ---

// CHANGED: standard 'atom' (In-Memory) to prevent QuotaExceededError
// This allows you to store hundreds of generated pages in the session.
export const bookPagesAtom = atom(initialPages);

// Current page being viewed (0-indexed)
export const currentPageAtom = atom(0);

// Edit mode toggle
export const editModeAtom = atom(false);

// Currently editing page
export const editingPageAtom = atom(null);

// Language toggle (Small string, so we can keep using storage for this)
export const languageAtom = atomWithStorage('language', 'en');

// Derived atom: Get simplified page data for the 3D Book component
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
      front: {
        texture: blankTexture,
        fabricJSON: null,
        type: 'page'
      },
      back: {
        texture: blankTexture,
        fabricJSON: null,
        type: 'page'
      }
    };

    if (position === 'end') {
      set(bookPagesAtom, [...pages, newPage]);
    } else if (typeof position === 'number') {
      const newPages = [...pages];
      newPages.splice(position, 0, newPage);
      newPages.forEach((page, index) => {
        page.pageNumber = index;
      });
      set(bookPagesAtom, newPages);
    }
  }
);

export const removePageAtom = atom(
  null,
  (get, set, pageId) => {
    const pages = get(bookPagesAtom);
    const newPages = pages.filter(p => p.id !== pageId);
    newPages.forEach((page, index) => {
      page.pageNumber = index;
    });
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
      back: {
        texture: createBlankTexture(),
        fabricJSON: null,
        type: 'page'
      }
    }));

    set(bookPagesAtom, [...currentPages, ...newPageObjects]);
  }
);

export const resetBookAtom = atom(
  null,
  (get, set, { coverUrl } = {}) => {
    // 1. Create Front Cover
    const frontCover = {
      id: generatePageId(),
      pageNumber: 0,
      front: {
        texture: coverUrl || '/textures/book-cover-roughness.jpg',
        type: 'cover'
      },
      back: {
        texture: createBlankTexture(),
        type: 'page'
      }
    };

    // 2. Create Back Cover
    const backCover = {
      id: generatePageId(),
      pageNumber: 1,
      front: {
        texture: createBlankTexture(),
        type: 'page'
      },
      back: {
        texture: coverUrl || '/textures/book-cover-roughness.jpg',
        type: 'cover'
      }
    };

    set(bookPagesAtom, [frontCover, backCover]);
    set(currentPageAtom, 0);
  }
);
