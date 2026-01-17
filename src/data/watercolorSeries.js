// Convert Google Drive URLs to CORS-friendly lh3 format
const convertToLh3 = (url) => {
  const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
};

// Optimized list with first 42 images for better performance
const rawUrls = [
  "https://drive.google.com/uc?export=view&id=1DI1jomqISKMTkY7s6rgc9pNgNcIrbyxx",
  "https://drive.google.com/uc?export=view&id=1xQDe3vGxDCE6bLf6WhDReaKDvgbKLKv8",
  "https://drive.google.com/uc?export=view&id=1rboDD4Fki6XOi0PWmEgP6WYSnkSLMhMy",
  "https://drive.google.com/uc?export=view&id=1XJ_u_J2rslbKbDcs2ysq99_sXAHOa9zJ",
  "https://drive.google.com/uc?export=view&id=1I92aAlUZYbySOS2I1vvKbs3dBgaeTLng",
  "https://drive.google.com/uc?export=view&id=1elw4osS-Xn0lqy6gZlk_fbMDoAigPJMj",
  "https://drive.google.com/uc?export=view&id=1ZZX2cgpxabJceQgX0b3tM7yBP-oaeOh9",
  "https://drive.google.com/uc?export=view&id=1wIqEjolIQSOsXkkZZNkckMKUV6HFi9vu",
  "https://drive.google.com/uc?export=view&id=1S_YTCruqpc7UPT4eKXAS4ixb9_o2WcuK",
  "https://drive.google.com/uc?export=view&id=1QdAgTPZWCVKohEME6V95yL5VOb3YLQoq",
  "https://drive.google.com/uc?export=view&id=1lEFu0GbfGItPA_vE1vj10w1lkWsCneaD",
  "https://drive.google.com/uc?export=view&id=1gsRlZdxdW8lwqmMGOU0yiTgIzxr6Qib6",
  "https://drive.google.com/uc?export=view&id=1f887MnAHYoldh2xWEVqvK_iLK5UX8WzL",
  "https://drive.google.com/uc?export=view&id=1DOOerAmZQeNLe1Jqz9NyYpxndmQyp0Sp",
  "https://drive.google.com/uc?export=view&id=1k3jaQ5MoU3cqUsz4X9IrRZpxElwgsd7h",
  "https://drive.google.com/uc?export=view&id=1fIRv0OO6OXQ1Z3uz6Tjjhy2Cs4CjmaEz",
  "https://drive.google.com/uc?export=view&id=1uLSCFVhSQD5wq-WstdX96GS291LaGGtY",
  "https://drive.google.com/uc?export=view&id=1JG9nS9iG1KxZfqFSAHT8xAtFEsgCxwhg",
  "https://drive.google.com/uc?export=view&id=1PTW_p754mARzV7L1u7ehA4ld8syjNkXq",
  "https://drive.google.com/uc?export=view&id=1vThpq4IJMFUEzDvUm152U8rGwPiVDsyW",
  "https://drive.google.com/uc?export=view&id=1KwfeaDJp-65_-AWePsgnfY0M2jXDNdxY",
  "https://drive.google.com/uc?export=view&id=1BKzfChDdv4dnW_JLZVizPW8jLYcKAJ8i",
  "https://drive.google.com/uc?export=view&id=1-mqrIF4sXc3h7uN0h0LRLZOzv5VkyGpK",
  "https://drive.google.com/uc?export=view&id=1GwQPHclKITjYXvYDfcwxU_tYpQ5Wzmw7",
  "https://drive.google.com/uc?export=view&id=117tdn1ZUWTzLjVu-oAimTnF6fzYfWHYF",
  "https://drive.google.com/uc?export=view&id=1TG5qIl1q_W_-q9i9qgmYAOHtfknMTEwI",
  "https://drive.google.com/uc?export=view&id=1LcL1Bw0k2PLTWU1RBBJ19tBtfknvdnLd",
  "https://drive.google.com/uc?export=view&id=1BGehYJk1Z3I6qrRqQCsqy8JisYczDMzb",
  "https://drive.google.com/uc?export=view&id=143vKeC0x71dBFLbieQhye0oIMNIQRSaK",
  "https://drive.google.com/uc?export=view&id=13M7mFXsyMjjFenhLyRM3kWo_Ia1kTuib",
  "https://drive.google.com/uc?export=view&id=1fTfJ7CxS1MQ8jnj0xZkQ1ZSBnf9NnaKB",
  "https://drive.google.com/uc?export=view&id=1DBHfkinACTFHsdKFGErCEHS13CkkBBpe",
  "https://drive.google.com/uc?export=view&id=1gFGv41xLHXnV1jkekku-KsL1BkjqTgvp",
  "https://drive.google.com/uc?export=view&id=1821sKOD-BRYwEgWZdt7rbgw_rd-Ytkve",
  "https://drive.google.com/uc?export=view&id=1wcuryZCsjOU9AZ9PxfNKcu6vk4rvjPGH",
  "https://drive.google.com/uc?export=view&id=160EUrHi_Rbo-lCzftjZY3A4GQxIXcJbX",
  "https://drive.google.com/uc?export=view&id=128SZMwd1QfbLDFG-YF4XDlRE_DdOnCPX",
  "https://drive.google.com/uc?export=view&id=1W6CMp4ebov7f401Ubx1zFElQIFzQeti_",
  "https://drive.google.com/uc?export=view&id=105dDlDlI0sYVULQYx-QiRSCXmdrv_quo",
  "https://drive.google.com/uc?export=view&id=1gEp3i-vY1zg83WO6p9szZE-dqtHfXhR-",
  "https://drive.google.com/uc?export=view&id=1Bly1MlaUqBNOMRkVo-atvbIsYCLfG4rP",
  "https://drive.google.com/uc?export=view&id=16jwGI-l3VXWQ4yzuoAOvHEunM28thFEN"
];

// Export with CORS-friendly URLs
export const watercolorPages = rawUrls.map(convertToLh3);
