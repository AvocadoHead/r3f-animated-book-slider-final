export const FullscreenMediaModal = ({ media, onClose }) => {
  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white text-xl bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
      >
        &times;
      </button>

      <div
        className="w-full max-w-5xl aspect-video mx-4"
        onClick={e => e.stopPropagation()}
      >
        {media.type === 'video' && media.embedUrl && (
          <iframe
            src={media.embedUrl}
            className="w-full h-full rounded-xl shadow-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
        {media.type === 'image' && media.url && (
          <img
            src={media.url}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl mx-auto"
            alt="Fullscreen view"
          />
        )}
      </div>

      <p className="absolute bottom-6 text-white/50 text-sm">
        Click anywhere or press &times; to close
      </p>
    </div>
  );
};

export const FullscreenMediaButton = ({ media, onClick }) => {
  if (!media) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 z-40 pointer-events-auto bg-black/70 hover:bg-black/90 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all hover:scale-105 backdrop-blur-sm border border-white/20"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
      <span className="text-sm font-medium">View Fullscreen</span>
    </button>
  );
};
