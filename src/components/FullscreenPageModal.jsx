import { useState } from 'react';

export const FullscreenPageModal = ({ page, onClose }) => {
  const [viewMode, setViewMode] = useState('spread'); // 'spread' or 'single'
  const [focusedSide, setFocusedSide] = useState('left'); // 'left' or 'right'

  if (!page) return null;

  const isSingle = page.type === 'single';
  const isSpread = page.type === 'spread';
  const showSingleLeaf = isSpread && viewMode === 'single';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white text-xl bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition-colors z-10"
      >
        &times;
      </button>

      {/* Navigation hints */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        Click anywhere to close
      </div>

      {/* Single page (cover or back cover) */}
      {isSingle && page.texture && (
        <div
          className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={page.texture}
            alt={page.pageInfo || 'Page'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            style={{ backgroundColor: '#f5f5f5' }}
          />
        </div>
      )}

      {/* Spread view (two pages side by side) */}
      {isSpread && !showSingleLeaf && (
        <div
          className="max-w-[95vw] max-h-[95vh] flex items-center justify-center gap-1"
          onClick={e => e.stopPropagation()}
        >
          {/* Left page */}
          {page.leftTexture ? (
            <img
              src={page.leftTexture}
              alt="Left page"
              className="max-h-[85vh] object-contain rounded-l-lg shadow-2xl"
              style={{ backgroundColor: '#f5f5f5', maxWidth: '47vw' }}
            />
          ) : (
            <div
              className="max-h-[85vh] aspect-[3/4] bg-gray-100 rounded-l-lg shadow-2xl flex items-center justify-center"
              style={{ maxWidth: '47vw', minWidth: '200px', minHeight: '300px' }}
            >
              <span className="text-gray-400">Empty Page</span>
            </div>
          )}

          {/* Right page */}
          {page.rightTexture ? (
            <img
              src={page.rightTexture}
              alt="Right page"
              className="max-h-[85vh] object-contain rounded-r-lg shadow-2xl"
              style={{ backgroundColor: '#f5f5f5', maxWidth: '47vw' }}
            />
          ) : (
            <div
              className="max-h-[85vh] aspect-[3/4] bg-gray-100 rounded-r-lg shadow-2xl flex items-center justify-center"
              style={{ maxWidth: '47vw', minWidth: '200px', minHeight: '300px' }}
            >
              <span className="text-gray-400">Empty Page</span>
            </div>
          )}
        </div>
      )}

      {/* Single-leaf focus view (one page at a time) */}
      {showSingleLeaf && (
        <div
          className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          {/* Navigation arrows */}
          <button
            onClick={(e) => { e.stopPropagation(); setFocusedSide('left'); }}
            className={`absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              focusedSide === 'left'
                ? 'bg-white/20 text-white/40 cursor-default'
                : 'bg-white/10 hover:bg-white/30 text-white'
            }`}
            disabled={focusedSide === 'left'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Focused page */}
          {(focusedSide === 'left' ? page.leftTexture : page.rightTexture) ? (
            <img
              src={focusedSide === 'left' ? page.leftTexture : page.rightTexture}
              alt={focusedSide === 'left' ? 'Left page' : 'Right page'}
              className="max-h-[90vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
              style={{ backgroundColor: '#f5f5f5' }}
            />
          ) : (
            <div
              className="max-h-[85vh] aspect-[3/4] bg-gray-100 rounded-lg shadow-2xl flex items-center justify-center"
              style={{ maxWidth: '60vw', minWidth: '300px', minHeight: '400px' }}
            >
              <span className="text-gray-400">Empty Page</span>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setFocusedSide('right'); }}
            className={`absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              focusedSide === 'right'
                ? 'bg-white/20 text-white/40 cursor-default'
                : 'bg-white/10 hover:bg-white/30 text-white'
            }`}
            disabled={focusedSide === 'right'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Page indicator */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setFocusedSide('left'); }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${focusedSide === 'left' ? 'bg-white' : 'bg-white/40'}`}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setFocusedSide('right'); }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${focusedSide === 'right' ? 'bg-white' : 'bg-white/40'}`}
            />
          </div>
        </div>
      )}

      {/* View mode toggle (only for spreads) */}
      {isSpread && (
        <button
          onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'spread' ? 'single' : 'spread'); }}
          className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors z-10"
        >
          {viewMode === 'spread' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Single Page</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-sm">Spread View</span>
            </>
          )}
        </button>
      )}

      {/* Page info */}
      {page.pageInfo && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
          {page.pageInfo}
        </div>
      )}
    </div>
  );
};

export const FullscreenPageButton = ({ onClick, disabled }) => {
  if (disabled) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 left-6 z-40 pointer-events-auto bg-black/70 hover:bg-black/90 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all hover:scale-105 backdrop-blur-sm border border-white/20"
      title="View page fullscreen"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
      <span className="text-sm font-medium">View Page</span>
    </button>
  );
};
