import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Book } from '../types';
import { supabase } from '../lib/supabase';

interface BookContextType {
  book: Book | null;
  setBook: (book: Book) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  goToPage: (pageNumber: number) => void;
  loadBookAndSkipEmptyPages: (book: Book) => void;
  pagesSkipped: number;
  setPagesSkipped: (count: number) => void;
  updateReadingProgress: (bookId: string, pageNumber: number) => Promise<void>;
}

const defaultContext: BookContextType = {
  book: null,
  setBook: () => {},
  isLoading: false,
  setIsLoading: () => {},
  goToPage: () => {},
  loadBookAndSkipEmptyPages: () => {},
  pagesSkipped: 0,
  setPagesSkipped: () => {},
  updateReadingProgress: async () => {},
};

const BookContext = createContext<BookContextType>(defaultContext);

export const useBookContext = () => useContext(BookContext);

export const BookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pagesSkipped, setPagesSkipped] = useState<number>(0);

  // Función para determinar si una página está vacía
  const isPageEmpty = (content: string): boolean => {
    if (!content) return true;
    
    // Eliminar espacios en blanco, saltos de línea, etc.
    const trimmedContent = content.trim();
    
    // Considerar vacía si solo tiene caracteres especiales o espacios
    if (trimmedContent.length === 0) return true;
    
    // Considerar vacía si solo tiene pocos caracteres o solo números de página
    if (trimmedContent.length < 10) return true;
    
    // Considerar vacía si solo contiene patrones como "Página X" o similares
    const pagePatterns = [
      /^page\s*\d+$/i, // "Page 1", "Page2", etc.
      /^p\.\s*\d+$/i,  // "p. 1", "P.2", etc.
      /^\d+$/, // Solo números
      /^[\d\s-.,;:]+$/, // Solo números y puntuación
      /^chapter\s*\d*$/i, // "Chapter", "Chapter 1", etc.
      /^section\s*\d*$/i, // "Section", "Section 1", etc.
      /^part\s*\d*$/i // "Part", "Part 1", etc.
    ];
    
    for (const pattern of pagePatterns) {
      if (pattern.test(trimmedContent)) {
        return true;
      }
    }
    
    return false;
  };

  // Función para encontrar la primera página no vacía
  const findFirstNonEmptyPage = (pages: { content: string }[]): number => {
    for (let i = 0; i < pages.length; i++) {
      if (!isPageEmpty(pages[i].content)) {
        console.log(`Primera página no vacía encontrada: ${i + 1}`);
        return i + 1; // Las páginas se indexan desde 1, pero el array desde 0
      }
    }
    console.log('No se encontraron páginas no vacías');
    return 1; // Si todas las páginas están vacías, volver a la primera
  };

  // Función para cargar un libro y comenzar en la primera página no vacía
  const loadBookAndSkipEmptyPages = (bookData: Book) => {
    if (!bookData || !bookData.pages || bookData.pages.length === 0) {
      console.log('Libro sin páginas o inválido');
      setBook(bookData);
      setPagesSkipped(0);
      return;
    }

    console.log('Cargando libro y buscando primera página no vacía...');
    
    // Encontrar la primera página no vacía
    const firstNonEmptyPage = findFirstNonEmptyPage(bookData.pages);
    console.log(`Página actual del libro: ${bookData.currentPage}, Primera página no vacía: ${firstNonEmptyPage}`);
    
    // Calcular cuántas páginas se omitieron
    const skipped = firstNonEmptyPage - 1;
    
    // Solo establecer las páginas omitidas si es una carga inicial (currentPage=1)
    // Esto evita que se muestre el mensaje al cambiar de páginas
    if (bookData.currentPage === 1) {
      setPagesSkipped(skipped > 0 ? skipped : 0);
    } else {
      setPagesSkipped(0); // No mostrar mensaje si no es carga inicial
    }
    
    // Verificar si hay una página guardada en localStorage
    let lastSavedPage = 1;
    try {
      // Intentar extraer el ID del libro desde el título (solución temporal)
      const potentialBookId = bookData.title.replace(/\s+/g, '_').toLowerCase();
      const savedPage = localStorage.getItem(`book_${potentialBookId}_lastPage`);
      if (savedPage) {
        lastSavedPage = parseInt(savedPage, 10);
        console.log(`Página guardada encontrada: ${lastSavedPage}`);
      }
    } catch (error) {
      console.error('Error al recuperar la página guardada:', error);
    }
    
    // Determinar la página de inicio, priorizando la página guardada si existe
    let startPage = firstNonEmptyPage;
    
    // Verificar si hay un marcador guardado en Supabase
    if (bookData.bookmarked && bookData.bookmark_page) {
      startPage = bookData.bookmark_page;
      console.log(`Usando página de marcador: ${startPage}`);
    }
    // Si hay una página guardada en localStorage y es mayor que la primera no vacía, usarla
    else if (lastSavedPage > firstNonEmptyPage) {
      startPage = lastSavedPage;
      console.log(`Usando página guardada en localStorage: ${startPage}`);
    } 
    // Si la página actual del libro es mayor que la primera no vacía, usarla
    else if (bookData.currentPage > firstNonEmptyPage) {
      startPage = bookData.currentPage;
      console.log(`Usando página actual del libro: ${startPage}`);
    }
    
    console.log(`Estableciendo página inicial en: ${startPage}`);
    
    // Actualizar el libro con la página inicial correcta
    setBook({
      ...bookData,
      currentPage: startPage
    });
  };

  // Función para actualizar el progreso de lectura en Supabase
  const updateReadingProgress = async (bookId: string, pageNumber: number) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({
          current_page: pageNumber,
          last_read: new Date().toISOString()
        })
        .eq('id', bookId);

      if (error) {
        console.error('Error al actualizar el progreso de lectura:', error);
      } else {
        console.log(`Progreso actualizado: Libro ${bookId}, Página ${pageNumber}`);
        
        // También actualizamos en localStorage como respaldo
        const potentialBookId = book?.title.replace(/\s+/g, '_').toLowerCase();
        if (potentialBookId) {
          localStorage.setItem(`book_${potentialBookId}_lastPage`, pageNumber.toString());
        }
      }
    } catch (err) {
      console.error('Error en la actualización del progreso:', err);
    }
  };

  // Resetear páginas omitidas cuando se navega manualmente
  const goToPage = (pageNumber: number) => {
    if (!book) return;
    
    // Resetear el contador de páginas omitidas para no mostrar el mensaje
    setPagesSkipped(0);
    
    const validPage = Math.max(1, Math.min(pageNumber, book.totalPages));
    
    // Actualizar el estado local
    setBook({
      ...book,
      currentPage: validPage,
    });
    
    // Si el libro tiene un ID, actualizamos el progreso en la base de datos
    if (book.id) {
      updateReadingProgress(book.id, validPage);
    }
  };

  return (
    <BookContext.Provider 
      value={{ 
        book, 
        setBook, 
        isLoading, 
        setIsLoading, 
        goToPage,
        loadBookAndSkipEmptyPages,
        pagesSkipped,
        setPagesSkipped,
        updateReadingProgress
      }}
    >
      {children}
    </BookContext.Provider>
  );
};