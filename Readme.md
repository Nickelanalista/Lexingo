# Lexingo

Un lector de libros con traducción instantánea integrada para facilitar la lectura en idiomas extranjeros.

## Características

- Carga de documentos PDF, TXT, DOCX, HTML y más
- Traducción instantánea de palabras al hacer clic
- Resúmenes de capítulos generados por IA
- Modo nocturno para lectura cómoda
- Almacenamiento de progreso de lectura
- Marcadores para continuar donde lo dejaste
- **Nuevo: Procesamiento OCR local para documentos escaneados con Tesseract.js**

## Configuración

1. Clona el repositorio
2. Instala las dependencias con `npm install`
3. Crea un archivo `.env` basado en `.env.example` y configura las variables de entorno:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para Supabase
   - `VITE_OPENAI_API_KEY` para las traducciones
4. Inicia el servidor de desarrollo con `npm run dev`

## Procesamiento OCR

Lexingo ahora puede procesar documentos PDF que contienen principalmente imágenes o texto no seleccionable utilizando OCR (Reconocimiento Óptico de Caracteres):

- Detecta automáticamente cuando un PDF no contiene texto seleccionable
- Utiliza Tesseract.js para extraer el texto de las imágenes localmente en el navegador
- Distribuye el texto extraído en las páginas del documento
- Muestra un indicador cuando un documento ha sido procesado con OCR

Para utilizar esta función, simplemente carga cualquier tipo de PDF como lo harías normalmente. Lexingo detectará si necesita aplicar OCR y lo hará automáticamente.

## Tecnologías

- React + TypeScript
- Tailwind CSS
- PDF.js para procesamiento de PDF
- Supabase para backend y almacenamiento
- OpenAI para traducciones
- Tesseract.js para OCR local
