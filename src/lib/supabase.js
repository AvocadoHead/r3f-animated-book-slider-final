import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- CRITICAL FIX: Added Auth Configuration ---
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true // This allows Supabase to grab the Google token from the URL
  }
})

// --- Helpers ---

// Fetch book content
export async function getBook(bookId) {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching book:', error)
    throw error
  }
}

// Fetch all books
export async function getBooks() {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching books:', error)
    throw error
  }
}

// Upload file to storage (Useful for images later!)
export async function uploadFile(bucket, file, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return publicUrl
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

// Get public URL for a file
export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

// Create a new book
export async function createBook(title, userId = null) {
  try {
    const { data, error } = await supabase
      .from('books')
      .insert([{ 
        title, 
        user_id: userId, 
        content: [], // Initialize with empty array or default
        updated_at: new Date()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating book:', error)
    throw error
  }
}

// NOTE: The updatePage and createPage helpers are legacy now.
// We save the entire book structure to the 'books' table 'content' column in UI.jsx.
