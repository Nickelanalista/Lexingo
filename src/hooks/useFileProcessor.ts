import { useState, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, BookPage } from '../types';
import { useBookContext } from '../context/BookContext';
import { supabase } from '../lib/supabase';
import { tesseractOcrService } from '../services/tesseractOcr';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const useFileProcessor = () => {
  const { setBook, setIsLoading } = useBookContext();
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrTotal, setOcrTotal] = useState<number>(0);
  const [isProcessingBackground, setIsProcessingBackground] = useState<boolean>(false);
  
  // Referencia al objeto de libro actual para actualizarlo durante el procesamiento
  const currentBookRef = useRef<Book | null>(null);

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
      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const totalPages = pdf.numPages;
      const pages: BookPage[] = [];
      let coverImageUrl = null;
      
      // Get the first page for the cover
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await firstPage.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75);
      });
      
      // Upload cover to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const fileName = `${user.id}/${Date.now()}-cover.jpg`;
          const { data, error: uploadError } = await supabase.storage
            .from('books')
            .upload(fileName, blob);
            
          if (uploadError) {
            console.error('Error al subir la portada:', uploadError);
          } else if (data) {
            const { data: { publicUrl } } = supabase.storage
              .from('books')
              .getPublicUrl(fileName);
            coverImageUrl = publicUrl;
          }
        } catch (storageError) {
          console.error('Error al procesar la portada:', storageError);
          // Continuar sin portada en caso de error
        }
      }
      
      // Process each page
      let emptyTextPages = 0;
      let ocrProcessed = false;
      
      // Inicializar las páginas con texto vacío o texto extraído
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text items
        const pageText = textContent.items
          .map((item: any) => 'str' in item ? item.str : '')
          .join(' ');
        
        // Detectar si la página no tiene texto o tiene muy poco
        if (!pageText.trim() || pageText.trim().length < 10) {
          emptyTextPages++;
        }
        
        pages.push({
          pageNumber: i,
          content: pageText,
        });
      }
      
      // Si la mayoría de las páginas están vacías, necesitamos OCR
      if (emptyTextPages > 0 && emptyTextPages / totalPages > 0.5) {
        console.log(`Detectadas ${emptyTextPages}/${totalPages} páginas sin texto. Aplicando OCR...`);
        
        // Inicializar el libro con el texto extraído directamente (o placeholders)
        // para que el usuario pueda empezar a leer
        for (let i = 0; i < pages.length; i++) {
          // Solo reemplazar páginas vacías con un mensaje de "Procesando OCR..."
          if (!pages[i].content.trim() || pages[i].content.trim().length < 10) {
            pages[i].content = `[Procesando OCR para página ${i+1}]

El texto de esta página se está procesando con OCR en segundo plano.
Puedes navegar entre páginas mientras esperas.

Esta página se actualizará automáticamente cuando el OCR finalice.
Si ves este mensaje por mucho tiempo, intenta cargar el documento nuevamente.

Página ${i+1} de ${totalPages}`;
          }
        }
        
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
        setIsProcessingBackground(true);
        setOcrTotal(totalPages);
        setOcrProgress(0);
        
        // Comenzar procesamiento OCR en segundo plano
        setTimeout(() => {
          processOcrInBackground(file, initialBook, user?.id);
        }, 500);
        
        // Devolver el libro inicialmente para que el usuario empiece a leer
        return initialBook;
      } else {
        // No necesitamos OCR, devolver el libro tal como está
        const book: Book = {
          title: file.name.replace(/\.[^.]+$/i, ''),
          pages,
          currentPage: 1,
          totalPages,
          coverUrl: coverImageUrl,
          lastRead: new Date().toISOString(),
          processedWithOcr: false
        };
        
        // Guardar en Supabase
        saveBookToSupabase(book, user?.id);
        
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
          console.log(`Progreso OCR: ${progress}/${total}`);
          setOcrProgress(progress);
          
          // Actualizar el progreso en el libro
          if (currentBookRef.current) {
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
      setIsProcessingBackground(false);
      
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
      
      setIsProcessingBackground(false);
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

  const processTextFile = async (file: File): Promise<Book | null> => {
    try {
      const text = await file.text();
      
      // Split text into pages (approximately 500 words per page)
      const words = text.split(/\s+/);
      const wordsPerPage = 500;
      const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));
      const pages: BookPage[] = [];
      
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
      setIsLoading(true);
      setError(null);
      
      // Determine file type and process accordingly
      const fileType = file.type.toLowerCase();
      let book: Book | null = null;
      
      if (fileType === 'application/pdf') {
        book = await processPDF(file);
        
        // Asegurar que el libro sea visible inmediatamente después de iniciar el OCR
        if (book) {
          // Establecer el libro en el contexto aquí, incluso si hay OCR en curso
          setBook(book);
        }
      } else if (
        fileType === 'text/plain' || 
        fileType === 'text/markdown' ||
        fileType === 'text/html' ||
        fileType === 'text/rtf' ||
        fileType === 'application/msword' ||
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        book = await processTextFile(file);
      } else {
        // If we can't identify by MIME type, try by extension
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (['txt', 'md', 'markdown', 'html', 'htm', 'rtf', 'doc', 'docx'].includes(extension)) {
          book = await processTextFile(file);
        } else if (extension === 'pdf') {
          book = await processPDF(file);
          
          // Asegurar que el libro sea visible inmediatamente después de iniciar el OCR
          if (book) {
            // Establecer el libro en el contexto aquí, incluso si hay OCR en curso
            setBook(book);
          }
        } else {
          throw new Error('Formato de archivo no soportado');
        }
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

  return { 
    processFile, 
    error, 
    ocrProgress, 
    ocrTotal, 
    isProcessingBackground 
  };
};