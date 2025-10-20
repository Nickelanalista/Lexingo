-- ============================================
-- LEXINGO STORAGE CLEANUP & OPTIMIZATION
-- ============================================
-- Este script ayuda a limpiar el almacenamiento excesivo
-- y monitorear el uso de Supabase Storage
-- ============================================

-- 1. ANÁLISIS DEL PROBLEMA ACTUAL
-- ============================================

-- Ver todos los libros y sus URLs de portada
SELECT 
    id,
    title,
    cover_url,
    LENGTH(content) as content_size_bytes,
    ROUND(LENGTH(content)::numeric / 1024, 2) as content_size_kb,
    created_at,
    updated_at,
    last_read
FROM books 
WHERE cover_url IS NOT NULL
ORDER BY created_at DESC;

-- Estadísticas de uso de contenido
SELECT 
    COUNT(*) as total_books,
    SUM(LENGTH(content)) as total_content_bytes,
    ROUND(SUM(LENGTH(content))::numeric / 1024 / 1024, 2) as total_content_mb,
    COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as books_with_covers,
    COUNT(CASE WHEN cover_url IS NULL THEN 1 END) as books_without_covers
FROM books;

-- 2. IDENTIFICAR ARCHIVOS DUPLICADOS O PROBLEMÁTICOS
-- ============================================

-- Buscar libros duplicados por título (que podrían tener múltiples portadas)
SELECT 
    title,
    COUNT(*) as count,
    array_agg(id) as book_ids,
    array_agg(cover_url) as cover_urls
FROM books 
GROUP BY title 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. LIMPIAR DATOS INNECESARIOS
-- ============================================

-- OPCIÓN A: Eliminar libros duplicados (mantener solo el más reciente por título)
-- ¡CUIDADO! Esto eliminará libros duplicados permanentemente
-- Descomenta solo si estás seguro:

/*
DELETE FROM books 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at DESC) as rn
        FROM books
    ) t 
    WHERE t.rn > 1
);
*/

-- OPCIÓN B: Limpiar solo los cover_url de libros duplicados (mantener el libro pero sin portada)
-- Esto es más seguro, solo elimina las referencias a las imágenes:

/*
UPDATE books 
SET cover_url = NULL 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at DESC) as rn
        FROM books
    ) t 
    WHERE t.rn > 1
);
*/

-- 4. OPTIMIZACIÓN DE ALMACENAMIENTO
-- ============================================

-- Agregar índices para mejorar rendimiento si no existen
CREATE INDEX IF NOT EXISTS idx_books_user_id_last_read ON books(user_id, last_read DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);

-- 5. MONITOREO FUTURO
-- ============================================

-- Query para monitorear el crecimiento de contenido
SELECT 
    DATE(created_at) as date,
    COUNT(*) as books_created,
    SUM(LENGTH(content)) as content_bytes_added,
    ROUND(SUM(LENGTH(content))::numeric / 1024 / 1024, 2) as content_mb_added,
    COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as covers_added
FROM books 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 6. INFORMACIÓN DE USUARIOS Y LIBROS
-- ============================================

-- Ver qué usuarios tienen más libros (para identificar uso excesivo)
SELECT 
    user_id,
    COUNT(*) as total_books,
    SUM(LENGTH(content)) as total_content_bytes,
    ROUND(SUM(LENGTH(content))::numeric / 1024 / 1024, 2) as total_content_mb,
    COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as books_with_covers,
    MAX(created_at) as last_book_created
FROM books 
GROUP BY user_id
ORDER BY total_content_bytes DESC;

-- ============================================
-- INSTRUCCIONES DE USO:
-- ============================================
-- 1. Ejecuta primero las queries de análisis (secciones 1-2)
-- 2. Revisa los resultados para entender el problema
-- 3. Si encuentras duplicados, decide si usar OPCIÓN A o B (sección 3)
-- 4. Ejecuta los índices de la sección 4
-- 5. Usa las queries de la sección 5 para monitoreo futuro
-- ============================================