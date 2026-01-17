import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { setBookPagesAtom, viewingSharedBookAtom, sharedBookInfoAtom, currentPageAtom } from '../store/atoms';
import { supabase } from '../lib/supabase';

export const SharedBookLoader = ({ bookId }) => {
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [, setViewingShared] = useAtom(viewingSharedBookAtom);
  const [, setSharedBookInfo] = useAtom(sharedBookInfoAtom);
  const [, setCurrentPage] = useAtom(currentPageAtom);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current || !bookId) return;
    hasLoaded.current = true;

    const loadSharedBook = async () => {
      console.log('Loading shared book:', bookId);

      const { data, error } = await supabase
        .from('books')
        .select('id, title, content, user_id')
        .eq('id', bookId)
        .single();

      if (error || !data) {
        console.error('Failed to load shared book:', error);
        // Redirect to home if book not found
        window.location.href = '/';
        return;
      }

      // Set the book content
      if (data.content && data.content.length > 0) {
        setBookPages(data.content);
        setCurrentPage(0);
      }

      // Mark as viewing shared
      setViewingShared(true);
      setSharedBookInfo({
        id: data.id,
        title: data.title || 'Shared Book',
        ownerId: data.user_id
      });

      console.log('Shared book loaded:', data.title);
    };

    loadSharedBook();

    // Cleanup when leaving
    return () => {
      setViewingShared(false);
      setSharedBookInfo(null);
    };
  }, [bookId, setBookPages, setViewingShared, setSharedBookInfo, setCurrentPage]);

  return null;
};
