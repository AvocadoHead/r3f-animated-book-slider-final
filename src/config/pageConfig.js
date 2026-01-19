// Centralized page dimension constants
// Used across the application for consistency

export const PAGE_DIMENSIONS = {
  // Canvas editing dimensions (smaller for performance)
  width: 800,
  height: 1070,

  // Actual output/render dimensions (higher quality)
  actualWidth: 1325,
  actualHeight: 1771,

  // Padding for content layout
  padding: 40,
};

// Grid layout configurations for different items-per-page
export const GRID_LAYOUTS = {
  1: [{ x: 0, y: 0, w: 1, h: 1 }],
  2: [
    { x: 0, y: 0, w: 1, h: 0.5 },
    { x: 0, y: 0.5, w: 1, h: 0.5 }
  ],
  4: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
  ]
};

// Cover grid (with title offset)
export const getCoverGridLayout = (hasTitle) => {
  if (hasTitle) {
    return [{ x: 0, y: 0.3, w: 1, h: 0.7 }];
  }
  return GRID_LAYOUTS[1];
};

// Maximum URLs allowed in book builder
export const MAX_URLS = 100;

// Default builder form state
export const DEFAULT_BUILDER_STATE = {
  title: '',
  coverUrl: '',
  urls: '',
  itemsPerPage: 1,
  coverColor: '#000000',
  coverFontSize: '60',
  shouldReset: true
};
