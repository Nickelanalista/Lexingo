-- Emergency Content Recovery Script
-- Created: 2025-01-09
-- Purpose: Backup valid books and prevent further content corruption

-- 1. Create backup table for emergency content preservation
CREATE TABLE IF NOT EXISTS books_backup_emergency AS 
SELECT 
    id,
    title,
    author,
    content,
    total_pages,
    current_page,
    created_at,
    updated_at,
    user_id,
    now() as backup_created_at,
    'emergency_backup' as backup_reason
FROM books 
WHERE 
    content IS NOT NULL 
    AND content != '[]' 
    AND length(content) > 500  -- More than just error message
    AND content NOT LIKE '%Este libro parece no tener contenido disponible%';

-- 2. Identify and mark corrupted books for investigation
UPDATE books 
SET 
    title = CONCAT('[CORRUPTED] ', title),
    updated_at = now()
WHERE 
    content LIKE '%Este libro parece no tener contenido disponible%'
    AND title NOT LIKE '[CORRUPTED]%';

-- 3. Create content validation function to prevent corruption
CREATE OR REPLACE FUNCTION validate_book_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent updates that would corrupt valid content
    IF OLD.content IS NOT NULL 
       AND length(OLD.content) > 500
       AND (NEW.content IS NULL 
            OR NEW.content = '[]' 
            OR NEW.content LIKE '%Este libro parece no tener contenido disponible%'
            OR length(NEW.content) < 500) THEN
        
        -- Log the corruption attempt
        INSERT INTO corruption_log (
            book_id,
            old_content_length,
            new_content_preview,
            attempted_at,
            blocked
        ) VALUES (
            OLD.id,
            length(OLD.content),
            left(NEW.content, 100),
            now(),
            true
        );
        
        -- Keep the old content instead of corrupting it
        NEW.content = OLD.content;
        NEW.total_pages = OLD.total_pages;
        
        RAISE WARNING 'Corruption attempt blocked for book %: %', OLD.title, OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create corruption log table
CREATE TABLE IF NOT EXISTS corruption_log (
    id SERIAL PRIMARY KEY,
    book_id TEXT,
    old_content_length INTEGER,
    new_content_preview TEXT,
    attempted_at TIMESTAMPTZ DEFAULT now(),
    blocked BOOLEAN DEFAULT false
);

-- 5. Create the trigger to prevent corruption
DROP TRIGGER IF EXISTS prevent_content_corruption ON books;
CREATE TRIGGER prevent_content_corruption
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION validate_book_content();

-- 6. Create function to restore from backup if needed
CREATE OR REPLACE FUNCTION restore_book_from_backup(book_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    backup_record RECORD;
    result BOOLEAN := false;
BEGIN
    SELECT * INTO backup_record 
    FROM books_backup_emergency 
    WHERE id = book_id_param;
    
    IF FOUND THEN
        UPDATE books 
        SET 
            content = backup_record.content,
            total_pages = backup_record.total_pages,
            title = REPLACE(title, '[CORRUPTED] ', ''),
            updated_at = now()
        WHERE id = book_id_param;
        
        result := true;
        RAISE NOTICE 'Book % restored from emergency backup', book_id_param;
    ELSE
        RAISE WARNING 'No backup found for book %', book_id_param;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Show summary of current situation
SELECT 
    'EMERGENCY BACKUP SUMMARY' as status,
    (SELECT COUNT(*) FROM books_backup_emergency) as books_backed_up,
    (SELECT COUNT(*) FROM books WHERE content LIKE '%Este libro parece no tener contenido disponible%') as corrupted_books,
    (SELECT COUNT(*) FROM books WHERE content IS NOT NULL AND length(content) > 500 AND content NOT LIKE '%Este libro parece no tener contenido disponible%') as valid_books_remaining;