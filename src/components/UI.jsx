import { useAtom } from "jotai";
import { useEffect, useState, useRef } from "react";
import { bookPagesAtom, currentPageAtom, editModeAtom, languageAtom, updatePageAtom } from "../store/atoms";
import { EditorCanvas } from "./editor/EditorCanvas";
// Ensure these paths match where you saved the files:
import { BookBuilderModal } from "./BookBuilderModal"; 
import { ResetBookModal } from "./ResetBookModal";

const translations = {
  en: {
    editPage: 'Edit Page',
    addPage: 'Add Page',
    cover: 'Cover',
    page: 'Page',
    backCover: 'Back Cover',
    bookBuilder: 'Book Builder',
    newBook: 'New Book',
  },
  he: {
    editPage: 'ערוך עמוד',
    addPage: 'הוסף עמוד',
    cover: 'כריכה',
    page: 'עמוד',
    backCover: 'כריכה אחורית',
    bookBuilder: 'בנה ספר',
    newBook: 'ספר חדש',
  }
};

export const UI = () => {
  const [page, setPage] = useAtom(currentPageAtom);
  const [pages] = useAtom(bookPagesAtom);
  
  // Modals State
  const [editorOpen, setEditorOpen] = useAtom(editModeAtom);
  const [editingPage, setEditingPage] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const [, updatePage] = useAtom(updatePageAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const videoRef = useRef(null);
  
  const t = translations[language];

  // --- Handlers ---

  const handleEditCurrentPage = () => {
    if (page >= 0 && page < pages.length) {
      const currentPageData = pages[page];
      // Check if it's front or back based on even/odd or if it's cover
      // Simplified logic: We edit the 'front' data of the current page object
      setEditingPage({
        pageId: currentPageData.id,
        side: 'front',
        data: currentPageData.front
      });
      setEditorOpen(true);
    }
  };

  const handleSaveEdit = (savedData) => {
    if (editingPage) {
      updatePage({
        pageId: editingPage.pageId,
        side: editingPage.side,
        texture: savedData.texture,
        fabricJSON: savedData.fabricJSON,
      });
      setEditorOpen(false);
      setEditingPage(null);
    }
  };

  useEffect(() => {
    const audio = new Audio("/audios/page-flip-01a.mp3");
    audio.play().catch(() => { /* Auto-play blocked */ });
  }, [page]);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => { /* Auto-play blocked */ });
    }
  }, []);

  return (
    <>
      {/* --- TOP LEFT: Video & WhatsApp --- */}
      <div className="fixed top-10 left-10 pointer-events-auto z-10 hidden md:block">
        <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay
          >
            <source src="/videos/Optopia Eye.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <a
        className="fixed top-10 left-4 md:left-44 pointer-events-auto z-10 bg-green-500 hover:bg-green-600 rounded-full p-2 shadow-lg transition-all"
        href="https://wa.me/97236030603"
        target="_blank"
        rel="noreferrer"
        title="WhatsApp Contact"
      >
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>

      {/* --- TOP RIGHT: Action Buttons --- */}
      <div className="fixed top-4 right-4 md:top-10 md:right-10 pointer-events-auto z-10 flex flex-col md:flex-row items-end gap-3">
        
        {/* Language */}
        <button
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2 px-4 rounded-lg shadow-lg transition-all border border-white/10"
          onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
        >
          {language === 'en' ? '🇮🇱 עברית' : '🇺🇸 English'}
        </button>

        <div className="flex gap-2">
          {/* New Book (Reset) */}
          <button
            className="bg-white/90 hover:bg-red-50 text-red-600 font-medium py-2 px-3 rounded-lg shadow-lg transition-all flex items-center justify-center"
            onClick={() => setResetOpen(true)}
            title={t.newBook}
          >
            <span>🗑️</span>
          </button>

          {/* Book Builder (Bulk) */}
          <button
            className="bg-white/90 hover:bg-purple-50 text-purple-700 font-medium py-2 px-4 rounded-lg shadow-lg transition-all flex items-center gap-2"
            onClick={() => setBuilderOpen(true)}
          >
            <span>🪄</span> <span className="hidden md:inline">{t.bookBuilder}</span>
          </button>

          {/* Edit Page */}
          <button
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 md:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all font-medium"
            onClick={handleEditCurrentPage}
          >
            ✏️ <span className="hidden md:inline">{t.editPage}</span>
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}
      {editorOpen && editingPage && (
        <EditorCanvas
          initialData={editingPage.data}
          onSave={handleSaveEdit}
          onClose={() => {
            setEditorOpen(false);
            setEditingPage(null);
          }}
        />
      )}

      <BookBuilderModal 
        isOpen={builderOpen} 
        onClose={() => setBuilderOpen(false)} 
      />

      <ResetBookModal 
        isOpen={resetOpen} 
        onClose={() => setResetOpen(false)} 
      />
      
      {/* --- BOTTOM: Navigation & Ticker --- */}
      <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
        <div className="flex-1"></div>
        
        {/* Page Dots / Numbers */}
        <div className="w-full overflow-auto pointer-events-auto flex justify-center pb-4">
          <div className="overflow-auto flex items-center gap-3 max-w-full px-6 py-2 no-scrollbar">
            {pages.map((pageData, index) => (
              <button
                key={pageData.id}
                className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base shrink-0 border whitespace-nowrap ${
                  index === page
                    ? "bg-white/90 text-black font-bold shadow-lg transform scale-105"
                    : "bg-black/30 text-white backdrop-blur-sm"
                }`}
                onClick={() => setPage(index)}
              >
                {index === 0 ? t.cover : `${t.page} ${index}`}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base shrink-0 border whitespace-nowrap ${
                page === pages.length
                  ? "bg-white/90 text-black font-bold shadow-lg"
                  : "bg-black/30 text-white backdrop-blur-sm"
              }`}
              onClick={() => setPage(pages.length)}
            >
              {t.backCover}
            </button>
          </div>
        </div>

        {/* Ticker */}
        <div className="w-full overflow-hidden pointer-events-auto bg-black/80 py-3 border-t border-white/10">
          <div className="whitespace-nowrap">
            <div className="inline-block animate-scroll">
              <span className="text-white/90 text-lg px-8 font-light">
                {language === 'en' 
                  ? 'Interactive 3D Book Creator • Add text, images, and videos • Create presentations, photo albums, storyboards • Contact: eyalizenman@gmail.com'
                  : 'מגזין שיש בו הכל, ספר אישי בהתאמה, אלבום תמונות אינסופי, ניוזלטר משולב קטעי וידאו, בספר האינטראקטיבי הזה תוכלו ליצוק את התוכן שלכם. לתמיכה בפרויקט צרו קשר ב-eyalizenman@gmail.com'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};
