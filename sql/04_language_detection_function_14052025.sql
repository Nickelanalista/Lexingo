-- PASO 4: Función para detectar idioma automáticamente
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
    
    IF content ILIKE '% que %' OR content ILIKE '% con %' OR content ILIKE '% por %' OR content ILIKE '% para %' THEN
        spanish_score := spanish_score + 3;
    END IF;
    
    IF content ILIKE '% del %' OR content ILIKE '% una %' OR content ILIKE '% sus %' OR content ILIKE '% muy %' THEN
        spanish_score := spanish_score + 2;
    END IF;
    
    -- Contar palabras comunes en inglés
    IF content ILIKE '% the %' OR content ILIKE '% and %' OR content ILIKE '% for %' OR content ILIKE '% with %' THEN
        english_score := english_score + 5;
    END IF;
    
    IF content ILIKE '% this %' OR content ILIKE '% that %' OR content ILIKE '% have %' OR content ILIKE '% will %' THEN
        english_score := english_score + 3;
    END IF;
    
    IF content ILIKE '% his %' OR content ILIKE '% her %' OR content ILIKE '% him %' OR content ILIKE '% was %' THEN
        english_score := english_score + 2;
    END IF;
    
    -- Decidir el idioma
    IF spanish_score > english_score + 5 THEN
        RETURN 'es';
    ELSE
        RETURN 'en';
    END IF;
END;
$$ LANGUAGE plpgsql;