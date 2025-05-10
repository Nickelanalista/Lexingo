/*
  # Add metadata fields to books table
  
  1. Changes
    - Add cover_url column for book covers
    - Add last_read column to track reading activity
    - Add created_at and updated_at timestamps
  
  2. Updates
    - Update existing rows with default values
*/

-- Add new columns to books table
ALTER TABLE books
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS last_read timestamptz DEFAULT now();

-- Update any existing rows
UPDATE books
SET last_read = created_at
WHERE last_read IS NULL;

-- Create storage bucket for book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for book covers
CREATE POLICY "Book covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'books');

CREATE POLICY "Users can upload book covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'books' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update own book covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'books' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own book covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'books' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);