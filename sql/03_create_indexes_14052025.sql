-- PASO 3: Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_books_source_language ON books(source_language);
CREATE INDEX IF NOT EXISTS idx_books_display_language ON books(display_language);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);