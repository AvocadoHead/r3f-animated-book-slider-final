/**
 * Parse Google Drive video URL and extract file ID
 * Supports various Google Drive URL formats
 */
export function parseGoogleDriveUrl(url) {
  if (!url) return null;

  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view
  let match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) return match[1];

  // Pattern 2: https://drive.google.com/open?id=FILE_ID
  match = url.match(/[?&]id=([^&]+)/);
  if (match) return match[1];

  // Pattern 3: Already just the ID
  if (url.match(/^[a-zA-Z0-9_-]{25,}$/)) {
    return url;
  }

  return null;
}

/**
 * Generate Google Drive thumbnail URL
 * Note: This may not work for all videos due to permissions
 */
export function getGoogleDriveThumbnail(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

/**
 * Generate Google Drive preview URL for embedding
 */
export function getGoogleDrivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Generate Google Drive direct download URL
 */
export function getGoogleDriveDirectUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Check if URL is a video URL (basic check)
 */
export function isVideoUrl(url) {
  if (!url) return false;
  
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const lowerUrl = url.toLowerCase();
  
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('drive.google.com') ||
         lowerUrl.includes('youtube.com') ||
         lowerUrl.includes('youtu.be') ||
         lowerUrl.includes('vimeo.com');
}

/**
 * Parse YouTube URL
 */
export function parseYouTubeUrl(url) {
  if (!url) return null;

  // Pattern 1: https://www.youtube.com/watch?v=VIDEO_ID
  let match = url.match(/[?&]v=([^&]+)/);
  if (match) return match[1];

  // Pattern 2: https://youtu.be/VIDEO_ID
  match = url.match(/youtu\.be\/([^?]+)/);
  if (match) return match[1];

  return null;
}

/**
 * Get YouTube thumbnail
 */
export function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Create video metadata object for storage
 */
export function createVideoMetadata(url) {
  const googleDriveId = parseGoogleDriveUrl(url);
  if (googleDriveId) {
    return {
      type: 'google-drive',
      id: googleDriveId,
      originalUrl: url,
      thumbnailUrl: getGoogleDriveThumbnail(googleDriveId),
      previewUrl: getGoogleDrivePreviewUrl(googleDriveId),
      directUrl: getGoogleDriveDirectUrl(googleDriveId),
    };
  }

  const youtubeId = parseYouTubeUrl(url);
  if (youtubeId) {
    return {
      type: 'youtube',
      id: youtubeId,
      originalUrl: url,
      thumbnailUrl: getYouTubeThumbnail(youtubeId),
      embedUrl: getYouTubeEmbedUrl(youtubeId),
    };
  }

  // Generic video URL
  return {
    type: 'generic',
    originalUrl: url,
    thumbnailUrl: null, // Will need manual thumbnail
    embedUrl: url,
  };
}

/**
 * Load video thumbnail as Image element for Fabric.js
 */
export async function loadVideoThumbnail(videoMetadata) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback to placeholder
      const placeholderImg = new Image();
      placeholderImg.src = createVideoPlaceholder(videoMetadata);
      placeholderImg.onload = () => resolve(placeholderImg);
    };
    
    img.src = videoMetadata.thumbnailUrl || createVideoPlaceholder(videoMetadata);
  });
}

/**
 * Create a canvas-based video placeholder
 */
export function createVideoPlaceholder(videoMetadata) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Play icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 80;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Triangle (play symbol)
  ctx.fillStyle = '#667eea';
  ctx.beginPath();
  ctx.moveTo(centerX - 20, centerY - 30);
  ctx.lineTo(centerX - 20, centerY + 30);
  ctx.lineTo(centerX + 30, centerY);
  ctx.closePath();
  ctx.fill();
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎬 VIDEO', centerX, centerY + radius + 50);
  
  if (videoMetadata.type === 'google-drive') {
    ctx.font = '18px Arial';
    ctx.fillText('Google Drive', centerX, centerY + radius + 80);
  } else if (videoMetadata.type === 'youtube') {
    ctx.font = '18px Arial';
    ctx.fillText('YouTube', centerX, centerY + radius + 80);
  }
  
  return canvas.toDataURL('image/png');
}
