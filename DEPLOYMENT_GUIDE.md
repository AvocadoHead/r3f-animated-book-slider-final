# 3D Book Application - Deployment Guide

## ✅ What's Working

- Beautiful 3D book rendering with page-turning animations
- Default book loads with 42 watercolor images
- Performance optimized
- Images display clearly (no opacity issues)

## 🔧 Setup Required

### 1. Supabase Database Setup

You need to run the database migration to create the `books` table:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the contents of `supabase_migration.sql`
5. Paste and run the SQL

This will create:
- `books` table with proper structure
- Row Level Security (RLS) policies
- Indexes for performance
- Auto-update triggers for `updated_at`

### 2. Google OAuth Setup (Already Configured)

Your Supabase project already has Google OAuth enabled with:
- Redirect URL: `https://the-3d-book.vercel.app/auth/callback`
- Environment variables are set in Vercel

## 📚 Features

### For All Users
- View and interact with the 3D book
- Turn pages with smooth animations
- Edit pages with the built-in editor
- Use the Book Builder to create books from URLs
- Reset/create new books

### For Authenticated Users (After Login)
- **Auto-save**: Books automatically save every 3 seconds
- **My Books (📚)**: View all your saved books
- **Save (💾)**: Manually save current book
- **Add Page (➕)**: Add new pages to your book
- **Load**: Open any of your saved books from the library
- **Delete**: Remove books you no longer need

## 🚀 How It Works

1. **First Visit**: Users see a default book with watercolor images
2. **Create Account**: Click "Sign In" → Sign in with Google
3. **Edit & Save**: Make changes, they auto-save to your account
4. **Manage Books**: Access "My Books" to create, load, or delete books
5. **Share**: Each book gets a unique URL (future feature)

## 🧪 Testing the Application

### Test Authentication Flow

1. Visit https://the-3d-book.vercel.app/
2. Click **"Sign In"** button (top-right)
3. Sign in with Google
4. You should see:
   - Your profile picture/avatar
   - Your email address
   - New buttons: 📚 (My Books), ➕ (Add Page), 💾 (Save)

### Test Book Management

1. **Create a Book**:
   - Edit some pages
   - Click 💾 to save manually (or wait 3 seconds for auto-save)

2. **View Your Library**:
   - Click 📚 "My Books"
   - See your saved book(s)

3. **Load a Book**:
   - In the library, click "Open" on any book
   - Book should load with all your saved content

4. **Delete a Book**:
   - Click 🗑️ next to any book in the library
   - Confirm deletion

### Test Book Building

1. Click **🪄 Book Builder**
2. Paste image URLs (one per line)
3. Choose items per page (1, 2, or 4)
4. Click "Build Book"
5. If logged in, it saves automatically!

## 📊 Database Schema

### `books` Table

| Column       | Type        | Description                          |
|-------------|-------------|--------------------------------------|
| id          | UUID        | Primary key                          |
| user_id     | UUID        | Foreign key to auth.users            |
| title       | TEXT        | Book title                           |
| content     | JSONB       | Full book data (pages, textures)     |
| cover_url   | TEXT        | URL to cover image (for thumbnails)  |
| created_at  | TIMESTAMPTZ | When book was created                |
| updated_at  | TIMESTAMPTZ | Last modification time               |

## 🔒 Security

- **Row Level Security (RLS)** ensures users can only access their own books
- OAuth tokens are handled securely by Supabase
- No sensitive data stored client-side
- All database operations require authentication

## 🎨 Similar to Gallery3D

This application follows the same pattern as your successful Gallery3D project:

| Feature              | Gallery3D | 3D Book |
|---------------------|-----------|---------|
| Google OAuth        | ✅        | ✅      |
| User Library        | ✅        | ✅      |
| Auto-save           | ✅        | ✅      |
| Load/Delete         | ✅        | ✅      |
| URL-based Content   | ✅        | ✅      |
| Share URLs          | ✅        | 🔄 Next |

## 🚧 Next Steps

1. **Share Functionality**: Generate shareable URLs for books
2. **Book Titles**: Allow users to edit book titles
3. **Search/Filter**: Search through your book library
4. **Export**: Download books as PDFs
5. **Collaboration**: Share books with other users

## 🐛 Troubleshooting

### OAuth Not Working
- Check that redirect URL in Supabase matches: `https://the-3d-book.vercel.app/auth/callback`
- Verify Google OAuth is enabled in Supabase Authentication settings
- Check browser console for errors

### Books Not Saving
- Run the `supabase_migration.sql` script
- Check browser console for database errors
- Verify you're logged in (see profile picture in top-right)

### Images Not Loading
- This was fixed by reverting to working version from Jan 10
- Original lighting values: ambient: 1.5, directional: 1.0
- Material settings: roughness: 0.8, metalness: 0.1

## 📝 Environment Variables

These should already be set in Vercel:

```
VITE_SUPABASE_URL=https://dgrnodqgldlhkiqlwpjw.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## ✨ Enjoy Your 3D Book Application!

Built with React Three Fiber, Jotai, Supabase, and lots of ❤️
