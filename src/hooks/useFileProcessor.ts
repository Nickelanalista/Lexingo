import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, BookPage } from '../types';
import { useBookContext } from '../context/BookContext';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const useFileProcessor = () => {
  const { setBook, setIsLoading } = useBookContext();
  const [error, setError] = useState<string | null>(null);

  const processPDF = async (file: File): Promise<Book | null> => {
    try {
      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const totalPages = pdf.numPages;
      const pages: BookPage[] = [];
      
      // Process each page
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text items
        const pageText = textContent.items
          .map((item: any) => 'str' in item ? item.str : '')
          .join(' ');
        
        pages.push({
          pageNumber: i,
          content: pageText,
        });
      }
      
      // Detectar la primera página con contenido significativo
      let firstContentfulPage = 1;
      const minContentLength = 100; // Mínimo número de caracteres para considerar una página como "con contenido"
      let emptyPagesSkipped = 0;
      
      for (let i = 0; i < pages.length; i++) {
        // Eliminar espacios en blanco para verificar si hay contenido real
        const contentWithoutSpaces = pages[i].content.replace(/\s+/g, '');
        if (contentWithoutSpaces.length >= minContentLength) {
          firstContentfulPage = i + 1; // +1 porque los índices comienzan en 0, pero las páginas en 1
          emptyPagesSkipped = i;
          break;
        }
      }
      
      // Si saltamos más de 0 páginas, añadir una nota en la primera página con contenido
      if (emptyPagesSkipped > 0 && firstContentfulPage <= pages.length) {
        const originalContent = pages[firstContentfulPage - 1].content;
        pages[firstContentfulPage - 1].content = 
          `[Se omitieron ${emptyPagesSkipped} ${emptyPagesSkipped === 1 ? 'página inicial' : 'páginas iniciales'} sin contenido relevante]\n\n${originalContent}`;
      }
      
      // Create book object
      const book: Book = {
        title: file.name.replace(/\.[^.]+$/i, ''),
        pages,
        currentPage: firstContentfulPage, // Comenzar en la primera página con contenido
        totalPages,
      };
      
      return book;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el PDF';
      setError(errorMessage);
      return null;
    }
  };

  const processTextFile = async (file: File): Promise<Book | null> => {
    try {
      const text = await file.text();
      
      // Dividir el texto en páginas (aproximadamente 500 palabras por página)
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
      };
      
      return book;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el archivo de texto';
      setError(errorMessage);
      return null;
    }
  };

  // Función principal para procesar cualquier tipo de archivo
  const processFile = useCallback(async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Determinar el tipo de archivo y procesarlo de acuerdo al formato
      const fileType = file.type.toLowerCase();
      let book: Book | null = null;
      
      if (fileType === 'application/pdf') {
        book = await processPDF(file);
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
        // Si no podemos identificar el tipo por MIME, intentamos por extensión
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (['txt', 'md', 'markdown', 'html', 'htm', 'rtf', 'doc', 'docx'].includes(extension)) {
          book = await processTextFile(file);
        } else if (extension === 'pdf') {
          book = await processPDF(file);
        } else {
          throw new Error('Formato de archivo no soportado');
        }
      }
      
      if (book) {
        setBook(book);
        return book;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el archivo';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setBook, setIsLoading]);

  return { processFile, error };
}; 