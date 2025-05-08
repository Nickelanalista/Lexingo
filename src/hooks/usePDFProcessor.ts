import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, BookPage } from '../types';
import { useBookContext } from '../context/BookContext';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const usePDFProcessor = () => {
  const { setBook, setIsLoading } = useBookContext();
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
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
      
      // Create book object
      const book: Book = {
        title: file.name.replace(/\.pdf$/i, ''),
        pages,
        currentPage: 1,
        totalPages,
      };
      
      setBook(book);
      return book;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el PDF';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setBook, setIsLoading]);

  return { processFile, error };
};