# Esquema de Base de Datos - Lexingo AI

## 🏗️ Configuración Supabase

### Conexión
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Variables de Entorno
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📊 Estructura de Tablas

### 1. `profiles` - Perfiles de Usuario
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_preferred_language ON profiles(preferred_language);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
```

### 2. `books` - Biblioteca de Libros
```sql
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT, -- JSON string con páginas
    current_page INTEGER DEFAULT 1,
    total_pages INTEGER DEFAULT 1,
    cover_url TEXT,
    last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Sistema de marcadores
    bookmarked BOOLEAN DEFAULT FALSE,
    bookmark_page INTEGER,
    bookmark_position INTEGER,
    bookmark_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- OCR Processing
    processed_with_ocr BOOLEAN DEFAULT FALSE,
    ocr_in_progress BOOLEAN DEFAULT FALSE,
    ocr_progress INTEGER DEFAULT 0,
    ocr_total INTEGER DEFAULT 0,
    
    -- Sistema de idiomas y traducción
    source_language TEXT DEFAULT 'en',
    display_language TEXT DEFAULT 'en',
    auto_translate BOOLEAN DEFAULT FALSE,
    translation_cached JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_last_read ON books(last_read DESC);
CREATE INDEX idx_books_source_language ON books(source_language);
CREATE INDEX idx_books_display_language ON books(display_language);
CREATE INDEX idx_books_bookmarked ON books(bookmarked) WHERE bookmarked = TRUE;

-- RLS Policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own books" ON books
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own books" ON books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books" ON books
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books" ON books
    FOR DELETE USING (auth.uid() = user_id);
```

### 3. `reading_progress` - Progreso de Lectura
```sql
CREATE TABLE reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL,
    last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0, -- Porcentaje 0-100
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicados
    UNIQUE(book_id, user_id)
);

-- Índices
CREATE INDEX idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_book_id ON reading_progress(book_id);
CREATE INDEX idx_reading_progress_last_read ON reading_progress(last_read DESC);

-- RLS Policies
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading progress" ON reading_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading progress" ON reading_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading progress" ON reading_progress
    FOR UPDATE USING (auth.uid() = user_id);
```

## 🔧 Funciones de Base de Datos

### Función de Detección de Idioma
```sql
CREATE OR REPLACE FUNCTION detect_book_language(content TEXT)
RETURNS TEXT AS $$
DECLARE
    spanish_score INTEGER := 0;
    english_score INTEGER := 0;
    spanish_chars TEXT[] := ARRAY['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'];
    char_element TEXT;
BEGIN
    -- Verificar que hay contenido
    IF content IS NULL OR length(content) < 50 THEN
        RETURN 'en';
    END IF;
    
    -- Contar caracteres especiales en español
    FOREACH char_element IN ARRAY spanish_chars
    LOOP
        IF content ILIKE '%' || char_element || '%' THEN
            spanish_score := spanish_score + 10;
        END IF;
    END LOOP;
    
    -- Contar palabras comunes en español
    IF content ILIKE '% el %' OR content ILIKE '% la %' OR content ILIKE '% los %' OR content ILIKE '% las %' THEN
        spanish_score := spanish_score + 5;
    END IF;
    
    -- Más lógica de detección...
    
    -- Decidir el idioma
    IF spanish_score > english_score + 5 THEN
        RETURN 'es';
    ELSE
        RETURN 'en';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Trigger para Updated At
```sql
-- Función genérica para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_progress_updated_at
    BEFORE UPDATE ON reading_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 📋 Queries Comunes

### Obtener Libros del Usuario
```sql
-- Libros recientes con progreso
SELECT 
    b.*,
    rp.progress,
    rp.last_read as progress_last_read
FROM books b
LEFT JOIN reading_progress rp ON b.id = rp.book_id
WHERE b.user_id = $1
ORDER BY b.last_read DESC;
```

### Actualizar Progreso de Lectura
```sql
-- Upsert de progreso
INSERT INTO reading_progress (book_id, user_id, current_page, progress)
VALUES ($1, $2, $3, $4)
ON CONFLICT (book_id, user_id)
DO UPDATE SET
    current_page = EXCLUDED.current_page,
    progress = EXCLUDED.progress,
    last_read = NOW(),
    updated_at = NOW();
```

### Buscar Libros por Idioma
```sql
SELECT *
FROM books
WHERE user_id = $1
AND source_language = $2
ORDER BY last_read DESC;
```

## 🔐 Seguridad (RLS)

### Políticas Principales
- **Aislamiento por usuario**: Cada usuario solo ve sus propios datos
- **Autenticación requerida**: Todas las operaciones requieren auth.uid()
- **Cascada en eliminación**: Eliminar usuario → elimina todos sus datos
- **Validación en inserción**: WITH CHECK previene inserción maliciosa

### Ejemplo de Policy
```sql
-- Solo permitir ver libros propios
CREATE POLICY "Users can view their own books" ON books
    FOR SELECT USING (auth.uid() = user_id);

-- Solo permitir actualizar libros propios
CREATE POLICY "Users can update their own books" ON books
    FOR UPDATE USING (auth.uid() = user_id);
```

## 📈 Optimizaciones

### Índices Estratégicos
- **Por usuario**: Todas las queries filtran por user_id
- **Por fecha**: Ordenamiento por last_read es común
- **Por idioma**: Filtros frecuentes por source_language
- **Marcadores**: Índice parcial para bookmarked = TRUE

### Cache y Performance
- **translation_cached (JSONB)**: Cache de traducciones por página
- **Índices compuestos**: Para queries complejas frecuentes
- **Partial indexes**: Para condiciones específicas (bookmarks)

## 🔄 Migraciones Aplicadas

### Historial de Cambios
1. **Inicial**: Tablas básicas (profiles, books, reading_progress)
2. **v2.0**: Campos de idioma (source_language, display_language)
3. **v2.1**: Sistema de traducción (auto_translate, translation_cached)
4. **v2.2**: Optimizaciones de índices
5. **v2.3**: Función de detección de idioma

### Scripts de Migración
Ubicados en: `sql/`
- `01_add_user_language_preferences_14052025.sql`
- `02_add_books_language_fields_14052025.sql`
- `03_create_indexes_14052025.sql`
- `04_language_detection_function_14052025.sql`
- `05_update_existing_books_14052025.sql`

## 🔍 Debugging y Monitoring

### Queries Útiles para Debug
```sql
-- Ver configuración de idioma por libro
SELECT title, source_language, display_language, auto_translate
FROM books
WHERE user_id = auth.uid()
ORDER BY updated_at DESC;

-- Estadísticas de traducción
SELECT 
    source_language,
    display_language,
    COUNT(*) as book_count
FROM books
WHERE user_id = auth.uid()
GROUP BY source_language, display_language;

-- Progreso general del usuario
SELECT 
    AVG(progress) as avg_progress,
    COUNT(*) as total_books,
    MAX(last_read) as last_activity
FROM reading_progress
WHERE user_id = auth.uid();
```

### Monitoreo de Performance
- **Slow queries**: Revisar queries > 100ms
- **Index usage**: Monitorear hit rate de índices
- **Connection pool**: Verificar conexiones activas
- **Storage**: Monitorear crecimiento de translation_cached