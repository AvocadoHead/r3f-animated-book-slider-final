import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { supabase } from '../lib/supabase';
import { setBookPagesAtom, currentBookIdAtom } from '../store/atoms';

export const BookListModal = ({ isOpen, onClose }) => {
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [, setCurrentBookId] = useAtom(currentBookIdAtom);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchBooks();
  }, [isOpen]);

  const fetchBooks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('books')
      .select('id, title, cover_url, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error) setBooks(data || []);
    setLoading(false);
  };

  const loadBook = async (bookId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('books')
      .select('content, id')
      .eq('id', bookId)
      .single();

    if (!error && data) {
      setBookPages(data.content);
      setCurrentBookId(data.id); // Set the active ID so auto-save updates THIS book
      onClose();
    }
    setLoading(false);
  };

  const deleteBook = async (e, bookId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this book?')) return;

    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (!error) {
      setBooks(prev => prev.filter(b => b.id !== bookId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[800px] max-w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Library</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading && <div className="text-center py-10 text-gray-500">Loading library...</div>}
          
          {!loading && books.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500">No books found. Create one with the Magic Wand!</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {books.map((book) => (
              <div 
                key={book.id}
                onClick={() => loadBook(book.id)}
                className="group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all border border-gray-200 hover:border-purple-400 aspect-[3/4]"
              >
                {/* Thumbnail */}
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-4xl">📖</div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold truncate">{book.title || 'Untitled Book'}</h3>
                  <p className="text-xs text-gray-300">
                    {new Date(book.updated_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Delete Button */}
                <button 
                  onClick={(e) => deleteBook(e, book.id)}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all shadow-md z-10"
                  title="Delete Book"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
