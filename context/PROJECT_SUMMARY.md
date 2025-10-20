# Lexingo AI - Resumen Completo del Proyecto

## 🚀 Descripción General
**Lexingo AI** es un lector de libros inteligente que permite traducción en tiempo real mientras lees. Los usuarios pueden subir libros en cualquier idioma y leerlos traducidos al idioma de su preferencia, con capacidad de hacer clic en palabras para obtener traducciones instantáneas al español.

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS + Lucide React Icons
- **Backend**: Netlify Functions (Serverless)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Hosting**: Netlify
- **PDF Processing**: PDF.js + Tesseract.js (OCR)
- **Traducciones**: APIs externas via Netlify Functions

### Estructura del Proyecto
```
src/
├── components/        # Componentes React
├── context/          # Context Providers (BookContext, ThemeContext)
├── hooks/            # Custom hooks
├── lib/              # Configuraciones (Supabase)
├── pages/            # Páginas principales
├── services/         # Servicios externos
└── types/            # Definiciones TypeScript

netlify/functions/    # Funciones serverless
public/               # Assets estáticos
sql/                 # Migraciones de base de datos
```

## 💾 Base de Datos (Supabase)

### Tablas Principales

#### `profiles`
```sql
- id: uuid (Primary Key)
- email: text
- name: text 
- avatar_url: text
- preferred_language: text (idioma preferido del usuario)
- created_at, updated_at: timestamp
```

#### `books` 
```sql
- id: uuid (Primary Key)
- title: text
- user_id: uuid (Foreign Key → profiles.id)
- content: text (JSON con páginas)
- current_page: integer
- total_pages: integer
- cover_url: text
- last_read: timestamp
- bookmarked: boolean
- bookmark_page: integer
- bookmark_position: integer
- bookmark_updated_at: timestamp
- processed_with_ocr: boolean
- ocr_in_progress: boolean
- ocr_progress: integer
- ocr_total: integer
- source_language: text (idioma original del libro)
- display_language: text (idioma en que se muestra)
- auto_translate: boolean
- translation_cached: jsonb (cache de traducciones)
- created_at, updated_at: timestamp
```

#### `reading_progress`
```sql
- id: uuid (Primary Key)
- book_id: uuid (Foreign Key → books.id)
- user_id: uuid (Foreign Key → profiles.id)
- current_page: integer
- last_read: timestamp
- progress: integer (porcentaje)
- created_at, updated_at: timestamp
```

## 🔧 Funcionalidades Principales

### 1. **Sistema de Autenticación**
- Login/Registro con Supabase Auth
- Gestión de perfiles de usuario
- Avatar personalizable
- Preferencias de idioma persistentes

### 2. **Gestión de Libros**
- **Subida de archivos**: PDF, EPUB, TXT, DOCX
- **Procesamiento OCR**: Tesseract.js para PDFs escaneados
- **Biblioteca personal**: Almacenamiento en Supabase
- **Biblioteca comunitaria**: Libros preseleccionados
- **Progreso de lectura**: Persistencia automática
- **Sistema de marcadores**: Guardado de posición específica

### 3. **Traducción Inteligente**
- **Detección automática de idioma** del libro
- **Traducción de página completa** según preferencias
- **Traducción de palabras individuales** al hacer clic
- **Persistencia de configuración** por libro
- **Cache de traducciones** para optimizar rendimiento

### 4. **Lector Avanzado**
- **Interfaz responsive** optimizada para móvil y desktop
- **Scroll independiente** con header fijo
- **Navegación por páginas** con indicador de progreso
- **Modo pantalla completa**
- **Ajuste de tamaño de fuente**
- **Tema claro/oscuro**
- **Detección de páginas vacías** y navegación inteligente

### 5. **IA Integrada**
- **Chat con IA** sobre el contenido del libro
- **Consultas contextuales** sobre la página actual
- **Asistente de lectura** inteligente

## 🌐 API y Funciones Serverless

### Netlify Functions
1. **`translate-word.js`**: Traducción de palabras individuales
2. **`translate-paragraph.js`**: Traducción de párrafos completos
3. **`text-to-speech.js`**: Conversión texto a voz
4. **`speech-to-text.js`**: Transcripción de audio
5. **`ai-chat.js`**: Chat con IA sobre el contenido
6. **`extract-text-image.js`**: OCR para imágenes
7. **`debug-env.js`**: Utilidad de debugging

## 🎨 Interfaz de Usuario

### Páginas Principales
- **Landing**: Página de bienvenida no autenticada
- **Home**: Dashboard con libros recientes, biblioteca personal y comunitaria
- **Reader**: Lector principal con todas las funcionalidades
- **Upload**: Subida y procesamiento de libros
- **Books**: Gestión de biblioteca personal
- **Profile**: Configuración de perfil y avatar
- **Settings**: Preferencias de idioma, tema y fuente

### Componentes Clave
- **ModernBookCard**: Tarjetas de libros con progreso
- **ModernBookCarousel**: Carrusel de libros por categorías
- **Reader**: Componente principal de lectura
- **WordTooltip**: Tooltip de traducción de palabras
- **ReaderControls**: Controles de navegación y configuración
- **NavigationBar**: Barra de navegación principal

## 🔄 Flujo de Traducción

### Proceso Principal
1. **Detección de idioma**: Análisis automático del contenido del libro
2. **Configuración persistente**: Guardado en `books.source_language` y `books.display_language`
3. **Traducción automática**: Al abrir, si idiomas difieren
4. **Cache de traducciones**: Almacenamiento en `books.translation_cached`
5. **Traducción de palabras**: Al hacer clic → siempre al español

### Lógica de Idiomas
- **Idioma fuente**: Detectado automáticamente del contenido
- **Idioma de visualización**: Seleccionado por el usuario (bandera)
- **Idioma de traducciones**: Siempre español para palabras individuales
- **Persistencia**: Configuración guardada por libro

## 📱 Optimizaciones Móviles

### Características Responsive
- **Header fijo** que no interfiere con el scroll
- **Scroll optimizado** con `-webkit-overflow-scrolling: touch`
- **Logo centrado** en móvil, izquierda en desktop
- **Padding adaptativo** para diferentes tamaños de pantalla
- **Touch scrolling** suave y natural
- **Navegación móvil** en la parte inferior

### Performance
- **Lazy loading** de imágenes
- **Scroll virtual** para listas largas
- **Cache de traducciones** para evitar re-traducciones
- **Persistencia local** con localStorage y sessionStorage

## 🛠️ Configuración de Desarrollo

### Variables de Entorno
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Scripts Principales
```bash
npm run dev      # Desarrollo local
npm run build    # Build de producción
npm run lint     # Linting del código
npm run preview  # Preview de build
```

### Deployment
- **Frontend**: Netlify (SPA con redirects)
- **Functions**: Netlify Functions (automático)
- **Base de datos**: Supabase (hosted)
- **Assets**: Netlify CDN

## 🔒 Seguridad

### Row Level Security (RLS)
- **Políticas de acceso** por usuario en todas las tablas
- **Autenticación requerida** para todas las operaciones
- **Aislamiento de datos** por usuario
- **Validación de permisos** en el frontend y backend

### Mejores Prácticas
- **No exposición de secrets** en el frontend
- **Sanitización** de inputs de usuario
- **Validación** de tipos de archivo
- **Rate limiting** en las funciones serverless

## 📊 Métricas y Seguimiento

### Analytics
- **Progreso de lectura** por usuario y libro
- **Tiempo de sesión** de lectura
- **Libros más populares** en la comunidad
- **Uso de traducciones** por idioma

### Logging
- **Estados de traducción** con console.log detallado
- **Errores de OCR** y procesamiento
- **Performance** de APIs externas
- **Debugging** de flujos de usuario

## 🚀 Futuras Mejoras

### Posibles Implementaciones
- **Sincronización offline** para libros descargados
- **Notas y highlights** en el texto
- **Compartir fragmentos** traducidos
- **Estadísticas de aprendizaje** de idiomas
- **Integración con más fuentes** de libros
- **Mejoras en OCR** con modelos más avanzados
- **Soporte para más formatos** de archivo