-- 001_fix_last_read_ordering.sql
-- Script para arreglar el problema del último libro leído no apareciendo en el inicio

-- 1. Verificar el estado actual de last_read en los libros
SELECT 
    id, 
    title, 
    current_page,
    last_read,
    created_at,
    updated_at,
    CASE 
        WHEN last_read IS NULL THEN 'NULL'
        ELSE 'HAS_VALUE'
    END as last_read_status
FROM books 
WHERE user_id = (SELECT auth.uid())
ORDER BY 
    CASE WHEN last_read IS NULL THEN 1 ELSE 0 END,
    last_read DESC NULLS LAST
LIMIT 10;

-- 2. Actualizar books que tienen current_page > 1 pero last_read es NULL
-- Esto probablemente significa que se leyeron pero no se actualizó last_read
UPDATE books 
SET 
    last_read = updated_at,
    updated_at = NOW()
WHERE user_id = (SELECT auth.uid())
    AND last_read IS NULL 
    AND current_page > 1;

-- 3. Para libros que nunca se han leído (current_page = 1 o NULL), 
-- establecer last_read a la fecha de creación si es NULL
UPDATE books 
SET 
    last_read = created_at,
    updated_at = NOW()
WHERE user_id = (SELECT auth.uid())
    AND last_read IS NULL 
    AND (current_page IS NULL OR current_page = 1);

-- 4. Verificar que todos los libros ahora tienen last_read
SELECT 
    COUNT(*) as total_books,
    COUNT(last_read) as books_with_last_read,
    COUNT(*) - COUNT(last_read) as books_without_last_read
FROM books 
WHERE user_id = (SELECT auth.uid());

-- 5. Mostrar los libros ordenados correctamente después de la corrección
SELECT 
    id, 
    title, 
    current_page,
    last_read,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - last_read)) / 86400 as days_ago
FROM books 
WHERE user_id = (SELECT auth.uid())
ORDER BY last_read DESC NULLS LAST
LIMIT 10;

-- 6. Crear función para asegurar que last_read siempre tenga valor al insertar
CREATE OR REPLACE FUNCTION ensure_last_read()
RETURNS TRIGGER AS $$
BEGIN
    -- Si last_read es NULL al insertar, usar created_at
    IF NEW.last_read IS NULL THEN
        NEW.last_read = COALESCE(NEW.created_at, NOW());
    END IF;
    
    -- Si current_page cambia y no es NULL, actualizar last_read
    IF TG_OP = 'UPDATE' AND OLD.current_page IS DISTINCT FROM NEW.current_page THEN
        IF NEW.current_page IS NOT NULL AND NEW.current_page > 0 THEN
            NEW.last_read = NOW();
            NEW.updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Aplicar el trigger a la tabla books
DROP TRIGGER IF EXISTS trigger_ensure_last_read ON books;
CREATE TRIGGER trigger_ensure_last_read
    BEFORE INSERT OR UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION ensure_last_read();

-- 8. Verificar que el trigger funciona correctamente
-- (Esta query es solo informativa, mostrará los triggers activos)
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'books' 
    AND trigger_name = 'trigger_ensure_last_read';