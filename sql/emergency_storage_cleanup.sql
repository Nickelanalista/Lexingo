-- ============================================
-- EMERGENCY STORAGE CLEANUP - LEXINGO
-- ============================================
-- Este script es para SOLUCIONAR INMEDIATAMENTE el problema
-- de las imágenes de portada que están consumiendo 5GB
-- ============================================

-- 1. ANÁLISIS INMEDIATO DEL PROBLEMA
-- ============================================

-- Ver EXACTAMENTE qué libros tienen portadas y cuándo se crearon
SELECT 
    id,
    title,
    cover_url,
    created_at,
    updated_at,
    user_id
FROM books 
WHERE cover_url IS NOT NULL
ORDER BY created_at DESC;

-- 2. SOLUCIÓN INMEDIATA - OPCIÓN 1 (CONSERVADORA)
-- ============================================
-- Eliminar solo las portadas de libros duplicados o de prueba
-- Mantiene los libros pero elimina las referencias a las imágenes grandes

-- Identificar libros que probablemente son duplicados de prueba:
SELECT 
    title,
    COUNT(*) as duplicates,
    array_agg(id ORDER BY created_at DESC) as book_ids
FROM books 
WHERE title ILIKE '%La_IA%' OR title ILIKE '%test%' OR title ILIKE '%prueba%'
GROUP BY title
HAVING COUNT(*) > 1;

-- Eliminar cover_url de libros duplicados de La_IA (mantener solo el más reciente):
UPDATE books 
SET cover_url = NULL 
WHERE title = 'La_IA' 
  AND id NOT IN (
    SELECT id 
    FROM books 
    WHERE title = 'La_IA' 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- 3. SOLUCIÓN INMEDIATA - OPCIÓN 2 (AGRESIVA)
-- ============================================
-- Si necesitas limpiar TODO inmediatamente para recuperar espacio

-- ELIMINACIÓN COMPLETA de libros duplicados de prueba:
-- ¡CUIDADO! Esto eliminará los libros completamente
/*
DELETE FROM books 
WHERE title = 'La_IA' 
  AND id NOT IN (
    SELECT id 
    FROM books 
    WHERE title = 'La_IA' 
    ORDER BY last_read DESC NULLS LAST, created_at DESC 
    LIMIT 1
  );
*/

-- ELIMINACIÓN de todas las portadas temporalmente (para recuperar espacio):
-- Esto mantendrá los libros pero eliminará todas las referencias a imágenes
-- Las nuevas subidas usarán el sistema optimizado
/*
UPDATE books 
SET cover_url = NULL 
WHERE cover_url IS NOT NULL;
*/

-- 4. VERIFICACIÓN POST-LIMPIEZA
-- ============================================

-- Ver qué queda después de la limpieza
SELECT 
    COUNT(*) as remaining_books,
    COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as books_with_covers,
    SUM(LENGTH(content)) as total_content_bytes,
    ROUND(SUM(LENGTH(content))::numeric / 1024, 2) as total_content_kb
FROM books;

-- Ver libros restantes
SELECT 
    id,
    title,
    cover_url IS NOT NULL as has_cover,
    LENGTH(content) as content_size,
    created_at,
    last_read
FROM books 
ORDER BY last_read DESC NULLS LAST, created_at DESC;

-- 5. LIMPIEZA DE METADATOS (OPCIONAL)
-- ============================================

-- Limpiar cualquier registro huérfano en otras tablas si existen
-- (Revisar primero si estas tablas existen en tu esquema)

-- Verificar si hay tablas relacionadas:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%book%' 
  OR table_name LIKE '%reading%';

-- ============================================
-- RECOMENDACIONES INMEDIATAS:
-- ============================================
-- 1. Ejecutar OPCIÓN 1 primero (conservadora)
-- 2. Si sigues con problemas de espacio, considerar OPCIÓN 2
-- 3. Las nuevas subidas usarán máximo ~50KB por portada
-- 4. Monitorear el dashboard de Supabase en las próximas horas
-- ============================================