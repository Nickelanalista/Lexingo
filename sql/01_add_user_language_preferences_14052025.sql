-- Migración para mejorar el manejo de idiomas y preferencias del usuario
-- Fecha: 14/05/2025
-- EJECUTAR PASO A PASO EN SUPABASE SQL EDITOR

-- PASO 1: Agregar campo preferred_language a la tabla profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE profiles ADD COLUMN preferred_language TEXT DEFAULT 'en';
    END IF;
END $$;