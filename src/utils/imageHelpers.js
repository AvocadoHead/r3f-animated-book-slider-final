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
    return `https://drive.google.com/uc?export=view&id=${driveId}`;
  }

  if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
    return `https://drive.google.com/uc?export=view&id=${clean}`;
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

export const getPreviewImageUrl = (input, size = 1200) => {
  if (!input) return null;
  const driveId = extractGoogleDriveId(input);
  if (!driveId) return null;
  return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;
};
