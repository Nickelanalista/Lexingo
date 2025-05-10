/*
  # Add bookmark functionality to books table

  1. Changes
    - Add `bookmarked` column to track if a book has a bookmark
    - Add `bookmark_page` column to store the bookmarked page number
    - Add `bookmark_position` column to store the scroll position within the page
    - Add `bookmark_updated_at` column to track when the bookmark was last updated

  2. Updates
    - Set default values for existing rows
*/

-- Add new columns for bookmark functionality
ALTER TABLE books
ADD COLUMN IF NOT EXISTS bookmarked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bookmark_page integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS bookmark_position integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookmark_updated_at timestamptz DEFAULT now();

-- Update any existing rows
UPDATE books
SET bookmark_page = current_page,
    bookmark_updated_at = last_read
WHERE bookmarked IS NULL;