import { useEffect } from 'react';
import { Book } from '../types';

export interface ReadingState {
  bookId: string;
  currentPage: number;
  displayLanguage: string;
  timestamp: number;
}

export const useReadingPersistence = () => {
  // Guardar estado de lectura en localStorage y sessionStorage
  const saveReadingState = (book: Book, currentPage?: number, displayLanguage?: string) => {
    if (!book || !book.id) return;

    const readingState: ReadingState = {
      bookId: book.id,
      currentPage: currentPage || book.currentPage,
      displayLanguage: displayLanguage || 'en',
      timestamp: Date.now()
    };

    // Guardar en localStorage (persiste entre sesiones)
    localStorage.setItem('lexingo_current_reading', JSON.stringify(readingState));
    localStorage.setItem(`lexingo_book_${book.id}`, JSON.stringify({
      ...readingState,
      title: book.title,
      totalPages: book.totalPages
    }));

    // Guardar en sessionStorage (para refresco de página)
    sessionStorage.setItem('lexingo_active_session', JSON.stringify(readingState));
  };

  // Recuperar estado de lectura
  const restoreReadingState = (): ReadingState | null => {
    try {
      // Primero intentar desde sessionStorage (más específico para la sesión actual)
      const sessionState = sessionStorage.getItem('lexingo_active_session');
      if (sessionState) {
        const state = JSON.parse(sessionState);
        // Verificar que el estado no sea muy antiguo (más de 24 horas)
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          return state;
        }
      }

      // Si no hay estado de sesión, intentar desde localStorage
      const persistedState = localStorage.getItem('lexingo_current_reading');
      if (persistedState) {
        const state = JSON.parse(persistedState);
        // Verificar que el estado no sea muy antiguo (más de 7 días)
        if (Date.now() - state.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return state;
        }
      }
    } catch (error) {
      console.error('Error restaurando estado de lectura:', error);
    }

    return null;
  };

  // Limpiar estado cuando se cierra el libro
  const clearReadingState = () => {
    sessionStorage.removeItem('lexingo_active_session');
    localStorage.removeItem('lexingo_current_reading');
  };

  // Obtener historial de libros leídos recientemente
  const getRecentBooks = (): Array<ReadingState & { title: string; totalPages: number }> => {
    try {
      const recentBooks = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lexingo_book_')) {
          const bookData = localStorage.getItem(key);
          if (bookData) {
            const parsed = JSON.parse(bookData);
            recentBooks.push(parsed);
          }
        }
      }
      
      // Ordenar por timestamp más reciente
      return recentBooks
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Mantener solo los últimos 10 libros
    } catch (error) {
      console.error('Error obteniendo libros recientes:', error);
      return [];
    }
  };

  return {
    saveReadingState,
    restoreReadingState,
    clearReadingState,
    getRecentBooks
  };
};