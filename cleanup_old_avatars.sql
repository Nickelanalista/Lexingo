-- Script para limpiar avatares antiguos grandes y optimizar el almacenamiento
-- Este script debe ejecutarse en el editor SQL de Supabase

-- 1. Ver los avatares almacenados y sus metadatos
SELECT 
    name,
    metadata,
    created_at,
    updated_at,
    (metadata->>'size')::bigint as size_bytes,
    CASE 
        WHEN (metadata->>'size')::bigint IS NOT NULL THEN
            ROUND((metadata->>'size')::bigint / 1024.0, 2)
        ELSE NULL 
    END as size_kb,
    CASE 
        WHEN (metadata->>'size')::bigint IS NOT NULL THEN
            ROUND((metadata->>'size')::bigint / 1024.0 / 1024.0, 2)
        ELSE NULL 
    END as size_mb
FROM storage.objects 
WHERE bucket_id = 'avatars' 
ORDER BY (metadata->>'size')::bigint DESC NULLS LAST;

-- 2. Encontrar avatares grandes (mayores a 500KB) que podrían necesitar optimización
SELECT 
    name,
    (metadata->>'size')::bigint as size_bytes,
    metadata->>'mimetype' as content_type,
    created_at,
    ROUND((metadata->>'size')::bigint / 1024.0, 2) as size_kb
FROM storage.objects 
WHERE bucket_id = 'avatars' 
    AND (metadata->>'size')::bigint > 500000  -- Mayor a 500KB
ORDER BY (metadata->>'size')::bigint DESC;

-- 3. Encontrar avatares duplicados para el mismo usuario (mantener solo el más reciente)
WITH user_avatars AS (
    SELECT 
        name,
        (metadata->>'size')::bigint as size_bytes,
        metadata->>'mimetype' as content_type,
        created_at,
        -- Extraer user_id del nombre del archivo (formato: user_id/timestamp_avatar.ext)
        SPLIT_PART(name, '/', 1) as user_id,
        ROW_NUMBER() OVER (
            PARTITION BY SPLIT_PART(name, '/', 1) 
            ORDER BY created_at DESC
        ) as rn
    FROM storage.objects 
    WHERE bucket_id = 'avatars'
        AND name LIKE '%/%'  -- Asegurar que tiene el formato user_id/filename
)
SELECT 
    name,
    user_id,
    size_bytes,
    ROUND(size_bytes / 1024.0, 2) as size_kb,
    created_at,
    rn
FROM user_avatars 
WHERE rn > 1  -- Avatares antiguos que pueden ser eliminados
ORDER BY user_id, created_at DESC;

-- 4. (OPCIONAL) Eliminar avatares antiguos duplicados - ¡CUIDADO! Esto eliminará archivos permanentemente
-- Descomenta estas líneas solo si estás seguro de ejecutar la limpieza:
/*
DELETE FROM storage.objects 
WHERE bucket_id = 'avatars' 
    AND name IN (
        WITH user_avatars AS (
            SELECT 
                name,
                SPLIT_PART(name, '/', 1) as user_id,
                ROW_NUMBER() OVER (
                    PARTITION BY SPLIT_PART(name, '/', 1) 
                    ORDER BY created_at DESC
                ) as rn
            FROM storage.objects 
            WHERE bucket_id = 'avatars'
                AND name LIKE '%/%'
        )
        SELECT name 
        FROM user_avatars 
        WHERE rn > 1
    );
*/

-- 5. Ver el ahorro total después de la limpieza (ejecutar después del paso 4)
/*
SELECT 
    COUNT(*) as total_avatars,
    SUM(size) as total_size_bytes,
    ROUND(SUM(size) / 1024.0 / 1024.0, 2) as total_size_mb,
    AVG(size) as avg_size_bytes,
    ROUND(AVG(size) / 1024.0, 2) as avg_size_kb
FROM storage.objects 
WHERE bucket_id = 'avatars';
*/

-- 6. Crear una función para limpiar avatares antiguos automáticamente (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Eliminar avatares antiguos, manteniendo solo el más reciente por usuario
    WITH user_avatars AS (
        SELECT 
            id,
            name,
            SPLIT_PART(name, '/', 1) as user_id,
            ROW_NUMBER() OVER (
                PARTITION BY SPLIT_PART(name, '/', 1) 
                ORDER BY created_at DESC
            ) as rn
        FROM storage.objects 
        WHERE bucket_id = 'avatars'
            AND name LIKE '%/%'
    ),
    to_delete AS (
        SELECT id
        FROM user_avatars 
        WHERE rn > 1
    )
    DELETE FROM storage.objects 
    WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- 7. Crear un trigger para limpiar avatares antiguos automáticamente cuando se suba uno nuevo (opcional)
CREATE OR REPLACE FUNCTION trigger_cleanup_old_avatars()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo ejecutar para el bucket de avatares
    IF NEW.bucket_id = 'avatars' AND NEW.name LIKE '%/%' THEN
        -- Eliminar avatares anteriores del mismo usuario
        DELETE FROM storage.objects 
        WHERE bucket_id = 'avatars' 
            AND name LIKE SPLIT_PART(NEW.name, '/', 1) || '/%'
            AND name != NEW.name
            AND created_at < NEW.created_at;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Activar el trigger (descomenta si quieres activar la limpieza automática)
/*
DROP TRIGGER IF EXISTS cleanup_old_avatars_trigger ON storage.objects;
CREATE TRIGGER cleanup_old_avatars_trigger
    AFTER INSERT ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_old_avatars();
*/