-- PASO 2: Agregar campos de configuración de idioma por libro
DO $$
BEGIN
    -- Agregar source_language
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'source_language'
    ) THEN
        ALTER TABLE books ADD COLUMN source_language TEXT DEFAULT 'en';
    END IF;
    
    -- Agregar display_language  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'display_language'
    ) THEN
        ALTER TABLE books ADD COLUMN display_language TEXT DEFAULT 'en';
    END IF;
    
    -- Agregar auto_translate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'auto_translate'
    ) THEN
        ALTER TABLE books ADD COLUMN auto_translate BOOLEAN DEFAULT false;
    END IF;
    
    -- Agregar translation_cached
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'books' AND column_name = 'translation_cached'
    ) THEN
        ALTER TABLE books ADD COLUMN translation_cached JSONB DEFAULT '{}';
    END IF;
END $$;