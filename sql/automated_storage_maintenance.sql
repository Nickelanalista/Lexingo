-- ============================================
-- AUTOMATED STORAGE MAINTENANCE - LEXINGO
-- ============================================
-- Script para mantenimiento automático y prevención 
-- de problemas futuros de almacenamiento
-- ============================================

-- 1. CREAR FUNCIÓN DE LIMPIEZA AUTOMÁTICA
-- ============================================

-- Función para limpiar libros duplicados automáticamente
CREATE OR REPLACE FUNCTION cleanup_duplicate_books()
RETURNS TABLE(
    deleted_count INTEGER,
    cleanup_details TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_records INTEGER := 0;
    duplicate_titles TEXT[];
BEGIN
    -- Encontrar títulos duplicados
    SELECT array_agg(DISTINCT title) INTO duplicate_titles
    FROM books
    GROUP BY title
    HAVING COUNT(*) > 1;
    
    -- Eliminar duplicados (mantener solo el más reciente por título)
    WITH duplicates_to_delete AS (
        SELECT id
        FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY title ORDER BY last_read DESC NULLS LAST, created_at DESC) as rn
            FROM books
        ) ranked
        WHERE rn > 1
    )
    DELETE FROM books 
    WHERE id IN (SELECT id FROM duplicates_to_delete);
    
    GET DIAGNOSTICS deleted_records = ROW_COUNT;
    
    RETURN QUERY SELECT 
        deleted_records,
        CASE 
            WHEN deleted_records > 0 THEN format('Eliminados %s libros duplicados', deleted_records)
            ELSE 'No se encontraron duplicados'
        END;
END;
$$;

-- 2. CREAR FUNCIÓN DE MONITOREO DE ALMACENAMIENTO
-- ============================================

CREATE OR REPLACE FUNCTION storage_usage_report()
RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT,
    status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    total_books INTEGER;
    books_with_covers INTEGER;
    total_content_mb NUMERIC;
    avg_content_per_book NUMERIC;
BEGIN
    -- Obtener métricas básicas
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END),
        ROUND(SUM(LENGTH(content))::numeric / 1024 / 1024, 2),
        ROUND(AVG(LENGTH(content))::numeric / 1024, 2)
    INTO total_books, books_with_covers, total_content_mb, avg_content_per_book
    FROM books;
    
    -- Retornar métricas
    RETURN QUERY VALUES
        ('Total Books', total_books::TEXT, 
         CASE WHEN total_books > 100 THEN 'HIGH' WHEN total_books > 50 THEN 'MEDIUM' ELSE 'OK' END),
        ('Books with Covers', books_with_covers::TEXT,
         CASE WHEN books_with_covers > 50 THEN 'HIGH' WHEN books_with_covers > 20 THEN 'MEDIUM' ELSE 'OK' END),
        ('Total Content (MB)', total_content_mb::TEXT,
         CASE WHEN total_content_mb > 100 THEN 'HIGH' WHEN total_content_mb > 50 THEN 'MEDIUM' ELSE 'OK' END),
        ('Avg Content per Book (KB)', avg_content_per_book::TEXT,
         CASE WHEN avg_content_per_book > 1000 THEN 'HIGH' WHEN avg_content_per_book > 500 THEN 'MEDIUM' ELSE 'OK' END);
END;
$$;

-- 3. CREAR TRIGGER PARA PREVENIR ACUMULACIÓN
-- ============================================

-- Función que se ejecuta antes de insertar un nuevo libro
CREATE OR REPLACE FUNCTION prevent_excessive_storage()
RETURNS TRIGGER AS $$
DECLARE
    user_book_count INTEGER;
    user_content_size NUMERIC;
BEGIN
    -- Contar libros del usuario
    SELECT COUNT(*), SUM(LENGTH(content))
    INTO user_book_count, user_content_size
    FROM books 
    WHERE user_id = NEW.user_id;
    
    -- Límites por usuario (ajustables)
    IF user_book_count >= 50 THEN
        RAISE EXCEPTION 'Usuario ha alcanzado el límite máximo de libros (50). Elimine libros antiguos.';
    END IF;
    
    -- Si el contenido es demasiado grande (>10MB por usuario)
    IF COALESCE(user_content_size, 0) + LENGTH(COALESCE(NEW.content, '')) > 10485760 THEN
        RAISE EXCEPTION 'Usuario ha alcanzado el límite de contenido (10MB). Elimine libros antiguos.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger (descomenta para activar límites automáticos)
-- DROP TRIGGER IF EXISTS storage_limit_trigger ON books;
-- CREATE TRIGGER storage_limit_trigger
--     BEFORE INSERT ON books
--     FOR EACH ROW
--     EXECUTE FUNCTION prevent_excessive_storage();

-- 4. QUERIES DE MANTENIMIENTO REGULAR
-- ============================================

-- Query para ejecutar semanalmente - limpiar libros muy antiguos sin actividad
-- (Solo si no se han leído en más de 30 días)
/*
DELETE FROM books 
WHERE last_read < NOW() - INTERVAL '30 days' 
  OR (last_read IS NULL AND created_at < NOW() - INTERVAL '7 days');
*/

-- Query para limpiar portadas de libros no leídos recientemente
/*
UPDATE books 
SET cover_url = NULL 
WHERE (last_read < NOW() - INTERVAL '30 days' OR last_read IS NULL)
  AND cover_url IS NOT NULL;
*/

-- 5. SCRIPTS DE MONITOREO
-- ============================================

-- Ejecutar reporte de uso de almacenamiento
-- SELECT * FROM storage_usage_report();

-- Ejecutar limpieza de duplicados
-- SELECT * FROM cleanup_duplicate_books();

-- Ver usuarios con más consumo
-- SELECT 
--     user_id,
--     COUNT(*) as books_count,
--     ROUND(SUM(LENGTH(content))::numeric / 1024 / 1024, 2) as content_mb,
--     COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as covers_count
-- FROM books
-- GROUP BY user_id
-- ORDER BY content_mb DESC;

-- ============================================
-- INSTRUCCIONES DE USO:
-- ============================================
-- 1. Ejecuta este script para crear las funciones de mantenimiento
-- 2. Programa ejecución semanal de: SELECT * FROM cleanup_duplicate_books();
-- 3. Monitorea regularmente con: SELECT * FROM storage_usage_report();
-- 4. Descomenta el trigger si quieres límites automáticos por usuario
-- 5. Ajusta los límites según tu plan de Supabase
-- ============================================