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
    if (hasLoaded.current) return;
    if (currentBookId) return;
    if (!pages || pages.length > 2) return;

    hasLoaded.current = true;
    const scheduleBuild = () => {
      buildDefaultBookPages(watercolorPages).then((defaultPages) => {
        if (defaultPages?.length) {
          setBookPages(defaultPages);
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(scheduleBuild, { timeout: 3000 });
    } else {
      setTimeout(scheduleBuild, 0);
    }
  }, [pages, currentBookId, setBookPages]);

  return null;
};
