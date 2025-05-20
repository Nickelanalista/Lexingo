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
    if (!content) {
      console.log('[DIAGNÓSTICO] Content es vacío');
      return true;
    }
    
    // Eliminar espacios en blanco, saltos de línea, etc.
    const trimmedContent = content.trim();
    
    // Considerar vacía si solo tiene caracteres especiales o espacios
    if (trimmedContent.length === 0) {
      console.log('[DIAGNÓSTICO] Content está vacío después de trim');
      return true;
    }
    
    // Considerar vacía si solo tiene pocos caracteres o solo números de página
    if (trimmedContent.length < 10) {
      console.log(`[DIAGNÓSTICO] Content es muy corto (${trimmedContent.length} caracteres): "${trimmedContent}"`);
      return true;
    }
    
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
        console.log(`[DIAGNÓSTICO] Content coincide con patrón de página vacía: "${trimmedContent}"`);
        return true;
      }
    }
    
    console.log(`[DIAGNÓSTICO] Content tiene contenido válido (${trimmedContent.length} caracteres)`);
    return false;
  };

  // Función para encontrar la primera página no vacía
  const findFirstNonEmptyPage = (pages: { content: string }[]): number => {
    if (!pages || pages.length === 0) {
      console.log('[DIAGNÓSTICO] No hay páginas para analizar');
      return 1;
    }

    console.log(`[DIAGNÓSTICO] Analizando ${pages.length} páginas para encontrar la primera no vacía`);
    
    // Verificar el contenido de las primeras páginas para depuración
    for (let i = 0; i < Math.min(5, pages.length); i++) {
      console.log(`[DIAGNÓSTICO] Página ${i+1} - Contenido: "${pages[i].content?.substring(0, 50)}..."` +
        ` (${pages[i].content?.length || 0} caracteres)`);
    }
    
    for (let i = 0; i < pages.length; i++) {
      console.log(`[DIAGNÓSTICO] Evaluando si la página ${i+1} está vacía...`);
      if (!isPageEmpty(pages[i].content)) {
        console.log(`[DIAGNÓSTICO] Primera página no vacía encontrada: ${i + 1}`);
        return i + 1; // Las páginas se indexan desde 1, pero el array desde 0
      } else {
        console.log(`[DIAGNÓSTICO] Página ${i+1} detectada como vacía, continuando búsqueda...`);
      }
    }
    console.log('[DIAGNÓSTICO] No se encontraron páginas no vacías en todo el libro');
    return 1; // Si todas las páginas están vacías, volver a la primera
  };

  // Función para cargar un libro y comenzar en la primera página no vacía
  const loadBookAndSkipEmptyPages = (bookData: Book) => {
    if (!bookData || !bookData.pages || bookData.pages.length === 0) {
      console.log('[DIAGNÓSTICO] Libro sin páginas o inválido');
      setBook(bookData);
      setPagesSkipped(0);
      return;
    }

    console.log(`[DIAGNÓSTICO] Cargando libro: "${bookData.title}" con ${bookData.pages.length} páginas`);
    console.log(`[DIAGNÓSTICO] Página actual guardada en DB: ${bookData.currentPage}`);
    
    // Establecer loading a true durante el proceso
    setIsLoading(true);
    
    // Buscamos la primera página no vacía solo si estamos comenzando un libro nuevo
    let startPage = bookData.currentPage;
    let skipPages = false;
    
    // Si estamos en la primera página (libro nuevo o recién abierto), buscamos la primera página con contenido
    if (bookData.currentPage === 1) {
      console.log('[DIAGNÓSTICO] Libro nuevo o en página inicial, buscando primera página no vacía...');
      startPage = findFirstNonEmptyPage(bookData.pages);
      skipPages = true;
      console.log(`[DIAGNÓSTICO] Primera página no vacía identificada: ${startPage}`);
      
      // Calcular cuántas páginas se omitieron
      const skipped = startPage - 1;
      setPagesSkipped(skipped > 0 ? skipped : 0);
      console.log(`[DIAGNÓSTICO] Páginas a omitir: ${skipped}`);
    } else {
      // Si ya tenemos una página guardada, la respetamos SIEMPRE
      console.log(`[DIAGNÓSTICO] Respetando la página guardada del usuario: ${bookData.currentPage}`);
      setPagesSkipped(0); // No mostrar mensaje de páginas omitidas cuando usamos la página guardada
    }
    
    // Verificar si hay un marcador guardado en Supabase y tiene prioridad
    if (bookData.bookmarked && bookData.bookmark_page) {
      // Solo usar el marcador si venimos desde la página de "Mis Libros" 
      // y hemos hecho clic en el libro (no si ya estábamos leyendo)
      if (skipPages) {
        startPage = bookData.bookmark_page;
        console.log(`[DIAGNÓSTICO] Usando página de marcador: ${startPage}`);
        setPagesSkipped(0); // No mostrar mensaje para marcadores
      }
    }
    
    // Actualizar el libro con la página inicial correcta
    console.log(`[DIAGNÓSTICO] Estableciendo página inicial final: ${startPage}`);
    setBook({
      ...bookData,
      currentPage: startPage
    });
    
    // Finalizar loading después de completar el proceso
    setTimeout(() => {
      console.log('[DIAGNÓSTICO] Finalizando estado de carga');
      setIsLoading(false);
    }, 800);
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