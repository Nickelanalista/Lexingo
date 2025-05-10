import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, BookPage } from '../types';
import { useBookContext } from '../context/BookContext';
import { supabase } from '../lib/supabase';

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
        const fileName = `${user.id}/${Date.now()}-cover.jpg`;
        const { data, error: uploadError } = await supabase.storage
          .from('books')
          .upload(fileName, blob);
          
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('books')
            .getPublicUrl(fileName);
          coverImageUrl = publicUrl;
        }
      }
      
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
        title: file.name.replace(/\.[^.]+$/i, ''),
        pages,
        currentPage: 1,
        totalPages,
        coverUrl: coverImageUrl,
        lastRead: new Date().toISOString()
      };
      
      // Save book to Supabase
      if (user) {
        const { data: savedBook, error: saveError } = await supabase
          .from('books')
          .insert({
            title: book.title,
            user_id: user.id,
            content: JSON.stringify(pages),
            current_page: 1,
            total_pages: totalPages,
            cover_url: coverImageUrl,
            last_read: new Date().toISOString()
          })
          .select()
          .single();
          
        if (saveError) throw saveError;
      }
      
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
          
        if (saveError) throw saveError;
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