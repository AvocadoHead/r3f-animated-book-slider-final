import { useState } from 'react';
import { useAtom } from 'jotai';
import { resetBookAtom } from '../store/atoms';

export const ResetBookModal = ({ isOpen, onClose }) => {
  const [, resetBook] = useAtom(resetBookAtom);
  const [coverUrl, setCoverUrl] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm("Are you sure? This will delete all current pages.")) {
      resetBook({ coverUrl: coverUrl || null });
      setCoverUrl('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full m-4">
        <h2 className="text-xl font-bold text-red-600 mb-2">Start New Book</h2>
        <p className="text-gray-600 text-sm mb-4">
          This will delete all pages and start fresh.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cover Image URL (Optional)
          </label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="https://..."
            value={coverUrl}
            onChange={e => setCoverUrl(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Create New Book
          </button>
        </div>
      </div>
    </div>
  );
};
