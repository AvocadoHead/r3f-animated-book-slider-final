import { useAtom } from "jotai";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  bookPagesAtom, currentPageAtom, editModeAtom, languageAtom, updatePageAtom,
  currentBookIdAtom, setBookPagesAtom, addPageAtom, builderDataAtom, removePageAtom, reorderPagesAtom,
  viewingSharedBookAtom, sharedBookInfoAtom, fullscreenMediaAtom, fullscreenPageAtom
} from "../store/atoms";
import { EditorCanvas } from "./editor/EditorCanvas";
import { BookBuilderModal } from "./BookBuilderModal";
import { ResetBookModal } from "./ResetBookModal";
import { BookLibraryModal } from "./BookLibraryModal";
import { FullscreenMediaModal, FullscreenMediaButton } from "./FullscreenMediaModal";
import { FullscreenPageModal, FullscreenPageButton } from "./FullscreenPageModal";
import { DisplaySettingsPanel } from "./DisplaySettingsPanel";
import { PageNavigationFooter } from "./PageNavigationFooter";
import { useAuth } from "../hooks/useAuth";
import { useBookSave } from "../hooks/useBookSave";
import { AuthButton } from "./AuthButton";
import { fetchBook, signInWithGoogle, signOut } from "../services/bookService";

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
  const [fullscreenPage, setFullscreenPage] = useAtom(fullscreenPageAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  // Local State
  const [editingPage, setEditingPage] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const videoRef = useRef(null);
  const t = translations[language];

  // Auth
  const { user } = useAuth();

  // Book Save Hook
  const {
    isSyncing,
    saveStatus,
    hasUnsavedChanges,
    handleSave,
    handleSaveAndShare,
    setSaveStatus
  } = useBookSave(user, pages, builderData.title, currentBookId, setCurrentBookId, viewingShared);

  // Extract media from current page
  const currentPageMedia = useMemo(() => {
    if (!pages || pages.length === 0) return null;

    let pageData = null;
    if (page === 0) pageData = pages[0]?.front;
    else if (page === pages.length) pageData = pages[pages.length - 1]?.back;
    else if (page > 0 && page < pages.length) pageData = pages[page]?.front;

    if (!pageData?.fabricJSON?.objects) return null;

    const mediaObjects = pageData.fabricJSON.objects.filter(obj => obj.videoMetadata || obj.isVideo);
    if (mediaObjects.length > 0) {
      const firstMedia = mediaObjects[0];
      return { type: 'video', metadata: firstMedia.videoMetadata, embedUrl: firstMedia.videoMetadata?.embedUrl };
    }
    return null;
  }, [pages, page]);

  // Get current page texture for fullscreen viewing
  const currentPageData = useMemo(() => {
    if (!pages || pages.length === 0) return null;

    let pageData = null;
    let pageInfo = '';

    if (page === 0) {
      pageData = pages[0]?.front;
      pageInfo = 'Cover';
    } else if (page === pages.length) {
      pageData = pages[pages.length - 1]?.back;
      pageInfo = 'Back Cover';
    } else if (page > 0 && page < pages.length) {
      pageData = pages[page]?.front;
      pageInfo = `Page ${page}`;
    }

    if (!pageData?.texture) return null;

    return { texture: pageData.texture, pageInfo };
  }, [pages, page]);

  // Mute state
  const [muted, setMuted] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('book-muted') === 'true';
    return false;
  });

  // Audio effects
  useEffect(() => {
    if (muted) return;
    const audio = new Audio("/audios/page-flip-01a.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, [page, muted]);

  useEffect(() => {
    localStorage.setItem('book-muted', muted ? 'true' : 'false');
  }, [muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }, []);

  // Auth Handlers
  const handleLogin = () => signInWithGoogle(window.location.origin);
  const handleLogout = async () => { await signOut(); window.location.reload(); };

  // Library Handler
  const handleLoadBook = async (bookId) => {
    try {
      const data = await fetchBook(bookId);
      if (data) {
        setBookPages(data.content);
        setCurrentBookId(data.id);
        setLibraryOpen(false);
        setMenuOpen(false);
      }
    } catch (err) {
      console.error('Failed to load book:', err);
      alert('Failed to load book');
    }
  };

  // Editor Handlers
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

  // Title Editing
  const startEditingTitle = () => { setTempTitle(builderData.title || ''); setEditingTitle(true); };
  const saveTitle = () => { setBuilderData(prev => ({ ...prev, title: tempTitle })); setEditingTitle(false); };
  const cancelEditingTitle = () => { setEditingTitle(false); setTempTitle(''); };

  // Page Management
  const handleDeletePage = (pageId) => {
    removePage(pageId);
    if (page >= pages.length - 1) setPage(Math.max(0, pages.length - 2));
  };

  const handleReorder = (sourceIndex, destinationIndex) => {
    reorderPages({ sourceIndex, destinationIndex });
    if (page === sourceIndex) setPage(destinationIndex);
    else if (page > sourceIndex && page <= destinationIndex) setPage(page - 1);
    else if (page < sourceIndex && page >= destinationIndex) setPage(page + 1);
  };

  return (
    <>
      {/* Logo */}
      <div className="fixed top-10 left-10 pointer-events-auto z-10 hidden md:block">
        <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 opacity-80 hover:opacity-100 transition-opacity">
          <video ref={videoRef} className="w-full h-full object-cover" loop muted playsInline autoPlay>
            <source src="/videos/Optopia Eye.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* WhatsApp Link */}
      <a className="fixed top-10 left-4 md:left-44 pointer-events-auto z-10 bg-green-500 hover:bg-green-600 rounded-full p-2 shadow-lg" href="https://wa.me/97236030603">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
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
            <button onClick={() => window.location.href = '/'} className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded-full text-sm font-medium transition-colors">
              Create Your Own
            </button>
          </div>
        </div>
      )}

      {/* Top Right Controls */}
      <div className={`fixed top-4 right-4 md:top-10 md:right-10 pointer-events-auto z-10 flex flex-col items-end gap-3 max-w-xs ${viewingShared ? 'mt-10' : ''}`}>
        {!viewingShared && (
          <div className="w-full max-w-[200px]">
            <AuthButton language={language} user={user} onLogin={handleLogin} onLogout={handleLogout} />
          </div>
        )}

        {/* Language, Mute & Display Settings - available to all users */}
        <div className="flex gap-2 items-center">
          <button className="bg-white/80 hover:bg-white backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium shadow transition-all" onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}>
            {language === 'en' ? 'עב' : 'En'}
          </button>
          <button className={`backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium shadow transition-all ${muted ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-white/80 hover:bg-white text-gray-700'}`} onClick={() => setMuted(!muted)} title={muted ? 'Unmute sounds' : 'Mute sounds'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <DisplaySettingsPanel />
        </div>

        {/* Menu */}
        {user && !viewingShared && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${menuOpen ? 'bg-purple-600 text-white' : 'bg-white/90 backdrop-blur-xl text-gray-700 hover:bg-white'}`}>
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>

            {menuOpen && (
              <div className="absolute top-14 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 flex flex-col gap-1 min-w-[200px] border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Title Editor */}
                <div className="px-4 py-2 border-b border-gray-200 mb-1">
                  {editingTitle ? (
                    <div className="flex flex-col gap-2">
                      <input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Book title..." autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') cancelEditingTitle(); }} />
                      <div className="flex gap-1">
                        <button onClick={saveTitle} className="flex-1 text-xs bg-purple-600 text-white py-1 rounded hover:bg-purple-700">Save</button>
                        <button onClick={cancelEditingTitle} className="flex-1 text-xs bg-gray-200 text-gray-600 py-1 rounded hover:bg-gray-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={startEditingTitle} className="w-full text-left group">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Book Title</span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800 truncate">{builderData.title || 'Untitled Book'}</span>
                        <span className="text-gray-400 group-hover:text-purple-600 transition-colors">✏️</span>
                      </div>
                    </button>
                  )}
                </div>

                <button className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700" onClick={() => { setLibraryOpen(true); setMenuOpen(false); }}>My Books</button>
                <button className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700" onClick={() => { handleEditCurrentPage(); setMenuOpen(false); }}>Edit Page</button>
                <button className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700" onClick={() => { addPage(); setMenuOpen(false); }}>Add Page</button>
                <button className="text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700" onClick={() => { setBuilderOpen(true); setMenuOpen(false); }}>Book Builder</button>

                <div className="h-px bg-gray-200 my-1"></div>

                <button className={`text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-between ${saveStatus === 'Save failed!' ? 'text-red-600' : saveStatus === 'Saved!' ? 'text-green-600' : hasUnsavedChanges ? 'text-orange-600' : 'text-gray-700'}`} onClick={() => handleSave(true)} disabled={isSyncing}>
                  <span className="flex items-center gap-2">
                    {saveStatus === 'Saving...' && <span className="inline-block w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>}
                    {saveStatus === 'Saved!' && <span className="text-green-500">✓</span>}
                    {saveStatus === 'Save failed!' && <span className="text-red-500">✕</span>}
                    {!saveStatus && hasUnsavedChanges && <span className="text-orange-500">●</span>}
                    {saveStatus || 'Save Book'}
                  </span>
                </button>

                <button className="text-left px-4 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-sm font-medium text-purple-600 flex items-center gap-2" onClick={handleSaveAndShare} disabled={isSyncing}>
                  <span>🔗</span><span>Save & Share</span>
                </button>

                <div className="h-px bg-gray-200 my-1"></div>

                <button className="text-left px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium text-red-600" onClick={() => { setResetOpen(true); setMenuOpen(false); }}>New Book</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editorOpen && editingPage && (
        <EditorCanvas initialData={editingPage.data} onSave={handleSaveEdit} onClose={() => { setEditorOpen(false); setEditingPage(null); }} pageInfo={getEditorLabel()} onNavigate={handleEditorNavigation} />
      )}

      <BookBuilderModal isOpen={builderOpen} onClose={() => setBuilderOpen(false)} />
      <ResetBookModal isOpen={resetOpen} onClose={() => setResetOpen(false)} />
      <BookLibraryModal isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} user={user} onLoadBook={handleLoadBook} currentBookId={currentBookId} />

      {/* Fullscreen Media (video) */}
      <FullscreenMediaButton media={currentPageMedia} onClick={() => setFullscreenMedia(currentPageMedia)} />
      <FullscreenMediaModal media={fullscreenMedia} onClose={() => setFullscreenMedia(null)} />

      {/* Fullscreen Page - available to all users */}
      <FullscreenPageButton onClick={() => setFullscreenPage(currentPageData)} disabled={!currentPageData} />
      <FullscreenPageModal page={fullscreenPage} onClose={() => setFullscreenPage(null)} />

      {/* Page Navigation */}
      <PageNavigationFooter pages={pages} currentPage={page} onPageChange={setPage} onDeletePage={handleDeletePage} onReorder={handleReorder} user={user} viewingShared={viewingShared} translations={t} />
    </>
  );
};
