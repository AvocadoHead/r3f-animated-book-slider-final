import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { bookPagesAtom, currentBookIdAtom, setBookPagesAtom } from '../store/atoms';
import { watercolorPages } from '../data/watercolorSeries';
import { buildDefaultBookPages } from '../utils/defaultBook';

export const DefaultBookLoader = () => {
  const [pages] = useAtom(bookPagesAtom);
  const [currentBookId] = useAtom(currentBookIdAtom);
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only load once, and only if no book is already loaded
    if (hasLoaded.current) return;
    if (currentBookId) return; // User has a saved book
    if (pages && pages.length > 2) return; // Already has pages

    hasLoaded.current = true;

    console.log('Loading default book with random watercolor images...');

    buildDefaultBookPages(watercolorPages, { randomize: true, count: 16 }).then((defaultPages) => {
      if (defaultPages?.length) {
        console.log('Default book loaded:', defaultPages.length, 'pages');
        setBookPages(defaultPages);
      }
    }).catch((err) => {
      console.error('Error loading default book:', err);
    });
  }, [pages, currentBookId, setBookPages]);

  return null;
};
