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
export const updateBook = async (userId, bookId, { title, content, coverUrl }) => {
  if (!userId || !bookId) {
    throw new Error('userId and bookId are required for update');
  }

  const payload = {
    updated_at: new Date().toISOString()
  };

  if (title !== undefined) payload.title = title;
  if (content !== undefined) payload.content = content;
  if (coverUrl !== undefined) payload.cover_url = coverUrl;

  // Include user_id in query to satisfy RLS and ensure ownership
  const { data, error } = await supabase
    .from('books')
    .update(payload)
    .eq('id', bookId)
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('Error updating book:', error);
    throw error;
  }

  // Check if any rows were updated
  if (!data || data.length === 0) {
    throw new Error('Book not found or you do not have permission to update it');
  }

  return data[0]; // Return first (and only) updated row
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
 * Prepare a page side for storage
 * - If fabricJSON exists and has content, save it (can reconstruct texture later)
 * - If no fabricJSON but texture exists, save the texture directly
 */
const prepareSideForStorage = (side) => {
  if (!side) return { type: 'page', fabricJSON: null, texture: null };

  const hasFabricContent = side.fabricJSON?.objects?.length > 0;

  if (hasFabricContent) {
    // Has fabricJSON with objects - save fabricJSON, can reconstruct texture
    return {
      fabricJSON: side.fabricJSON,
      type: side.type || 'page',
      urls: extractUrlsFromFabricJSON(side.fabricJSON)
    };
  } else if (side.texture) {
    // No fabricJSON but has texture - save the texture directly
    return {
      texture: side.texture,
      type: side.type || 'page',
      fabricJSON: null
    };
  } else {
    // Nothing to save
    return {
      type: side.type || 'page',
      fabricJSON: null,
      texture: null
    };
  }
};

/**
 * Prepare pages for storage
 */
export const preparePagesForStorage = (pages) => {
  if (!Array.isArray(pages)) return [];

  return pages.map(page => ({
    id: page.id,
    pageNumber: page.pageNumber,
    front: prepareSideForStorage(page.front),
    back: prepareSideForStorage(page.back)
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
  if (!userId) {
    throw new Error('User must be logged in to save');
  }

  const lightweightContent = preparePagesForStorage(pages);
  const coverUrl = extractCoverUrl(pages);

  // Debug logging
  console.log('Saving book:', {
    userId,
    bookId,
    title,
    pageCount: pages?.length,
    contentPageCount: lightweightContent?.length,
    firstPageHasContent: lightweightContent?.[0]?.front?.texture ? 'has texture' :
                         lightweightContent?.[0]?.front?.fabricJSON ? 'has fabricJSON' : 'empty'
  });

  if (bookId) {
    // Update existing - pass userId for RLS compliance
    return updateBook(userId, bookId, {
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
