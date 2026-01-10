import { useAtom } from "jotai";
import { useEffect, useState, useRef } from "react";
import { 
  bookPagesAtom, currentPageAtom, editModeAtom, languageAtom, updatePageAtom, 
  setBookPagesAtom, currentBookIdAtom, builderDataAtom, addPageAtom 
} from "../store/atoms";
import { EditorCanvas } from "./editor/EditorCanvas";
import { BookBuilderModal } from "./BookBuilderModal";
import { ResetBookModal } from "./ResetBookModal";
import { BookListModal } from "./BookListModal";
import { supabase } from "../lib/supabase"; 
import { AuthButton } from './AuthButton';
// 1. Import the hook
import { useAuth } from "../hooks/useAuth"; 

const translations = {
  en: { 
    editPage: 'Edit Page', library: 'My Library', bookBuilder: 'Book Builder', 
    newBook: 'New Book', login: 'Sign In', logout: 'Sign Out', menu: 'Menu', guest: 'Guest', addPage: 'Add Page' 
  },
  he: { 
    editPage: 'ערוך עמוד', library: 'הספרייה שלי', bookBuilder: 'בנה ספר', 
    newBook: 'ספר חדש', login: 'התחבר', logout: 'התנתק', menu: 'תפריט', guest: 'אורח', addPage: 'הוסף עמוד' 
  }
};

export const UI = () => {
  // Atoms
  const [page, setPage] = useAtom(currentPageAtom);
  const [pages] = useAtom(bookPagesAtom);
  const [currentBookId, setCurrentBookId] = useAtom(currentBookIdAtom);
  const [builderData] = useAtom(builderDataAtom);
  const [editorOpen, setEditorOpen] = useAtom(editModeAtom);
  const [, updatePage] = useAtom(updatePageAtom);
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [, addPage] = useAtom(addPageAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  // Local State
  const [editingPage, setEditingPage] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); 
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 2. Use the Auth Hook (Source of Truth)
  const { user } = useAuth();
  
  const videoRef = useRef(null);
  const t = translations[language];

  // --- DB Sync Logic ---
  // Load book when user logs in (only if we haven't loaded one)
  useEffect(() => {
    if (user && !currentBookId) {
        loadBookFromDB(user.id);
    }
  }, [user]); // Runs when user status changes

  const loadBookFromDB = async (userId) => {
    // Attempt to load the most recently updated book
    const { data } = await supabase
      .from('books')
      .select('content, id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setBookPages(data.content); 
      setCurrentBookId(data.id);
    }
  };

  const saveBookToDB = async () => {
    if (!user) return;
    setIsSyncing(true);
    
    const bookPayload = {
        user_id: user.id,
        content: pages,
        title: builderData.title || 'Untitled Book',
        cover_url: pages[0]?.front?.texture || null,
        updated_at: new Date()
    };

    if (currentBookId) {
        await supabase.from('books').update(bookPayload).eq('id', currentBookId);
    } else {
        const { data } = await supabase.from('books').insert(bookPayload).select().single();
        if (data) setCurrentBookId(data.id);
    }
    setIsSyncing(false);
  };

  // Auto-save
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => saveBookToDB(), 3000);
    return () => clearTimeout(timer);
  }, [pages, user]);

  // Clean URL hash after successful login
  useEffect(() => {
    if (user && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
    }
  }, [user]);

  // --- Auth Handlers ---
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

  // --- Action Handlers ---
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

  useEffect(() => { const audio = new Audio("/audios/page-flip-01a.mp3"); audio.play().catch(()=>{}); }, [page]);
  useEffect(() => { if (videoRef.current) videoRef.current.play().catch(()=>{}); }, []);

  // --- Components ---
  const MenuButton = ({ onClick, icon, label, danger = false }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        danger ? 'text-red-400 hover:bg-red-900/30' : 'text-white hover:bg-white/10'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <>
      <div className="fixed top-10 left-10 pointer-events-auto z-10 hidden md:block">
        <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 opacity-80 hover:opacity-100 transition-opacity">
          <video ref={videoRef} className="w-full h-full object-cover" loop muted playsInline autoPlay><source src="/videos/Optopia Eye.mp4" type="video/mp4" /></video>
        </div>
      </div>

      <a className="fixed top-10 left-4 md:left-36 pointer-events-auto z-10 bg-green-500 hover:bg-green-600 rounded-full p-2 shadow-lg" href="https://wa.me/97236030603">
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {/* HEADER UI */}
      <div className="fixed top-6 right-6 pointer-events-auto z-20 flex items-center gap-3">
        {isSyncing && (
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-medium text-white/90 tracking-wide uppercase">Saving</span>
          </div>
        )}

        {user && (
            <button 
                className="group flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all hover:scale-105 active:scale-95"
                onClick={handleEditCurrentPage}
            >
                <span>✏️</span>
                <span className="hidden md:inline">{t.editPage}</span>
            </button>
        )}

        <div className="relative">
            <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md border transition-all ${
                    menuOpen ? 'bg-white text-gray-900 border-white' : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                }`}
            >
                <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
            </button>

            {menuOpen && (
                <div className="absolute top-14 right-0 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <AuthButton 
                            language={language} 
                            user={user} 
                            onLogin={handleLogin} 
                            onLogout={handleLogout} 
                        />
                    </div>

                    <div className="py-2">
                        {user ? (
                            <>
                                <MenuButton icon="📚" label={t.library} onClick={() => { setLibraryOpen(true); setMenuOpen(false); }} />
                                <MenuButton icon="➕" label={t.addPage} onClick={handleAddPage} />
                                <MenuButton icon="🪄" label={t.bookBuilder} onClick={() => { setBuilderOpen(true); setMenuOpen(false); }} />
                                <div className="h-px bg-white/10 mx-4 my-2" />
                                <MenuButton icon="🗑️" label={t.newBook} onClick={() => { setResetOpen(true); setMenuOpen(false); }} danger />
                            </>
                        ) : (
                            <div className="px-4 py-3 text-center text-xs text-gray-500 italic">
                                Sign in to edit and save
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-white/10 bg-black/20 flex items-center justify-between">
                        <button 
                            onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
                            className="text-xs font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors border border-white/5"
                        >
                            {language === 'en' ? '🇮🇱 Hebrew' : '🇺🇸 English'}
                        </button>
                    </div>
                </div>
            )}
        </div>
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
      <BookListModal isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} />
      
      <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
        <div className="flex-1"></div>
        <div className="w-full overflow-auto pointer-events-auto flex justify-center pb-4">
          <div className="overflow-auto flex items-center gap-3 max-w-full px-6 py-2">
            {pages.map((pageData, index) => (
              <button
                key={pageData.id}
                className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base shrink-0 border whitespace-nowrap ${index === page ? "bg-white/90 text-black font-bold shadow-lg" : "bg-black/30 text-white backdrop-blur-sm"}`}
                onClick={() => setPage(index)}
              >
                {index === 0 ? t.cover : `${t.page} ${index}`}
              </button>
            ))}
            <button className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base shrink-0 border whitespace-nowrap ${page === pages.length ? "bg-white/90 text-black font-bold shadow-lg" : "bg-black/30 text-white backdrop-blur-sm"}`} onClick={() => setPage(pages.length)}>{t.backCover}</button>
          </div>
        </div>
      </main>
    </>
  );
};
