import React, { useState, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Book, BookPage } from '../types';
import { useBookContext } from '../context/BookContext';
import { useOCR } from '../context/OCRContext';
import { supabase } from '../lib/supabase';
import { tesseractOcrService } from '../services/tesseractOcr';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const useFileProcessor = () => {
  const { setBook, setIsLoading } = useBookContext();
  const { setOCRState } = useOCR();
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  
  // Referencia al objeto de libro actual para actualizarlo durante el procesamiento
  const currentBookRef = useRef<Book | null>(null);
  const ocrCancelledRef = useRef<boolean>(false);

  // Función para generar texto de relleno para cuando el OCR falla
  const generatePlaceholderText = (pageNumber: number, totalPages: number): string => {
    if (pageNumber === 1) {
      return `Esta es una versión de texto extraída de un PDF escaneado. El OCR no pudo procesar correctamente el contenido original. 

Puede que veas este mensaje porque:
1. El archivo PDF contiene principalmente imágenes
2. El texto no es seleccionable en el documento original
3. Hubo un problema con el servicio de OCR

Puedes seguir navegando por las páginas utilizando los controles de navegación, pero el texto mostrado es un marcador de posición.

Página ${pageNumber} de ${totalPages}`;
    } else {
      return `[Contenido de la página ${pageNumber}]

Esta página es parte de un PDF escaneado que no pudo ser procesado correctamente por OCR.

El archivo original puede contener imágenes, gráficos o texto no seleccionable.

Página ${pageNumber} de ${totalPages}`;
    }
  };

  const processPDF = async (file: File): Promise<Book | null> => {
    try {
      console.log(`🔍 [PDF PROCESSOR] Iniciando procesamiento de: ${file.name} (${Math.round(file.size/1024)}KB)`);
      
      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log(`📁 [PDF PROCESSOR] ArrayBuffer creado: ${arrayBuffer.byteLength} bytes`);
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log(`📖 [PDF PROCESSOR] PDF cargado exitosamente`);
      
      const totalPages = pdf.numPages;
      const pages: BookPage[] = [];
      let coverImageUrl = null;
      
      console.log(`📊 [PDF PROCESSOR] PDF tiene ${totalPages} páginas`);
      
      // Get the first page for the cover with optimized size
      console.log(`🖼️ [PDF PROCESSOR] Generando portada optimizada...`);
      const firstPage = await pdf.getPage(1);
      
      // Calculate optimal scale for 400px max width (good balance between quality and size)
      const baseViewport = firstPage.getViewport({ scale: 1.0 });
      const targetMaxWidth = 400;
      const targetMaxHeight = 600;
      
      let scale = Math.min(
        targetMaxWidth / baseViewport.width,
        targetMaxHeight / baseViewport.height
      );
      
      // Ensure minimum quality (don't go below 0.2 scale)
      scale = Math.max(0.2, scale);
      
      const viewport = firstPage.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await firstPage.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      console.log(`✅ [PDF PROCESSOR] Portada optimizada generada (${canvas.width}x${canvas.height}, scale: ${scale.toFixed(2)})`);
      
      // Convert canvas to blob with higher compression
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.5);
      });
      
      // Upload optimized cover to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const fileName = `${user.id}/${Date.now()}-cover-opt.jpg`;
          const fileSizeKB = Math.round(blob.size / 1024);
          console.log(`📤 [STORAGE] Subiendo portada optimizada (${fileSizeKB}KB)`);
          
          const { data, error: uploadError } = await supabase.storage
            .from('books')
            .upload(fileName, blob);
            
          if (uploadError) {
            console.error('❌ [STORAGE] Error al subir la portada:', uploadError);
          } else if (data) {
            const { data: { publicUrl } } = supabase.storage
              .from('books')
              .getPublicUrl(fileName);
            coverImageUrl = publicUrl;
            console.log(`✅ [STORAGE] Portada subida exitosamente (${fileSizeKB}KB)`);
          }
        } catch (storageError) {
          console.error('Error al procesar la portada:', storageError);
          // Continuar sin portada en caso de error
        }
      }
      
      // 🚀 NUEVA ESTRATEGIA SIMPLE: Extraer TODO el texto primero
      console.log(`🚀 [TEXT EXTRACTION] Estrategia "caballo de feria": Extrayendo TODO el texto directamente...`);
      
      let totalTextLength = 0;
      let pagesWithText = 0;
      let totalEmptyPages = 0;
      
      // Extraer texto de TODAS las páginas de una vez
      for (let i = 1; i <= totalPages; i++) {
        console.log(`📄 [TEXT EXTRACTION] Procesando página ${i}/${totalPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        console.log(`🔍 [TEXT EXTRACTION] Página ${i}: textContent object:`, {
          items: textContent.items?.length,
          style: textContent.styles ? Object.keys(textContent.styles).length : 0
        });
        
        // Extracción más robusta de texto
        const textItems = textContent.items || [];
        console.log(`🔍 [TEXT EXTRACTION] Página ${i}: Processing ${textItems.length} text items`);
        
        const pageText = textItems
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any) => {
            const text = item.str || '';
            console.log(`🔍 [TEXT EXTRACTION] Página ${i}: Item text: "${text}"`);
            return text;
          })
          .filter(text => text.trim().length > 0)
          .join(' ')
          .trim();
        
        console.log(`🔍 [TEXT EXTRACTION] Página ${i}: Final joined text: "${pageText}"`);
        
        // Estadísticas mejoradas con más detalle
        console.log(`🔍 [TEXT EXTRACTION] Página ${i}: Contenido bruto: ${textContent.items?.length || 0} items`);
        
        // Debug más detallado de los items
        if (textContent.items && textContent.items.length > 0) {
          console.log(`🔍 [TEXT EXTRACTION] Página ${i}: Items sample:`, textContent.items.slice(0, 5).map((item: any) => ({
            str: item.str,
            transform: item.transform,
            hasEOL: item.hasEOL,
            width: item.width,
            height: item.height
          })));
        }
        
        console.log(`🔍 [TEXT EXTRACTION] Página ${i}: Texto extraído: "${pageText}" (${pageText.length} chars)`);
        
        if (pageText && pageText.length >= 20) {
          totalTextLength += pageText.length;
          pagesWithText++;
          console.log(`✅ [TEXT EXTRACTION] Página ${i}: ${pageText.length} caracteres extraídos - VÁLIDA`);
          if (pageText.length > 0 && i <= 10) {
            console.log(`📖 [TEXT EXTRACTION] Preview P${i}: "${pageText.substring(0, 200)}${pageText.length > 200 ? '...' : ''}"`);
          }
        } else if (pageText && pageText.length > 0) {
          console.log(`⚠️ [TEXT EXTRACTION] Página ${i}: ${pageText.length} caracteres extraídos - DEMASIADO CORTO (mínimo 20)`);
          console.log(`📝 [TEXT EXTRACTION] Contenido corto P${i}: "${pageText}"`);
        } else {
          totalEmptyPages++;
          console.log(`❌ [TEXT EXTRACTION] Página ${i}: Sin texto extraíble (0 chars)`);
        }
        
        pages.push({
          pageNumber: i,
          content: pageText || `[Página ${i} - texto no disponible mediante extracción directa]
          
📄 Esta página puede contener imágenes o texto no extraíble.
📖 Se puede leer el contenido con OCR si es necesario.
🔍 Contenido detectado pero no extractable automáticamente.

Página ${i} de ${totalPages}`,
        });
      }
      
      // Decisión SIMPLE basada en texto total extraído
      const textRatio = pagesWithText / totalPages;
      const avgTextPerPage = totalTextLength / (pagesWithText || 1);
      
      // CRITERIO SIMPLE: Si menos del 30% de páginas tienen texto O el promedio es muy bajo → OCR
      const needsOCR = textRatio < 0.3 || avgTextPerPage < 50;
      
      console.log(`📊 [DECISION] ANÁLISIS COMPLETO DEL PDF:`);
      console.log(`📊 [DECISION] - Total páginas: ${totalPages}`);
      console.log(`📊 [DECISION] - Páginas con texto: ${pagesWithText} (${Math.round(textRatio * 100)}%)`);
      console.log(`📊 [DECISION] - Páginas sin texto: ${totalEmptyPages} (${Math.round((totalEmptyPages/totalPages) * 100)}%)`);
      console.log(`📊 [DECISION] - Total caracteres extraídos: ${totalTextLength}`);
      console.log(`📊 [DECISION] - Promedio chars/página con texto: ${Math.round(avgTextPerPage)}`);
      console.log(`📊 [DECISION] - Criterio OCR SIMPLE: <30% páginas con texto OR promedio <50 chars`);
      console.log(`📊 [DECISION] - Evaluación: ${textRatio < 0.3} OR ${avgTextPerPage < 50}`);
      console.log(`🎯 [DECISION] RESULTADO FINAL: OCR necesario = ${needsOCR} (ESTRATEGIA SIMPLE)`);
      
      if (needsOCR) {
        console.log(`🚨 [OCR PATH] PDF escaneado detectado. Aplicando OCR en segundo plano...`);
        
        // Solo reemplazar páginas vacías con mensaje de OCR en progreso
        let pagesModified = 0;
        for (let i = 0; i < pages.length; i++) {
          // Solo reemplazar páginas que están realmente vacías
          if (pages[i].content.includes('[Página') && pages[i].content.includes('sin texto extraíble]')) {
            pages[i].content = `[Procesando OCR para página ${i+1}]

📖 Esta página se está procesando con OCR automáticamente.
⏱️ Puedes navegar mientras esperas.
🔄 Se actualizará cuando termine el procesamiento.

Página ${i+1} de ${totalPages}`;
            pagesModified++;
          }
        }
        console.log(`🔄 [OCR PATH] ${pagesModified} páginas marcadas para OCR`);
        console.log(`⚡ [OCR PATH] Iniciando procesamiento en segundo plano...`);
        
        // Crear el libro inicial que se irá actualizando
        const initialBook: Book = {
          title: file.name.replace(/\.[^.]+$/i, ''),
          pages: [...pages], // Copia de las páginas
          currentPage: 1,
          totalPages,
          coverUrl: coverImageUrl,
          lastRead: new Date().toISOString(),
          processedWithOcr: true,
          ocrInProgress: true,
          ocrProgress: 0,
          ocrTotal: totalPages
        };
        
        // Guardar la referencia al libro para actualizaciones
        currentBookRef.current = initialBook;
        
        // Establecer estado de procesamiento en segundo plano
        console.log(`🎯 [DEBUG] Activando popup OCR: isProcessingBackground = true`);
        setOCRState(true, 0, totalPages, file.name.replace(/\.[^.]+$/i, ''));
        
        // Comenzar procesamiento OCR en segundo plano
        setTimeout(() => {
          processOcrInBackground(file, initialBook, user?.id);
        }, 500);
        
        // Devolver el libro inicialmente para que el usuario empiece a leer
        return initialBook;
      } else {
        // PDF con texto extractable - no necesita OCR
        console.log(`✅ [FAST PATH] PDF con texto extractable detectado. Listo para leer inmediatamente!`);
        console.log(`⚡ [FAST PATH] Saltando OCR - libro disponible de inmediato`);
        
        const book: Book = {
          title: file.name.replace(/\.[^.]+$/i, ''),
          pages,
          currentPage: 1,
          totalPages,
          coverUrl: coverImageUrl,
          lastRead: new Date().toISOString(),
          processedWithOcr: false
        };
        
        console.log(`💾 [FAST PATH] Guardando libro en Supabase...`);
        // Guardar en Supabase
        saveBookToSupabase(book, user?.id);
        
        console.log(`🎉 [FAST PATH] Libro listo para navegación inmediata!`);
        return book;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el PDF';
      setError(errorMessage);
      return null;
    }
  };

  // Función para procesar OCR en segundo plano
  const processOcrInBackground = async (file: File, initialBook: Book, userId?: string) => {
    try {
      console.log('Iniciando procesamiento OCR en segundo plano...');
      
      // Crear una copia profunda del libro inicial
      const bookCopy = {
        ...initialBook,
        pages: [...initialBook.pages], // Copia de las páginas
      };
      
      // Iniciar el procesamiento progresivo
      await tesseractOcrService.processFileProgressively(
        file,
        // Callback cuando se procesa una página
        (pageNumber, text) => {
          console.log(`Página ${pageNumber} procesada con OCR`);
          
          // Actualizar la página en la copia del libro
          if (bookCopy.pages[pageNumber - 1]) {
            bookCopy.pages[pageNumber - 1].content = text;
            
            // Actualizar el libro en el contexto si existe
            if (currentBookRef.current) {
              // Guardar la página actual antes de actualizar
              const currentPageBeforeUpdate = currentBookRef.current.currentPage;
              
              // Crear una copia del libro actual
              const updatedBook = {
                ...currentBookRef.current,
                pages: [...currentBookRef.current.pages], // Copia de las páginas
              };
              
              // Actualizar la página específica
              updatedBook.pages[pageNumber - 1] = {
                ...updatedBook.pages[pageNumber - 1],
                content: text
              };
              
              // Asegurarse de mantener la página actual
              updatedBook.currentPage = currentPageBeforeUpdate;
              
              // Actualizar la referencia
              currentBookRef.current = updatedBook;
              
              // Actualizar el libro en el contexto
              setBook(updatedBook);
            }
          }
        },
        // Callback para actualizar el progreso
        (progress, total) => {
          // Verificar si se canceló
          if (ocrCancelledRef.current) {
            console.log('[DEBUG] OCR cancelled by user, stopping progress updates');
            return false; // Indica al servicio que se cancele
          }
          
          console.log(`Progreso OCR: ${progress}/${total}`);
          setOCRState(true, progress, total);
          
          // Actualizar el progreso en el libro
          if (currentBookRef.current && !ocrCancelledRef.current) {
            // Guardar la página actual antes de actualizar
            const currentPageBeforeUpdate = currentBookRef.current.currentPage;
            
            const updatedBook = {
              ...currentBookRef.current,
              ocrProgress: progress,
              ocrTotal: total,
              ocrInProgress: progress < total,
              // Mantener la página actual
              currentPage: currentPageBeforeUpdate
            };
            
            currentBookRef.current = updatedBook;
            setBook(updatedBook);
          }
          
          return true; // Continuar procesamiento
        }
      );
      
      // Procesar completado, guardar el libro final en Supabase
      const finalBook = {
        ...bookCopy,
        ocrInProgress: false,
        ocrProgress: bookCopy.totalPages,
        ocrTotal: bookCopy.totalPages
      };
      
      // Actualizar estado final
      currentBookRef.current = finalBook;
      setBook(finalBook);
      setOCRState(false, 0, 0);
      
      // Guardar en Supabase
      saveBookToSupabase(finalBook, userId);
      
      console.log('Procesamiento OCR en segundo plano completado con éxito');
    } catch (error) {
      console.error('Error en procesamiento OCR en segundo plano:', error);
      
      // En caso de error, marcar como completado pero fallido
      if (currentBookRef.current) {
        const errorBook = {
          ...currentBookRef.current,
          ocrInProgress: false,
          ocrError: true
        };
        
        currentBookRef.current = errorBook;
        setBook(errorBook);
      }
      
      setOCRState(false, 0, 0);
      setError('Error en el procesamiento OCR en segundo plano');
    }
  };

  // Función para guardar el libro en Supabase
  const saveBookToSupabase = async (book: Book, userId?: string) => {
    if (!userId) return;
    
    try {
      const { error: saveError } = await supabase
        .from('books')
        .insert({
          title: book.title,
          user_id: userId,
          content: JSON.stringify(book.pages),
          current_page: 1,
          total_pages: book.totalPages,
          cover_url: book.coverUrl,
          last_read: new Date().toISOString()
        })
        .select()
        .single();
        
      if (saveError) {
        console.error('Error al guardar el libro en Supabase:', saveError);
      }
    } catch (dbError) {
      console.error('Error de base de datos:', dbError);
    }
  };

  const processDocxFile = async (file: File): Promise<Book | null> => {
    try {
      console.log(`📄 [DOCX PROCESSOR] Procesando archivo DOCX: ${file.name} (${Math.round(file.size/1024)}KB)`);
      
      // Convertir archivo a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log(`📁 [DOCX PROCESSOR] ArrayBuffer creado: ${arrayBuffer.byteLength} bytes`);
      
      // Extraer texto usando mammoth
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      const messages = result.messages;
      
      console.log(`📝 [DOCX PROCESSOR] Texto extraído: ${text.length} caracteres`);
      
      if (messages && messages.length > 0) {
        console.log(`⚠️ [DOCX PROCESSOR] Mensajes de mammoth:`, messages);
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del archivo DOCX');
      }
      
      // Split text into pages (approximately 500 words per page)
      const words = text.split(/\s+/);
      const wordsPerPage = 500;
      const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));
      const pages: BookPage[] = [];
      
      console.log(`📖 [DOCX PROCESSOR] Dividiendo en ${totalPages} páginas (~${wordsPerPage} palabras/página)`);
      console.log(`📝 [DOCX PROCESSOR] Muestra de texto: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);
      
      for (let i = 0; i < totalPages; i++) {
        const startIndex = i * wordsPerPage;
        const endIndex = Math.min(startIndex + wordsPerPage, words.length);
        const pageWords = words.slice(startIndex, endIndex);
        
        pages.push({
          pageNumber: i + 1,
          content: pageWords.join(' '),
        });
      }
      
      // Create book object
      const book: Book = {
        title: file.name.replace(/\.[^.]+$/i, ''),
        pages,
        currentPage: 1,
        totalPages,
        lastRead: new Date().toISOString()
      };
      
      // Save book to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: savedBook, error: saveError } = await supabase
            .from('books')
            .insert({
              title: book.title,
              user_id: user.id,
              content: JSON.stringify(pages),
              current_page: 1,
              total_pages: totalPages,
              last_read: new Date().toISOString()
            })
            .select()
            .single();
            
          if (saveError) {
            console.error('Error al guardar en Supabase:', saveError);
          } else {
            console.log('✅ [DOCX PROCESSOR] Libro guardado en Supabase con ID:', savedBook?.id);
          }
        }
      } catch (dbError) {
        console.error('Error de base de datos:', dbError);
      }
      
      console.log(`🎉 [DOCX PROCESSOR] Libro DOCX procesado exitosamente!`);
      return book;
      
    } catch (error) {
      console.error('❌ [DOCX PROCESSOR] Error procesando DOCX:', error);
      setError(`Error procesando archivo DOCX: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return null;
    }
  };

  const processTextFile = async (file: File): Promise<Book | null> => {
    try {
      console.log(`📄 [TEXT PROCESSOR] Procesando archivo de texto: ${file.name} (${Math.round(file.size/1024)}KB)`);
      
      const text = await file.text();
      console.log(`📝 [TEXT PROCESSOR] Texto extraído: ${text.length} caracteres`);
      
      // Split text into pages (approximately 500 words per page)
      const words = text.split(/\s+/);
      const wordsPerPage = 500;
      const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));
      const pages: BookPage[] = [];
      
      console.log(`📖 [TEXT PROCESSOR] Dividiendo en ${totalPages} páginas (~${wordsPerPage} palabras/página)`);
      
      for (let i = 0; i < totalPages; i++) {
        const startIndex = i * wordsPerPage;
        const endIndex = Math.min(startIndex + wordsPerPage, words.length);
        const pageWords = words.slice(startIndex, endIndex);
        
        pages.push({
          pageNumber: i + 1,
          content: pageWords.join(' '),
        });
      }
      
      // Create book object
      const book: Book = {
        title: file.name.replace(/\.[^.]+$/i, ''),
        pages,
        currentPage: 1,
        totalPages,
        lastRead: new Date().toISOString()
      };
      
      // Save book to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: savedBook, error: saveError } = await supabase
            .from('books')
            .insert({
              title: book.title,
              user_id: user.id,
              content: JSON.stringify(pages),
              current_page: 1,
              total_pages: totalPages,
              last_read: new Date().toISOString()
            })
            .select()
            .single();
            
          if (saveError) {
            console.error('Error al guardar el libro de texto:', saveError);
          }
        }
      } catch (dbError) {
        console.error('Error de base de datos para archivo de texto:', dbError);
      }
      
      return book;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el archivo de texto';
      setError(errorMessage);
      return null;
    }
  };

  // Main function to process any file type
  const processFile = useCallback(async (file: File) => {
    try {
      console.log(`🚀 [FILE PROCESSOR] INICIANDO PROCESAMIENTO`);
      console.log(`🚀 [FILE PROCESSOR] Archivo: ${file.name}`);
      console.log(`🚀 [FILE PROCESSOR] Tipo MIME: ${file.type}`);
      console.log(`🚀 [FILE PROCESSOR] Tamaño: ${Math.round(file.size/1024)}KB`);
      
      setIsLoading(true);
      setError(null);
      
      // Determine file type and process accordingly
      const fileType = file.type.toLowerCase();
      let book: Book | null = null;
      
      console.log(`🔀 [FILE PROCESSOR] Determinando ruta de procesamiento para tipo: ${fileType}`);
      
      if (fileType === 'application/pdf') {
        console.log(`📕 [FILE PROCESSOR] → Ruta PDF seleccionada`);
        book = await processPDF(file);
        
        // Asegurar que el libro sea visible inmediatamente después de iniciar el OCR
        if (book) {
          // Establecer el libro en el contexto aquí, incluso si hay OCR en curso
          setBook(book);
        }
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log(`📄 [FILE PROCESSOR] → Ruta DOCX seleccionada`);
        book = await processDocxFile(file);
      } else if (
        fileType === 'text/plain' || 
        fileType === 'text/markdown' ||
        fileType === 'text/html' ||
        fileType === 'text/rtf' ||
        fileType === 'application/msword'
      ) {
        console.log(`📄 [FILE PROCESSOR] → Ruta TEXTO seleccionada`);
        book = await processTextFile(file);
      } else {
        console.log(`❓ [FILE PROCESSOR] Tipo MIME no reconocido, intentando por extensión...`);
        // If we can't identify by MIME type, try by extension
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        console.log(`📎 [FILE PROCESSOR] Extensión detectada: .${extension}`);
        
        if (['docx'].includes(extension)) {
          console.log(`📄 [FILE PROCESSOR] → Ruta DOCX seleccionada (por extensión)`);
          book = await processDocxFile(file);
        } else if (['txt', 'md', 'markdown', 'html', 'htm', 'rtf', 'doc'].includes(extension)) {
          console.log(`📄 [FILE PROCESSOR] → Ruta TEXTO seleccionada (por extensión)`);
          book = await processTextFile(file);
        } else if (extension === 'pdf') {
          console.log(`📕 [FILE PROCESSOR] → Ruta PDF seleccionada (por extensión)`);
          book = await processPDF(file);
          
          // Asegurar que el libro sea visible inmediatamente después de iniciar el OCR
          if (book) {
            // Establecer el libro en el contexto aquí, incluso si hay OCR en curso
            setBook(book);
          }
        } else {
          console.log(`❌ [FILE PROCESSOR] Formato no soportado: ${fileType} (.${extension})`);
          throw new Error('Formato de archivo no soportado');
        }
      }
      
      console.log(`✅ [FILE PROCESSOR] Procesamiento completado. Libro creado: ${book ? 'SÍ' : 'NO'}`);
      if (book) {
        console.log(`📊 [FILE PROCESSOR] Libro: ${book.pages.length} páginas, OCR en progreso: ${book.ocrInProgress || 'NO'}`);
      }
      
      return book;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el archivo';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setBook, setIsLoading]);

  // Función para cancelar OCR
  const cancelOCR = useCallback(() => {
    console.log('[DEBUG] User requested OCR cancellation');
    setIsCancelling(true);
    ocrCancelledRef.current = true;
    
    // Resetear estados
    setTimeout(() => {
      setOCRState(false, 0, 0);
      setIsCancelling(false);
    }, 500);
  }, []);

  return { 
    processFile, 
    cancelOCR,
    error, 
    isCancelling
  };
};