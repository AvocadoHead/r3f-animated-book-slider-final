import { supabase } from '../lib/supabase';

/**
 * Book Service - Centralized database operations for books
 * Abstracts Supabase queries and provides clean API for components
 */

// --- Read Operations ---

/**
 * Fetch all books for a user
 */
export const fetchUserBooks = async (userId) => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('books')
    .select('id, title, cover_url, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user books:', error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch a single book by ID
 */
export const fetchBook = async (bookId) => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) {
    console.error('Error fetching book:', error);
    throw error;
  }

  return data;
};

/**
 * Fetch a book for shared/public viewing
 */
export const fetchSharedBook = async (bookId) => {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, content, user_id')
    .eq('id', bookId)
    .single();

  if (error) {
    console.error('Error fetching shared book:', error);
    throw error;
  }

  return data;
};

// --- Write Operations ---

/**
 * Create a new book
 */
export const createBook = async (userId, { title, content, coverUrl }) => {
  // Use provided title, or generate one with timestamp for uniqueness
  const bookTitle = title && title.trim()
    ? title.trim()
    : `Book ${new Date().toLocaleDateString()}`;

  const { data, error } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      title: bookTitle,
      content: content || [],
      cover_url: coverUrl || null,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating book:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing book
 */
export const updateBook = async (bookId, { title, content, coverUrl }) => {
  const payload = {
    updated_at: new Date().toISOString()
  };

  if (title !== undefined) payload.title = title;
  if (content !== undefined) payload.content = content;
  if (coverUrl !== undefined) payload.cover_url = coverUrl;

  const { data, error } = await supabase
    .from('books')
    .update(payload)
    .eq('id', bookId)
    .select()
    .single();

  if (error) {
    console.error('Error updating book:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a book
 */
export const deleteBook = async (bookId) => {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }

  return true;
};

/**
 * Duplicate a book for a user
 */
export const duplicateBook = async (bookId, userId) => {
  // Fetch original
  const original = await fetchBook(bookId);
  if (!original) {
    throw new Error('Original book not found');
  }

  // Create copy
  return createBook(userId, {
    title: `${original.title || 'Untitled'} (Copy)`,
    content: original.content,
    coverUrl: original.cover_url
  });
};

// --- Save Helpers ---

/**
 * Extract URLs from fabricJSON (strips base64 for storage optimization)
 */
export const extractUrlsFromFabricJSON = (fabricJSON) => {
  if (!fabricJSON?.objects) return [];
  return fabricJSON.objects
    .filter(obj => obj.type === 'image' && obj.src && !obj.src.startsWith('data:'))
    .map(obj => obj.src);
};

/**
 * Prepare pages for storage (lightweight version without base64 textures)
 */
export const preparePagesForStorage = (pages) => {
  return pages.map(page => ({
    id: page.id,
    pageNumber: page.pageNumber,
    front: {
      fabricJSON: page.front?.fabricJSON || null,
      type: page.front?.type || 'page',
      urls: extractUrlsFromFabricJSON(page.front?.fabricJSON)
    },
    back: {
      fabricJSON: page.back?.fabricJSON || null,
      type: page.back?.type || 'page',
      urls: extractUrlsFromFabricJSON(page.back?.fabricJSON)
    }
  }));
};

/**
 * Get cover URL from pages (if it's a URL, not base64)
 */
export const extractCoverUrl = (pages) => {
  const coverTexture = pages[0]?.front?.texture;
  if (coverTexture && !coverTexture.startsWith('data:') && coverTexture.length < 500) {
    return coverTexture;
  }
  return null;
};

/**
 * Save book with optimized content (main save function)
 */
export const saveBook = async (userId, bookId, { pages, title }) => {
  const lightweightContent = preparePagesForStorage(pages);
  const coverUrl = extractCoverUrl(pages);

  if (bookId) {
    // Update existing
    return updateBook(bookId, {
      title,
      content: lightweightContent,
      coverUrl
    });
  } else {
    // Create new
    return createBook(userId, {
      title,
      content: lightweightContent,
      coverUrl
    });
  }
};

// --- Auth Operations ---

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (redirectUrl) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl || window.location.origin }
  });

  if (error) {
    console.error('Error signing in:', error);
    throw error;
  }

  return data;
};

/**
 * Sign out
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }

  return true;
};
