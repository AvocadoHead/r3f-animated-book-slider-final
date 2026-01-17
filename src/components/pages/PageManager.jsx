import { useAtom } from 'jotai';
import { useState } from 'react';
import { bookPagesAtom, addPageAtom, removePageAtom, currentPageAtom, languageAtom } from '@/store/atoms';
import { EditorCanvas } from '@/components/editor/EditorCanvas';

const translations = {
  en: {
    addPage: 'Add Page',
    addPageTitle: 'Add New Page',
    addPageMessage: 'A new page will be added to the end of the book. Continue?',
    cancel: 'Cancel',
    confirm: 'Add Page',
    cannotDelete: 'Cannot delete the only page in the book',
    confirmDelete: 'Are you sure you want to delete this page?',
  },
  he: {
    addPage: 'הוסף עמוד',
    addPageTitle: 'הוסף עמוד חדש',
    addPageMessage: 'עמוד חדש יתוסף לסוף הספר. האם להמשיך?',
    cancel: 'ביטול',
    confirm: 'הוסף עמוד',
    cannotDelete: 'לא ניתן למחוק את העמוד היחיד בספר',
    confirmDelete: 'האם אתה בטוח שברצונך למחוק עמוד זה?',
  }
};

export const PageManager = () => {
  const [pages] = useAtom(bookPagesAtom);
  const [, addPage] = useAtom(addPageAtom);
  const [, removePage] = useAtom(removePageAtom);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const [language] = useAtom(languageAtom);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  
  const t = translations[language];

  const handleAddPage = () => {
    setShowAddDialog(true);
  };

  const confirmAddPage = () => {
    const newPage = addPage('end');
    setShowAddDialog(false);
    // Open editor for the new page
    setEditingPage({ page: newPage, side: 'front' });
    setShowEditor(true);
    // Navigate to the new page
    setCurrentPage(pages.length);
  };

  const handleRemovePage = (pageId) => {
    if (pages.length <= 1) {
      alert(t.cannotDelete);
      return;
    }
    
    if (confirm(t.confirmDelete)) {
      removePage(pageId);
      // Adjust current page if needed
      if (currentPage >= pages.length - 1) {
        setCurrentPage(Math.max(0, pages.length - 2));
      }
    }
  };

  return (
    <>
      {/* Add Page Confirmation Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
            <h3 className="text-2xl font-bold mb-4" style={{ textAlign: language === 'he' ? 'right' : 'left' }}>
              {t.addPageTitle}
            </h3>
            <p className="text-gray-600 mb-6" style={{ textAlign: language === 'he' ? 'right' : 'left' }}>
              {t.addPageMessage}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmAddPage}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && editingPage && (
        <EditorCanvas
          initialData={editingPage.page[editingPage.side]}
          onSave={(data) => {
            // Save will be handled by parent component through atoms
            console.log('Saved page data:', data);
            setShowEditor(false);
            setEditingPage(null);
          }}
          onClose={() => {
            setShowEditor(false);
            setEditingPage(null);
          }}
        />
      )}
    </>
  );
};
