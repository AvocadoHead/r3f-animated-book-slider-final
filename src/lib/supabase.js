import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey), {
  auth: {
    storage: window.localStorage,    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}

// Fetch book with all pages
export async function getBook(bookId) {
  try {
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (bookError) throw bookError

    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('book_id', bookId)
      .order('page_number', { ascending: true })

    if (pagesError) throw pagesError

    return { ...book, pages }
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
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching books:', error)
    throw error
  }
}

// Upload file to storage
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
      .insert([{ title, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating book:', error)
    throw error
  }
}

// Update a page's content (Fabric.js JSON)
export async function updatePage(pageId, fabricJson) {
  try {
    const { data, error } = await supabase
      .from('pages')
      .update({ fabric_json: fabricJson, updated_at: new Date().toISOString() })
      .eq('id', pageId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating page:', error)
    throw error
  }
}

// Create a new page for a book
export async function createPage(bookId, pageNumber, fabricJson = null) {
  try {
    const { data, error } = await supabase
      .from('pages')
      .insert([{
        book_id: bookId,
        page_number: pageNumber,
        fabric_json: fabricJson
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating page:', error)
    throw error
  }
}
