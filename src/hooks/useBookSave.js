import { useState, useRef, useEffect, useCallback } from 'react';
import { saveBook } from '../services/bookService';

/**
 * Custom hook for managing book save state and auto-save
 */
export const useBookSave = (user, pages, title, currentBookId, setCurrentBookId, viewingShared) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedContentRef = useRef(null);

  // Create content hash for comparison
  const getContentKey = useCallback(() => {
    return JSON.stringify({ pages, title });
  }, [pages, title]);

  // Track unsaved changes
  useEffect(() => {
    if (!user || viewingShared) return;
    const contentKey = getContentKey();
    if (lastSavedContentRef.current && lastSavedContentRef.current !== contentKey) {
      setHasUnsavedChanges(true);
    }
  }, [pages, title, user, viewingShared, getContentKey]);

  // Auto-save with debounce (15 seconds)
  useEffect(() => {
    if (!user || viewingShared) return;
    const timer = setTimeout(() => handleSave(false), 15000);
    return () => clearTimeout(timer);
  }, [pages, user, viewingShared]);

  const handleSave = useCallback(async (force = false) => {
    if (!user || viewingShared) return null;

    const contentKey = getContentKey();

    // Skip if nothing changed (unless forced)
    if (!force && lastSavedContentRef.current === contentKey) {
      return currentBookId;
    }

    setIsSyncing(true);
    setSaveStatus('Saving...');

    try {
      const savedBook = await saveBook(user.id, currentBookId, { pages, title });

      if (savedBook && !currentBookId) {
        setCurrentBookId(savedBook.id);
      }

      lastSavedContentRef.current = contentKey;
      setHasUnsavedChanges(false);
      setSaveStatus('Saved!');

      setTimeout(() => setSaveStatus(''), 2000);
      return savedBook?.id || currentBookId;
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('Save failed!');
      setTimeout(() => setSaveStatus(''), 3000);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, viewingShared, pages, title, currentBookId, setCurrentBookId, getContentKey]);

  const handleSaveAndShare = useCallback(async () => {
    const savedId = await handleSave(true);
    if (savedId) {
      const shareUrl = `${window.location.origin}/book/${savedId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        setSaveStatus('Link copied!');
        setTimeout(() => setSaveStatus(''), 3000);
        return shareUrl;
      } catch (err) {
        return shareUrl; // Return URL even if clipboard fails
      }
    }
    return null;
  }, [handleSave]);

  return {
    isSyncing,
    saveStatus,
    hasUnsavedChanges,
    handleSave,
    handleSaveAndShare,
    setSaveStatus
  };
};
