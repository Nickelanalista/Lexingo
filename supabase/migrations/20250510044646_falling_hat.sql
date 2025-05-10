/*
  # Add book storage features
  
  1. Changes
    - Add cover_url and last_read columns to books table
    - Update existing rows with last_read timestamps
    - Create storage bucket for book covers if not exists
    - Set up storage policies with existence checks
  
  2. Security
    - Public read access for book covers
    - Authenticated users can manage their own book covers
*/

-- Add new columns to books table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE books ADD COLUMN cover_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'last_read'
  ) THEN
    ALTER TABLE books ADD COLUMN last_read timestamptz DEFAULT now();
  END IF;
END $$;

-- Update any existing rows
UPDATE books
SET last_read = created_at
WHERE last_read IS NULL;

-- Create storage bucket for book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies with existence checks
DO $$ 
BEGIN
  -- Public read access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Book covers are publicly accessible'
  ) THEN
    CREATE POLICY "Book covers are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'books');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload book covers'
  ) THEN
    CREATE POLICY "Users can upload book covers"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'books' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update own book covers'
  ) THEN
    CREATE POLICY "Users can update own book covers"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'books' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete own book covers'
  ) THEN
    CREATE POLICY "Users can delete own book covers"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'books' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;
END $$;