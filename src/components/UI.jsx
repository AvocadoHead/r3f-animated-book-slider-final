import { useAtom } from "jotai";
import { useEffect, useState, useRef } from "react";
import { 
  bookPagesAtom, currentPageAtom, editModeAtom, languageAtom, updatePageAtom, 
  setBookPagesAtom, currentBookIdAtom, builderDataAtom // Import these
} from "../store/atoms";
import { EditorCanvas } from "./editor/EditorCanvas";
import { BookBuilderModal } from "./BookBuilderModal";
import { ResetBookModal } from "./ResetBookModal";
import { BookListModal } from "./BookListModal"; // NEW Import
import { supabase } from "../lib/supabase"; 
import { AuthButton } from './AuthButton';

// ... translations ...
const translations = {
  en: { editPage: 'Edit Page', library: 'My Library', bookBuilder: 'Book Builder', newBook: 'New Book' },
  he: { editPage: 'ערוך עמוד', library: 'הספרייה שלי', bookBuilder: 'בנה ספר', newBook: 'ספר חדש' }
};

export const UI = () => {
  const [page, setPage] = useAtom(currentPageAtom);
  const [pages] = useAtom(bookPagesAtom);
  const [currentBookId, setCurrentBookId] = useAtom(currentBookIdAtom);
  const [builderData] = useAtom(builderDataAtom); // To get title for saving
  
  const [editorOpen, setEditorOpen] = useAtom(editModeAtom);
  const [editingPage, setEditingPage] = useState(null);
  
  // Modals
  const [builderOpen, setBuilderOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false); // NEW

  const [, updatePage] = useAtom(updatePageAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const videoRef = useRef(null);
  const t = translations[language];

  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Auth ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- Save Logic ---
  const saveBookToDB = async () => {
    if (!user) return;
    setIsSyncing(true);
    
    const bookPayload = {
        user_id: user.id,
        content: pages,
        title: builderData.title || 'Untitled Book',
        cover_url: pages[0]?.front?.texture || null, // Grab cover from page 0
        updated_at: new Date()
    };

    if (currentBookId) {
        // UPDATE existing book
        const { error } = await supabase
            .from('books')
            .update(bookPayload)
            .eq('id', currentBookId);
        if (error) console.error(error);
    } else {
        // INSERT new book
        const { data, error } = await supabase
            .from('books')
            .insert(bookPayload)
            .select()
            .single();
        
        if (!error && data) {
            setCurrentBookId(data.id); // Now we know the ID for future updates
        }
    }
    setIsSyncing(false);
  };

  // Debounced Auto-save
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => saveBookToDB(), 3000);
    return () => clearTimeout(timer);
  }, [pages, user]); // Only dep on pages changing (and user)

  // ... Editor Logic (Keep existing loadEditorFor, handleEditCurrentPage, etc.) ...
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

  const getEditorLabel = () => editingPage ? `Leaf ${editingPage.pageNumber} (${editingPage.side})` : '';

  useEffect(() => { const audio = new Audio("/audios/page-flip-01a.mp3"); audio.play().catch(()=>{}); }, [page]);
  useEffect(() => { if (videoRef.current) videoRef.current.play().catch(()=>{}); }, []);

  return (
    <>
      <div className="fixed top-10 left-10 pointer-events-auto z-10 hidden md:block">
        <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
          <video ref={videoRef} className="w-full h-full object-cover" loop muted playsInline autoPlay><source src="/videos/Optopia Eye.mp4" type="video/mp4" /></video>
        </div>
      </div>

      <a className="fixed top-10 left-4 md:left-44 pointer-events-auto z-10 bg-green-500 hover:bg-green-600 rounded-full p-2 shadow-lg" href="https://wa.me/97236030603">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {/* HEADER */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 pointer-events-auto z-10 flex items-center gap-2 flex-wrap justify-end">
        {user && isSyncing && <div className="text-xs px-2 py-1 rounded bg-black/50 text-white animate-pulse">Saving...</div>}
        
        <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white py-2 px-3 rounded-lg border border-white/20 transition-all text-sm font-medium" onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}>
            {language === 'en' ? 'עב׳' : 'En'}
        </button>

        <AuthButton language={language} />

        {/* Book Controls - Only if logged in or allow guest to play */}
        <div className="flex gap-2 bg-black/20 p-1 rounded-xl backdrop-blur-md">
            {user && (
                <button 
                    className="bg-white/20 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors"
                    onClick={() => setLibraryOpen(true)}
                    title={t.library}
                >
                    📚
                </button>
            )}
            
            <button className="bg-white/20 hover:bg-red-600 text-white p-2 rounded-lg transition-colors" onClick={() => setResetOpen(true)} title={t.newBook}>🗑️</button>
            <button className="bg-white/20 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors flex items-center gap-2" onClick={() => setBuilderOpen(true)}>
                <span>🪄</span>
            </button>
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium hover:shadow-xl transition-all" onClick={handleEditCurrentPage}>
                ✏️
            </button>
        </div>
      </div>

      {/* MODALS */}
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
      
      {/* Footer Navigation (Keep existing) */}
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
