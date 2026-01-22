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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current || !bookId) return;
    hasLoaded.current = true;

    const loadSharedBook = async () => {
      console.log('Loading shared book:', bookId);
      setLoadingStatus('Fetching book...');
      setProgress(5);

      try {
        const { data, error: fetchError } = await supabase
          .from('books')
          .select('id, title, content, user_id')
          .eq('id', bookId)
          .single();

        if (fetchError || !data) {
          console.error('Failed to load shared book:', fetchError);
          setError('Book not found');
          setTimeout(() => window.location.href = '/', 2000);
          return;
        }

        setProgress(15);

        // Debug logging
        console.log('Shared book data:', {
          id: data.id,
          title: data.title,
          hasContent: !!data.content,
          contentType: typeof data.content,
          contentIsArray: Array.isArray(data.content),
          contentLength: Array.isArray(data.content) ? data.content.length : 'N/A',
          firstPage: data.content?.[0] ? {
            hasFront: !!data.content[0].front,
            hasBack: !!data.content[0].back,
            frontHasTexture: !!data.content[0].front?.texture,
            frontHasFabric: !!data.content[0].front?.fabricJSON
          } : 'no pages'
        });

        // Validate content is an array
        const content = Array.isArray(data.content) ? data.content : [];

        if (content.length > 0) {
          setLoadingStatus('Reconstructing pages...');

          try {
            const pagesWithTextures = await reconstructBookTextures(content, (p) => {
              // Map progress from 15-95%
              setProgress(15 + Math.round(p * 0.8));
            });
            setBookPages(pagesWithTextures);
          } catch (err) {
            console.error('Failed to reconstruct textures:', err);
            // Try to use content as-is
            setBookPages(content);
          }
        }

        setCurrentPage(0);
        setViewingShared(true);
        setSharedBookInfo({
          id: data.id,
          title: data.title || 'Shared Book',
          ownerId: data.user_id
        });

        setProgress(100);
        setLoadingStatus('');
        console.log('Shared book loaded:', data.title);
      } catch (err) {
        console.error('Error loading shared book:', err);
        setError('Failed to load book');
        setTimeout(() => window.location.href = '/', 2000);
      }
    };

    loadSharedBook();

    return () => {
      setViewingShared(false);
      setSharedBookInfo(null);
    };
  }, [bookId, setBookPages, setViewingShared, setSharedBookInfo, setCurrentPage]);

  // Show loading indicator while reconstructing
  if (loadingStatus || error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-none">
        <div className="bg-white rounded-xl p-6 shadow-2xl text-center min-w-[250px]">
          {error ? (
            <>
              <div className="text-red-500 text-2xl mb-2">⚠️</div>
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-gray-500 text-sm mt-2">Redirecting...</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-700 mb-2">{loadingStatus}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-400 text-xs mt-1">{progress}%</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};
