export const FullscreenPageModal = ({ page, onClose }) => {
  if (!page) return null;

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

      {/* Page image */}
      <div
        className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {page.texture && (
          <img
            src={page.texture}
            alt={page.pageInfo || 'Page'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            style={{ backgroundColor: '#f5f5f5' }}
          />
        )}
      </div>

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
