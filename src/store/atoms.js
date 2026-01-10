// src/store/atoms.js (Add this at the bottom)

export const resetBookAtom = atom(
  null,
  (get, set, { coverUrl, title } = {}) => {
    // 1. Create Front Cover
    const frontCover = {
      id: generatePageId(),
      pageNumber: 0,
      front: {
        texture: coverUrl || '/textures/book-cover-roughness.jpg', // Default or Custom
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

    // 3. Reset State
    set(bookPagesAtom, [frontCover, backCover]);
    set(currentPageAtom, 0);
  }
);
