import { useState } from 'react';

/**
 * FrameOverlay Component
 * Provides visual guides and frame overlay for the book page editor
 * Shows page boundaries, safe zones, and optional grid
 */
export const FrameOverlay = ({ 
  width = 800, 
  height = 1070,
  showGrid = false,
  showSafeZones = true,
  gridSize = 20
}) => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Main page border frame */}
      <div className="absolute inset-0 border-4 border-purple-500/50 rounded-lg" />
      
      {/* Safe zone guides (10% inset) */}
      {showSafeZones && (
        <div 
          className="absolute border-2 border-dashed border-blue-400/40"
          style={{
            left: `${width * 0.1}px`,
            right: `${width * 0.1}px`,
            top: `${height * 0.1}px`,
            bottom: `${height * 0.1}px`,
          }}
        />
      )}

      {/* Center crosshairs */}
      <div className="absolute w-full h-full">
        {/* Horizontal center line */}
        <div 
          className="absolute w-full border-t border-dashed border-gray-300/30"
          style={{ top: `${height / 2}px` }}
        />
        {/* Vertical center line */}
        <div 
          className="absolute h-full border-l border-dashed border-gray-300/30"
          style={{ left: `${width / 2}px` }}
        />
      </div>

      {/* Grid overlay */}
      {showGrid && (
        <GridPattern width={width} height={height} gridSize={gridSize} />
      )}
    </div>
  );
};

/**
 * Grid Pattern Component
 * Renders a grid overlay for precise placement
 */
const GridPattern = ({ width, height, gridSize }) => {
  const horizontalLines = Math.floor(height / gridSize);
  const verticalLines = Math.floor(width / gridSize);

  return (
    <svg 
      className="absolute inset-0 w-full h-full"
      width={width}
      height={height}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="rgba(156, 163, 175, 0.15)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
};

export default FrameOverlay;
