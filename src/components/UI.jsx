import { useAtom } from "jotai";
import { useEffect, useState, useRef, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  bookPagesAtom, currentPageAtom, editModeAtom, languageAtom, updatePageAtom,
  currentBookIdAtom, setBookPagesAtom, addPageAtom, builderDataAtom, removePageAtom, reorderPagesAtom,
  viewingSharedBookAtom, sharedBookInfoAtom, fullscreenMediaAtom
} from "../store/atoms";
import { EditorCanvas } from "./editor/EditorCanvas";
import { BookBuilderModal } from "./BookBuilderModal";
import { ResetBookModal } from "./ResetBookModal";
import { useAuth } from "../hooks/useAuth";
import { AuthButton } from "./AuthButton";
import { supabase } from "../lib/supabase";

const translations = {
  en: { editPage: 'Edit Page', addPage: 'Add Page', cover: 'Cover', page: 'Page', backCover: 'Back Cover', bookBuilder: 'Book Builder', newBook: 'New Book', login: 'Sign In', logout: 'Sign Out' },
  he: { editPage: 'ערוך עמוד', addPage: 'הוסף עמוד', cover: 'כריכה', page: 'עמוד', backCover: 'כריכה אחורית', bookBuilder: 'בנה ספר', newBook: 'ספר חדש', login: 'התחבר', logout: 'התנתק' }
};

export const UI = () => {
  // Atoms
  const [page, setPage] = useAtom(currentPageAtom);
  const [pages] = useAtom(bookPagesAtom);
  const [currentBookId, setCurrentBookId] = useAtom(currentBookIdAtom);
  const [builderData, setBuilderData] = useAtom(builderDataAtom);
  const [editorOpen, setEditorOpen] = useAtom(editModeAtom);
  const [, updatePage] = useAtom(updatePageAtom);
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [, addPage] = useAtom(addPageAtom);
  const [, removePage] = useAtom(removePageAtom);
  const [, reorderPages] = useAtom(reorderPagesAtom);
  const [viewingShared] = useAtom(viewingSharedBookAtom);
  const [sharedBookInfo] = useAtom(sharedBookInfoAtom);
  const [fullscreenMedia, setFullscreenMedia] = useAtom(fullscreenMediaAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  // Local State
  const [editingPage, setEditingPage] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userBooks, setUserBooks] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'Saving...', 'Saved!', 'Save failed!'
  const lastSavedContentRef = useRef(null);

  const videoRef = useRef(null);
  const t = translations[language];

  // Extract media from current page's fabricJSON
  const currentPageMedia = useMemo(() => {
    if (!pages || pages.length === 0) return null;

    // Get the currently visible page data
    let pageData = null;
    if (page === 0) {
      pageData = pages[0]?.front;
    } else if (page === pages.length) {
      pageData = pages[pages.length - 1]?.back;
    } else if (page > 0 && page < pages.length) {
      // Show front side of current page
      pageData = pages[page]?.front;
    }

    if (!pageData?.fabricJSON?.objects) return null;

    // Find video objects in the fabricJSON
    const mediaObjects = pageData.fabricJSON.objects.filter(
      obj => obj.videoMetadata || obj.isVideo
    );

    if (mediaObjects.length > 0) {
      const firstMedia = mediaObjects[0];
      return {
        type: 'video',
        metadata: firstMedia.videoMetadata,
        embedUrl: firstMedia.videoMetadata?.embedUrl
      };
    }

    return null;
  }, [pages, page]);

  // --- AUTH HOOK (Source of Truth) ---
  const { user } = useAuth();

  // --- Database Logic ---

  // 1. Load User's Library List
  const loadUserBooks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('books')
      .select('id, title, cover_url, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (data) setUserBooks(data);
  };

  // 2. Load a Specific Book into 3D View
  const loadBook = async (bookId) => {
    const { data } = await supabase.from('books').select('content, id').eq('id', bookId).single();
    if (data) {
      setBookPages(data.content);
      setCurrentBookId(data.id);
      setLibraryOpen(false);
      setMenuOpen(false);
    }
  };

  // 3. Delete Book
  const deleteBook = async (e, bookId) => {
    e.stopPropagation();
    if (!confirm('Delete this book?')) return;
    await supabase.from('books').delete().eq('id', bookId);
    loadUserBooks();
    if (currentBookId === bookId) setCurrentBookId(null);
  };

  // 3b. Duplicate Book
  const duplicateBook = async (e, bookId) => {
    e.stopPropagation();
    if (!user) return;

    // Fetch the original book
    const { data: original } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (!original) return;

    // Create a copy with new title
    const { data: newBook } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        title: `${original.title || 'Untitled'} (Copy)`,
        content: original.content,
        cover_url: original.cover_url,
        updated_at: new Date()
      })
      .select()
      .single();

    if (newBook) {
      loadUserBooks(); // Refresh the library
    }
  };

  // 4. Save Current Book (optimized to reduce Supabase usage)
  const saveBookToDB = async (force = false) => {
    if (!user || viewingShared) return;

    // Create a content hash to check if anything changed
    const contentKey = JSON.stringify({ pages, title: builderData.title });

    // Skip save if content hasn't changed (unless forced)
    if (!force && lastSavedContentRef.current === contentKey) {
      return;
    }

    setIsSyncing(true);
    setSaveStatus('Saving...');

    // Extract only URLs from fabricJSON - strip out base64 textures to save space
    const extractUrls = (fabricJSON) => {
      if (!fabricJSON?.objects) return [];
      return fabricJSON.objects
        .filter(obj => obj.type === 'image' && obj.src && !obj.src.startsWith('data:'))
        .map(obj => obj.src);
    };

    // Create lightweight content - only fabricJSON (no base64 textures)
    const lightweightPages = pages.map(page => ({
      id: page.id,
      pageNumber: page.pageNumber,
      front: {
        fabricJSON: page.front?.fabricJSON || null,
        type: page.front?.type || 'page',
        urls: extractUrls(page.front?.fabricJSON)
      },
      back: {
        fabricJSON: page.back?.fabricJSON || null,
        type: page.back?.type || 'page',
        urls: extractUrls(page.back?.fabricJSON)
      }
    }));

    // Get cover URL (if it's a URL, not base64)
    const coverTexture = pages[0]?.front?.texture;
    const coverUrl = coverTexture && !coverTexture.startsWith('data:') && coverTexture.length < 500
      ? coverTexture
      : null;

    const bookPayload = {
      user_id: user.id,
      content: lightweightPages,
      title: builderData.title || 'My 3D Book',
      cover_url: coverUrl,
      updated_at: new Date().toISOString()
    };

    try {
      let savedBookId = currentBookId;

      if (currentBookId) {
        const { error } = await supabase.from('books').update(bookPayload).eq('id', currentBookId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('books').insert(bookPayload).select().single();
        if (error) throw error;
        if (data) {
          savedBookId = data.id;
          setCurrentBookId(data.id);
        }
      }

      // Track what we saved
      lastSavedContentRef.current = contentKey;
      setHasUnsavedChanges(false);
      setSaveStatus('Saved!');

      // Show success briefly then clear
      setTimeout(() => setSaveStatus(''), 2000);

      return savedBookId;
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('Save failed!');
      alert(`Save failed: ${err.message || 'Unknown error'}\n\nCheck console for details.`);
      setTimeout(() => setSaveStatus(''), 3000);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Effects ---

  // Track unsaved changes
  useEffect(() => {
    if (!user || viewingShared) return;
    const contentKey = JSON.stringify({ pages, title: builderData.title });
    if (lastSavedContentRef.current && lastSavedContentRef.current !== contentKey) {
      setHasUnsavedChanges(true);
    }
  }, [pages, builderData.title, user, viewingShared]);

  // Auto-save with longer debounce (15 seconds instead of 3)
  useEffect(() => {
    if (!user || viewingShared) return;
    const timer = setTimeout(() => saveBookToDB(), 15000);
    return () => clearTimeout(timer);
  }, [pages, user, viewingShared]);

  // Load Library when Modal Opens
  // THIS WAS THE SYNTAX ERROR IN YOUR SNIPPET
  useEffect(() => {
    if (libraryOpen && user) {
        loadUserBooks();
    }
  }, [libraryOpen, user]); 

  // Mute state (persisted)
  const [muted, setMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('book-muted') === 'true';
    }
    return false;
  });

  // Audio - page flip sound
  useEffect(() => {
    if (muted) return;
    const audio = new Audio("/audios/page-flip-01a.mp3");
    audio.volume = 0.3; // Lower default volume
    audio.play().catch(() => {});
  }, [page, muted]);

  // Persist mute preference
  useEffect(() => {
    localStorage.setItem('book-muted', muted ? 'true' : 'false');
  }, [muted]);
  useEffect(() => { if (videoRef.current) videoRef.current.play().catch(()=>{}); }, []);

  // --- Handlers ---
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // --- Editor Handlers ---
  const handleAddPage = () => {
      addPage(); 
      setPage(pages.length); 
      setMenuOpen(false);
  };

  const loadEditorFor = (pageIndex, side) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    setEditingPage({ pageId: pages[pageIndex].id, side, pageNumber: pageIndex, data: pages[pageIndex][side] });
    setEditorOpen(true);
  };

  const handleEditCurrentPage = () => {
    if (page === 0) loadEditorFor(0, 'front');
    else if (page === pages.length) loadEditorFor(pages.length - 1, 'back');
    else loadEditorFor(page, 'front'); 
  };

  const handleEditorNavigation = (direction) => {
      if (!editingPage) return;
      let nextIdx = editingPage.pageNumber, nextSide = editingPage.side;
      if (direction === 1) { if (nextSide === 'front') nextSide = 'back'; else { nextSide = 'front'; nextIdx++; } } 
      else { if (nextSide === 'back') nextSide = 'front'; else { nextSide = 'back'; nextIdx--; } }
      if (nextIdx >= 0 && nextIdx < pages.length) loadEditorFor(nextIdx, nextSide);
  };

  const handleSaveEdit = (savedData) => {
    if (editingPage) updatePage({ pageId: editingPage.pageId, side: editingPage.side, texture: savedData.texture, fabricJSON: savedData.fabricJSON });
  };

  const getEditorLabel = () => {
    if (!editingPage) return '';
    if (editingPage.pageNumber === 0) return 'Front Cover';
    if (editingPage.pageNumber === pages.length - 1) return 'Back Cover';
    return `Leaf ${editingPage.pageNumber} (${editingPage.side === 'front' ? 'Right' : 'Left'})`;
  };

  // --- Title Editing ---
  const startEditingTitle = () => {
    setTempTitle(builderData.title || '');
    setEditingTitle(true);
  };

  const saveTitle = () => {
    setBuilderData(prev => ({ ...prev, title: tempTitle }));
    setEditingTitle(false);
  };

  const cancelEditingTitle = () => {
    setEditingTitle(false);
    setTempTitle('');
  };

  // --- Share Book ---
  const handleShare = async () => {
    if (!currentBookId) {
      alert('Please save your book first to get a shareable link');
      return;
    }

    const shareUrl = `${window.location.origin}/book/${currentBookId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert(`Link copied to clipboard!\n\n${shareUrl}`);
    } catch (err) {
      // Fallback for older browsers
      prompt('Copy this link to share your book:', shareUrl);
    }
  };

  const handleExitSharedView = () => {
    window.location.href = '/';
  };

  // --- Page Deletion ---
  const handleDeletePage = (e, pageId, pageIndex) => {
    e.stopPropagation();
    if (pages.length <= 2) {
      alert('Cannot delete - book must have at least 2 pages (cover and back)');
      return;
    }
    if (confirm(`Delete page ${pageIndex}? This cannot be undone.`)) {
      removePage(pageId);
      // Adjust current page if needed
      if (page >= pages.length - 1) {
        setPage(Math.max(0, pages.length - 2));
      }
    }
  };

  // --- Page Reordering (Drag & Drop) ---
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Don't allow moving if same position
    if (sourceIndex === destinationIndex) return;

    // Don't allow moving first page (cover) or last page (back cover)
    if (sourceIndex === 0 || sourceIndex === pages.length - 1) return;
    if (destinationIndex === 0 || destinationIndex === pages.length - 1) return;

    reorderPages({ sourceIndex, destinationIndex });

    // Update current page if it was moved
    if (page === sourceIndex) {
      setPage(destinationIndex);
    } else if (page > sourceIndex && page <= destinationIndex) {
      setPage(page - 1);
    } else if (page < sourceIndex && page >= destinationIndex) {
      setPage(page + 1);
    }
  };

  // --- Components ---
  const MenuButton = ({ onClick, icon, label, danger = false }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${danger ? 'text-red-400 hover:bg-red-900/30' : 'text-white hover:bg-white/10'}`}>
      <span className="text-xl">{icon}</span><span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <>
      <div className="fixed top-10 left-10 pointer-events-auto z-10 hidden md:block">
        <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 opacity-80 hover:opacity-100 transition-opacity">
          <video ref={videoRef} className="w-full h-full object-cover" loop muted playsInline autoPlay><source src="/videos/Optopia Eye.mp4" type="video/mp4" /></video>
        </div>
      </div>

      <a className="fixed top-10 left-4 md:left-44 pointer-events-auto z-10 bg-green-500 hover:bg-green-600 rounded-full p-2 shadow-lg" href="https://wa.me/97236030603">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {/* Shared Book Banner */}
      {viewingShared && sharedBookInfo && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 z-50 pointer-events-auto">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📖</span>
              <span className="font-medium">{sharedBookInfo.title}</span>
              <span className="text-white/70 text-sm">(View Only)</span>
            </div>
            <button
              onClick={handleExitSharedView}
              className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded-full text-sm font-medium transition-colors"
            >
              Create Your Own
            </button>
          </div>
        </div>
      )}

      <div className={`fixed top-4 right-4 md:top-10 md:right-10 pointer-events-auto z-10 flex flex-col items-end gap-3 max-w-xs ${viewingShared ? 'mt-10' : ''}`}>
        {/* Auth Section - hide when viewing shared */}
        {!viewingShared && (
          <div className="w-full max-w-[200px]">
            <AuthButton
              language={language}
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          </div>
        )}

        {/* Language Toggle + Mute Button */}
        <div className="flex gap-2">
          <button
            className="bg-white/80 hover:bg-white backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium shadow transition-all"
            onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
          >
            {language === 'en' ? 'עב' : 'En'}
          </button>
          <button
            className={`backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium shadow transition-all ${
              muted
                ? 'bg-red-100 hover:bg-red-200 text-red-600'
                : 'bg-white/80 hover:bg-white text-gray-700'
            }`}
            onClick={() => setMuted(!muted)}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Action Menu - hide when viewing shared */}
        {user && !viewingShared && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-[160px]">
            {/* Editable Book Title */}
            <div className="px-4 py-2 border-b border-gray-200 mb-1">
              {editingTitle ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Book title..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle();
                      if (e.key === 'Escape') cancelEditingTitle();
                    }}
                  />
                  <div className="flex gap-1">
                    <button onClick={saveTitle} className="flex-1 text-xs bg-purple-600 text-white py-1 rounded hover:bg-purple-700">Save</button>
                    <button onClick={cancelEditingTitle} className="flex-1 text-xs bg-gray-200 text-gray-600 py-1 rounded hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={startEditingTitle}
                  className="w-full text-left group"
                >
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Book Title</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {builderData.title || 'Untitled Book'}
                    </span>
                    <span className="text-gray-400 group-hover:text-purple-600 transition-colors">✏️</span>
                  </div>
                </button>
              )}
            </div>

            <button
              className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              onClick={() => setLibraryOpen(true)}
            >
              My Books
            </button>
            <button
              className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              onClick={handleEditCurrentPage}
            >
              Edit Page
            </button>
            <button
              className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              onClick={() => addPage()}
            >
              Add Page
            </button>
            <button
              className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              onClick={() => setBuilderOpen(true)}
            >
              Book Builder
            </button>
            <div className="h-px bg-gray-200 my-1"></div>
            <button
              className={`text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-between ${
                saveStatus === 'Save failed!' ? 'text-red-600' :
                saveStatus === 'Saved!' ? 'text-green-600' :
                hasUnsavedChanges ? 'text-orange-600' : 'text-gray-700'
              }`}
              onClick={() => saveBookToDB(true)}
              disabled={isSyncing}
            >
              <span className="flex items-center gap-2">
                {saveStatus === 'Saving...' && <span className="inline-block w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>}
                {saveStatus === 'Saved!' && <span className="text-green-500">✓</span>}
                {saveStatus === 'Save failed!' && <span className="text-red-500">✕</span>}
                {!saveStatus && hasUnsavedChanges && <span className="text-orange-500">●</span>}
                {saveStatus || 'Save Book'}
              </span>
            </button>
            <button
              className="text-left px-4 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-sm font-medium text-purple-600 flex items-center gap-2"
              onClick={async () => {
                // Save first, then share
                const savedId = await saveBookToDB(true);
                if (savedId) {
                  const shareUrl = `${window.location.origin}/book/${savedId}`;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setSaveStatus('Link copied!');
                    setTimeout(() => setSaveStatus(''), 3000);
                  } catch (err) {
                    prompt('Copy this link to share your book:', shareUrl);
                  }
                }
              }}
              disabled={isSyncing}
            >
              <span>🔗</span>
              <span>Save & Share</span>
            </button>
            <div className="h-px bg-gray-200 my-1"></div>
            <button
              className="text-left px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium text-red-600"
              onClick={() => setResetOpen(true)}
            >
              New Book
            </button>
          </div>
        )}
      </div>

      {editorOpen && editingPage && (
        <EditorCanvas
          initialData={editingPage.data}
          onSave={handleSaveEdit}
          onClose={() => { setEditorOpen(false); setEditingPage(null); }}
          pageInfo={getEditorLabel()}
          onNavigate={handleEditorNavigation}
        />
      )}

      <BookBuilderModal isOpen={builderOpen} onClose={() => setBuilderOpen(false)} />
      <ResetBookModal isOpen={resetOpen} onClose={() => setResetOpen(false)} />

      {/* Library Modal */}
      {libraryOpen && user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">📚 My Books</h2>
              <button onClick={() => setLibraryOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {userBooks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No saved books. Create one!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userBooks.map((book) => (
                    <div key={book.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all bg-gray-50">
                      <div className="h-32 bg-gray-200 rounded-md mb-3 overflow-hidden">
                         {book.cover_url ? (
                             <img src={book.cover_url} className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-4xl">📖</div>
                         )}
                      </div>
                      <h3 className="font-bold text-gray-800 truncate">{book.title || 'Untitled'}</h3>
                      <p className="text-xs text-gray-500 mb-3">{new Date(book.updated_at).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <button onClick={() => loadBook(book.id)} className="flex-1 bg-purple-600 text-white py-1.5 rounded text-sm hover:bg-purple-700">Open</button>
                        <button onClick={(e) => duplicateBook(e, book.id)} className="bg-blue-100 text-blue-600 px-3 rounded text-sm hover:bg-blue-200" title="Duplicate">📋</button>
                        <button onClick={(e) => deleteBook(e, book.id)} className="bg-red-100 text-red-600 px-3 rounded text-sm hover:bg-red-200" title="Delete">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Button - appears when viewing page with media */}
      {currentPageMedia && (
        <button
          onClick={() => setFullscreenMedia(currentPageMedia)}
          className="fixed bottom-24 right-6 z-40 pointer-events-auto bg-black/70 hover:bg-black/90 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all hover:scale-105 backdrop-blur-sm border border-white/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span className="text-sm font-medium">View Fullscreen</span>
        </button>
      )}

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center pointer-events-auto"
          onClick={() => setFullscreenMedia(null)}
        >
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white text-xl bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          <div
            className="w-full max-w-5xl aspect-video mx-4"
            onClick={e => e.stopPropagation()}
          >
            {fullscreenMedia.type === 'video' && fullscreenMedia.embedUrl && (
              <iframe
                src={fullscreenMedia.embedUrl}
                className="w-full h-full rounded-xl shadow-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}
            {fullscreenMedia.type === 'image' && fullscreenMedia.url && (
              <img
                src={fullscreenMedia.url}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl mx-auto"
                alt="Fullscreen view"
              />
            )}
          </div>
          <p className="absolute bottom-6 text-white/50 text-sm">
            Click anywhere or press ✕ to close
          </p>
        </div>
      )}

      <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
        <div className="flex-1"></div>
        <div className="w-full overflow-auto pointer-events-auto flex justify-center pb-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="pages" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="overflow-auto flex items-center gap-3 max-w-full px-6 py-2"
                >
                  {pages.map((pageData, index) => {
                    const isFirst = index === 0;
                    const isLast = index === pages.length - 1;
                    const canDelete = !isFirst && !isLast && pages.length > 2 && user && !viewingShared;
                    const canDrag = !isFirst && !isLast && user && !viewingShared;

                    return (
                      <Draggable
                        key={pageData.id}
                        draggableId={pageData.id}
                        index={index}
                        isDragDisabled={!canDrag}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`relative group shrink-0 ${snapshot.isDragging ? 'z-50' : ''}`}
                          >
                            <button
                              className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base border whitespace-nowrap ${
                                index === page ? "bg-white/90 text-black font-bold shadow-lg" : "bg-black/30 text-white backdrop-blur-sm"
                              } ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                              onClick={() => setPage(index)}
                            >
                              {isFirst ? t.cover : `${t.page} ${index}`}
                            </button>
                            {canDelete && (
                              <button
                                onClick={(e) => handleDeletePage(e, pageData.id, index)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center"
                                title="Delete page"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  <button
                    className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base shrink-0 border whitespace-nowrap ${
                      page === pages.length ? "bg-white/90 text-black font-bold shadow-lg" : "bg-black/30 text-white backdrop-blur-sm"
                    }`}
                    onClick={() => setPage(pages.length)}
                  >
                    {t.backCover}
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </main>
    </>
  );
};
