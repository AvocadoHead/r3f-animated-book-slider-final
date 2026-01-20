import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { setBookPagesAtom, viewingSharedBookAtom, sharedBookInfoAtom, currentPageAtom } from '../store/atoms';
import { supabase } from '../lib/supabase';
import { reconstructBookTextures } from '../utils/textureReconstructor';

export const SharedBookLoader = ({ bookId }) => {
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [, setViewingShared] = useAtom(viewingSharedBookAtom);
  const [, setSharedBookInfo] = useAtom(sharedBookInfoAtom);
  const [, setCurrentPage] = useAtom(currentPageAtom);
  const [loadingStatus, setLoadingStatus] = useState('Loading...');
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current || !bookId) return;
    hasLoaded.current = true;

    const loadSharedBook = async () => {
      console.log('Loading shared book:', bookId);
      setLoadingStatus('Fetching book...');

      const { data, error } = await supabase
        .from('books')
        .select('id, title, content, user_id')
        .eq('id', bookId)
        .single();

      if (error || !data) {
        console.error('Failed to load shared book:', error);
        window.location.href = '/';
        return;
      }

      // Reconstruct textures from fabricJSON if needed
      if (data.content && data.content.length > 0) {
        setLoadingStatus('Reconstructing pages...');

        try {
          const pagesWithTextures = await reconstructBookTextures(data.content);
          setBookPages(pagesWithTextures);
          setCurrentPage(0);
        } catch (err) {
          console.error('Failed to reconstruct textures:', err);
          setBookPages(data.content);
          setCurrentPage(0);
        }
      }

      setViewingShared(true);
      setSharedBookInfo({
        id: data.id,
        title: data.title || 'Shared Book',
        ownerId: data.user_id
      });

      setLoadingStatus('');
      console.log('Shared book loaded:', data.title);
    };

    loadSharedBook();

    return () => {
      setViewingShared(false);
      setSharedBookInfo(null);
    };
  }, [bookId, setBookPages, setViewingShared, setSharedBookInfo, setCurrentPage]);

  // Show loading indicator while reconstructing
  if (loadingStatus) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-none">
        <div className="bg-white rounded-xl p-6 shadow-2xl text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-700">{loadingStatus}</p>
        </div>
      </div>
    );
  }

  return null;
};
