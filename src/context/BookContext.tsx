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

  // Función simplificada para determinar si una página está vacía
  const isPageEmpty = (content: string): boolean => {
    if (!content || content.trim().length < 10) {
      return true;
    }
    
    const trimmedContent = content.trim();
    
    // Patrones de páginas vacías comunes
    const pagePatterns = [
      /^page\s*\d+$/i,
      /^p\.\s*\d+$/i,
      /^\d+$/,
      /^[\d\s-.,;:]+$/,
      /^chapter\s*\d*$/i,
      /^section\s*\d*$/i,
      /^part\s*\d*$/i
    ];
    
    return pagePatterns.some(pattern => pattern.test(trimmedContent));
  };

  // Función simplificada para encontrar la primera página no vacía
  const findFirstNonEmptyPage = (pages: { content: string }[]): number => {
    console.log(`🔍 [SKIP EMPTY] Buscando primera página no vacía entre ${pages.length} páginas...`);
    
    if (!pages || pages.length === 0) {
      console.log(`❌ [SKIP EMPTY] No hay páginas, retornando página 1`);
      return 1;
    }
    
    for (let i = 0; i < pages.length; i++) {
      const content = pages[i].content;
      const isEmpty = isPageEmpty(content);
      console.log(`📄 [SKIP EMPTY] Página ${i + 1}: ${isEmpty ? 'VACÍA' : 'CON CONTENIDO'} - "${content?.substring(0, 50)}${content?.length > 50 ? '...' : ''}"`);
      
      if (!isEmpty) {
        console.log(`✅ [SKIP EMPTY] Primera página con contenido encontrada: página ${i + 1}`);
        return i + 1;
      }
    }
    
    console.log(`⚠️ [SKIP EMPTY] Todas las páginas están vacías, retornando página 1`);
    return 1;
  };

  // Función para cargar un libro y comenzar en la primera página no vacía
  const loadBookAndSkipEmptyPages = (bookData: Book) => {
    if (!bookData || !bookData.pages || bookData.pages.length === 0) {
      setBook(bookData);
      setPagesSkipped(0);
      return;
    }
    
    // Establecer loading a true durante el proceso
    setIsLoading(true);
    
    // Prioridad de páginas: bookmark_page > current_page > primera página con contenido
    let startPage = bookData.currentPage || 1;
    let skipPages = false;
    let reason = 'saved_page';
    
    // 1. Verificar si hay un marcador guardado en Supabase (máxima prioridad)
    if (bookData.bookmarked && bookData.bookmark_page && bookData.bookmark_page > 1) {
      startPage = bookData.bookmark_page;
      setPagesSkipped(0); // No mostrar mensaje para marcadores
      reason = 'bookmark';
    }
    // 2. Si no hay marcador, usar la página guardada en current_page
    else if (bookData.currentPage && bookData.currentPage > 1) {
      startPage = bookData.currentPage;
      setPagesSkipped(0); // No mostrar mensaje para páginas guardadas
      reason = 'saved_page';
    }
    // 3. Solo si es un libro completamente nuevo (página 1), buscar primera página con contenido
    else if (bookData.currentPage === 1 || !bookData.currentPage) {
      const firstContentPage = findFirstNonEmptyPage(bookData.pages);
      if (firstContentPage > 1) {
        startPage = firstContentPage;
        skipPages = true;
        reason = 'skip_empty';
        
        // Calcular cuántas páginas se omitieron
        const skipped = startPage - 1;
        setPagesSkipped(skipped > 0 ? skipped : 0);
      } else {
        startPage = 1;
        setPagesSkipped(0);
      }
    }
    
    console.log(`📚 [BOOK CONTEXT] Loading book "${bookData.title}"`);
    console.log(`📚 [BOOK CONTEXT] - Reason: ${reason}`);
    console.log(`📚 [BOOK CONTEXT] - Start page: ${startPage}`);
    console.log(`📚 [BOOK CONTEXT] - Current page from DB: ${bookData.currentPage}`);
    console.log(`📚 [BOOK CONTEXT] - Bookmark page: ${bookData.bookmark_page}`);
    console.log(`📚 [BOOK CONTEXT] - Pages skipped: ${reason === 'skip_empty' ? startPage - 1 : 0}`);
    
    // Actualizar el libro con la página inicial correcta
    setBook({
      ...bookData,
      currentPage: startPage
    });
    
    // Finalizar loading después de completar el proceso
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  // Función para actualizar el progreso de lectura en Supabase (con debounce)
  const updateReadingProgress = async (bookId: string, pageNumber: number) => {
    console.log(`🔄 [UPDATE PROGRESS] Solicitando actualización: libro ${bookId}, página ${pageNumber}`);
    
    // Evitar actualizaciones demasiado frecuentes que causen ERR_INSUFFICIENT_RESOURCES
    const debounceKey = `${bookId}_${pageNumber}`;
    const lastUpdate = updateReadingProgress.lastUpdate || {};
    const now = Date.now();
    
    // Solo actualizar si ha pasado al menos 1 segundo desde la última actualización para esta página
    if (lastUpdate[debounceKey] && (now - lastUpdate[debounceKey]) < 1000) {
      console.log(`⏸️ [UPDATE PROGRESS] Debounce activo, saltando actualización (última hace ${now - lastUpdate[debounceKey]}ms)`);
      return;
    }
    
    lastUpdate[debounceKey] = now;
    updateReadingProgress.lastUpdate = lastUpdate;
    
    try {
      console.log(`💾 [UPDATE PROGRESS] Ejecutando actualización en Supabase...`);
      // Actualizando progreso de lectura
      const timestamp = new Date().toISOString();
      
      const { error, data } = await supabase
        .from('books')
        .update({
          current_page: pageNumber,
          last_read: timestamp,
          updated_at: timestamp
        })
        .eq('id', bookId)
        .select('title, current_page, last_read');

      if (error) {
        console.error(`❌ [UPDATE PROGRESS] Error en Supabase:`, error);
      } else {
        console.log(`✅ [UPDATE PROGRESS] Actualización exitosa en DB:`, data);
        
        // También actualizamos en localStorage como respaldo
        const potentialBookId = book?.title.replace(/\s+/g, '_').toLowerCase();
        if (potentialBookId) {
          localStorage.setItem(`book_${potentialBookId}_lastPage`, pageNumber.toString());
          console.log(`💽 [UPDATE PROGRESS] Guardado en localStorage: book_${potentialBookId}_lastPage = ${pageNumber}`);
        }
      }
    } catch (err) {
      console.error(`💥 [UPDATE PROGRESS] Error crítico:`, err);
    }
  };

  // Resetear páginas omitidas cuando se navega manualmente
  const goToPage = (pageNumber: number) => {
    if (!book) {
      console.log(`❌ [GO TO PAGE] No hay libro cargado`);
      return;
    }
    
    const validPage = Math.max(1, Math.min(pageNumber, book.totalPages));
    console.log(`📍 [GO TO PAGE] Navegando de página ${book.currentPage} a página ${validPage} (solicitada: ${pageNumber})`);
    
    // Evitar actualizaciones innecesarias que causen bucles
    if (book.currentPage === validPage) {
      console.log(`⏭️ [GO TO PAGE] Ya estamos en la página ${validPage}, saltando actualización`);
      return;
    }
    
    // Resetear el contador de páginas omitidas para no mostrar el mensaje
    setPagesSkipped(0);
    
    // Actualizar el estado local
    setBook({
      ...book,
      currentPage: validPage,
    });
    
    // Si el libro tiene un ID, actualizamos el progreso en la base de datos
    if (book.id) {
      console.log(`💾 [GO TO PAGE] Actualizando progreso en DB: libro ${book.id}, página ${validPage}`);
      updateReadingProgress(book.id, validPage);
    } else {
      console.log(`⚠️ [GO TO PAGE] Libro sin ID, no se puede guardar progreso en DB`);
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