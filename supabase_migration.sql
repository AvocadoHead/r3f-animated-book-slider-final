-- Supabase Migration for 3D Book Application
-- Run this in your Supabase SQL Editor

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Book',
  content JSONB NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS books_user_id_idx ON books(user_id);
CREATE INDEX IF NOT EXISTS books_updated_at_idx ON books(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own books
CREATE POLICY "Users can view their own books"
  ON books FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own books
CREATE POLICY "Users can insert their own books"
  ON books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own books
CREATE POLICY "Users can update their own books"
  ON books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own books
CREATE POLICY "Users can delete their own books"
  ON books FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_books_updated_at ON books;
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON books TO authenticated;
GRANT ALL ON books TO service_role;
