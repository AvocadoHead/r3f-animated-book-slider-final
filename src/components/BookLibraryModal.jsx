import { useEffect, useState } from 'react';
import { fetchUserBooks, deleteBook as deleteBookService, duplicateBook as duplicateBookService } from '../services/bookService';

export const BookLibraryModal = ({ isOpen, onClose, user, onLoadBook, onEditBook, currentBookId }) => {
  const [userBooks, setUserBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadBooks();
    }
  }, [isOpen, user]);

  const loadBooks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const books = await fetchUserBooks(user.id);
      setUserBooks(books);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e, bookId) => {
    e.stopPropagation();
    if (!confirm('Delete this book?')) return;

    try {
      await deleteBookService(bookId);
      loadBooks();
    } catch (err) {
      console.error('Failed to delete book:', err);
      alert('Failed to delete book');
    }
  };

  const handleDuplicate = async (e, bookId) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await duplicateBookService(bookId, user.id);
      loadBooks();
    } catch (err) {
      console.error('Failed to duplicate book:', err);
      alert('Failed to duplicate book');
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">My Books</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 mt-2">Loading books...</p>
            </div>
          ) : userBooks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No saved books. Create one!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userBooks.map((book) => (
                <div
                  key={book.id}
                  className={`border rounded-lg p-4 hover:shadow-lg transition-all bg-gray-50 cursor-pointer ${
                    currentBookId === book.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  }`}
                  onClick={() => onLoadBook(book.id)}
                >
                  <div className="h-32 bg-gray-200 rounded-md mb-3 overflow-hidden">
                    {book.cover_url ? (
                      <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-100 to-blue-100">
                        📖
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 truncate">{book.title || 'Untitled'}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {new Date(book.updated_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onLoadBook(book.id); }}
                      className="flex-1 bg-purple-600 text-white py-1.5 rounded text-sm hover:bg-purple-700"
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditBook(book.id); }}
                      className="bg-green-100 text-green-600 px-3 rounded text-sm hover:bg-green-200"
                      title="Edit Book"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(e, book.id)}
                      className="bg-blue-100 text-blue-600 px-3 rounded text-sm hover:bg-blue-200"
                      title="Duplicate"
                    >
                      📋
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, book.id)}
                      className="bg-red-100 text-red-600 px-3 rounded text-sm hover:bg-red-200"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
