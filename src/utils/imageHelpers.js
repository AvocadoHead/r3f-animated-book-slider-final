export const extractGoogleDriveId = (input) => {
  if (!input) return null;
  const match = input.match(
    /(?:file\/d\/|\/d\/|open\?id=|uc\?export=view&id=|uc\?id=|id=)([a-zA-Z0-9_-]{25,})/
  );
  return match ? match[1] : null;
};

export const normalizeImageUrl = (input) => {
  if (!input) return null;
  const clean = input.trim();
  if (!clean) return null;

  const driveId = extractGoogleDriveId(clean);
  if (driveId) {
    // Use lh3 format for CORS compatibility
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // Check if it's just a raw Drive ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
    return `https://lh3.googleusercontent.com/d/${clean}`;
  }

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  return null;
};

export const getProxiedImageUrl = (input) => {
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) return input;
  const url = input.replace(/^https?:\/\//i, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

// Convert any Google Drive URL to CORS-friendly lh3 format
export const toCorsFriendlyUrl = (url) => {
  if (!url) return url;

  const driveId = extractGoogleDriveId(url);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return url;
};
