-- PASO 5: Actualizar libros existentes con detección de idioma
-- Ejecutar después de crear la función detect_book_language

UPDATE books 
SET source_language = detect_book_language(LEFT(content, 1000))
WHERE content IS NOT NULL 
AND length(content) > 100 
AND (source_language IS NULL OR source_language = 'en');

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN books.source_language IS 'Idioma original/detectado del contenido del libro';
COMMENT ON COLUMN books.display_language IS 'Idioma en el que el usuario quiere leer el libro';
COMMENT ON COLUMN books.auto_translate IS 'Si debe aplicar traducción automática según preferencias del usuario';
COMMENT ON COLUMN books.translation_cached IS 'Cache de traducciones por página para evitar retraducciones';
COMMENT ON COLUMN profiles.preferred_language IS 'Idioma preferido del usuario para traducir contenido';