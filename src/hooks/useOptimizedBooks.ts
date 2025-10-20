import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface UserBook {
  id: string;
  title: string;
  user_id: string;
  cover_url: string;
  total_pages: number;
  current_page: number;
  content: string;
  created_at: string;
  last_read: string;
  bookmarked?: boolean;
  bookmark_page?: number;
  bookmark_position?: number;
  bookmark_updated_at?: string;
}

interface CommunityBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  filename: string;
  totalPages: number;
}

interface BookCache {
  books: UserBook[] | CommunityBook[];
  timestamp: number;
  type: 'user' | 'community';
}

// Versión optimizada para localStorage que excluye el contenido completo
interface OptimizedBookCache {
  books: (Omit<UserBook, 'content'> | Omit<CommunityBook, 'content'>)[];
  timestamp: number;
  type: 'user' | 'community';
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos - cache más duradero
const LOCAL_STORAGE_KEY = 'lexingo_books_cache';
const MAX_STORAGE_SIZE = 2000000; // 2MB límite más conservador
const MAX_CACHED_BOOKS = 20; // Reducir número de libros en caché
const bookCache = new Map<string, BookCache>();

// Función para calcular el tamaño aproximado de un objeto JSON
const getObjectSize = (obj: any): number => {
  return new Blob([JSON.stringify(obj)]).size;
};

// Función de limpieza de emergencia para corregir problemas de quota existentes
const emergencyCleanup = () => {
  try {
    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storageData) return;
    
    const currentSize = new Blob([storageData]).size;
    
    if (currentSize > MAX_STORAGE_SIZE) {
      cleanupLocalStorage();
    }
  } catch (error) {
    console.warn('[useOptimizedBooks] Error en limpieza de emergencia, eliminando caché completo:', error);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};

// Función para limpiar localStorage de forma segura
const cleanupLocalStorage = () => {
  try {
    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storageData) {
      const parsedData = JSON.parse(storageData);
      const keys = Object.keys(parsedData);
      
      // Mantener solo los más recientes según el límite
      const sortedKeys = keys.sort((a, b) => {
        const dateA = parsedData[a]?.timestamp || 0;
        const dateB = parsedData[b]?.timestamp || 0;
        return dateB - dateA; // Más recientes primero
      });
      
      const cleanedData: any = {};
      const keysToKeep = Math.min(MAX_CACHED_BOOKS / 2, sortedKeys.length); // Mantener solo la mitad
      for (let i = 0; i < keysToKeep; i++) {
        cleanedData[sortedKeys[i]] = parsedData[sortedKeys[i]];
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanedData));
    }
  } catch (error) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};

// Funciones para persistencia en localStorage
const saveToLocalStorage = (key: string, data: BookCache) => {
  try {
    // Limpiar localStorage proactivamente si está cerca del límite
    try {
      const currentSize = new Blob([localStorage.getItem(LOCAL_STORAGE_KEY) || '{}']).size;
      if (currentSize > MAX_STORAGE_SIZE * 0.8) { // Si está al 80% del límite
        cleanupLocalStorage();
      }
    } catch (cleanupError) {
      console.warn('[useOptimizedBooks] Error en limpieza proactiva:', cleanupError);
    }

    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY) || '{}';
    const parsedData = JSON.parse(storageData);
    
    // Limpiar datos antiguos si hay demasiados
    const keys = Object.keys(parsedData);
    if (keys.length > MAX_CACHED_BOOKS) { // Limitar número de libros en caché
      const sortedKeys = keys.sort((a, b) => {
        const dateA = parsedData[a]?.timestamp || 0;
        const dateB = parsedData[b]?.timestamp || 0;
        return dateA - dateB; // Más antiguos primero
      });
      
      // Eliminar hasta llegar al límite máximo
      const toRemove = keys.length - MAX_CACHED_BOOKS;
      for (let i = 0; i < toRemove; i++) {
        delete parsedData[sortedKeys[i]];
      }
    }
    
    // Crear versión optimizada sin contenido completo para ahorrar espacio
    const optimizedData: OptimizedBookCache = {
      books: data.books.map(book => {
        const { content, ...bookWithoutContent } = book as any;
        return bookWithoutContent;
      }),
      timestamp: data.timestamp,
      type: data.type
    };
    
    parsedData[key] = optimizedData;
    const jsonString = JSON.stringify(parsedData);
    
    // Verificar tamaño antes de guardar - usar límite más conservador
    if (getObjectSize(parsedData) > MAX_STORAGE_SIZE) { // Límite más conservador
      // Si es demasiado grande, limpiar más agresivamente
      const remainingKeys = Object.keys(parsedData);
      const halfToRemove = Math.floor(remainingKeys.length / 2);
      
      const sortedKeys = remainingKeys.sort((a, b) => {
        const dateA = parsedData[a]?.timestamp || 0;
        const dateB = parsedData[b]?.timestamp || 0;
        return dateA - dateB;
      });
      
      for (let i = 0; i < halfToRemove; i++) {
        delete parsedData[sortedKeys[i]];
      }
      
      // Intentar de nuevo con la versión optimizada
      parsedData[key] = optimizedData;
    }
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedData));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage lleno, limpiando caché...');
      // Limpiar todo el caché y intentar solo con el elemento actual
      try {
        // Usar versión optimizada incluso para fallback
        const fallbackData = {
          books: data.books.map(book => {
            const { content, ...bookWithoutContent } = book as any;
            return bookWithoutContent;
          }),
          timestamp: data.timestamp,
          type: data.type
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ [key]: fallbackData }));
      } catch (secondError) {
        console.error('No se pudo guardar en localStorage ni después de limpiar:', secondError);
        // Como último recurso, limpiar completamente
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } else {
      console.error('Error saving to localStorage:', error);
    }
  }
};

const loadFromLocalStorage = (key: string): BookCache | null => {
  try {
    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storageData) return null;
    
    const parsedData = JSON.parse(storageData);
    const cached = parsedData[key];
    
    if (!cached) return null;
    
    // Verificar si el cache sigue siendo válido
    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      // Cache expirado, eliminar
      delete parsedData[key];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedData));
      return null;
    }
    
    return cached;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

export const useOptimizedBooks = () => {
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [communityBooks, setCommunityBooks] = useState<CommunityBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para verificar si el cache es válido (memoria o localStorage)
  const isCacheValid = (cacheKey: string): boolean => {
    // Verificar cache en memoria primero
    const memoryCache = bookCache.get(cacheKey);
    if (memoryCache) {
      const now = Date.now();
      if (now - memoryCache.timestamp < CACHE_DURATION) {
        return true;
      } else {
        // Cache en memoria expirado, eliminarlo
        bookCache.delete(cacheKey);
      }
    }
    
    // Verificar cache en localStorage
    const localCache = loadFromLocalStorage(cacheKey);
    if (localCache) {
      // Cargar del localStorage al cache en memoria
      bookCache.set(cacheKey, localCache);
      return true;
    }
    
    return false;
  };

  // Función para obtener libros del usuario con cache
  const fetchUserBooks = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'user_books';
    
    // Verificar cache si no es forzado
    if (!forceRefresh && isCacheValid(cacheKey)) {
      const cached = bookCache.get(cacheKey);
      if (cached && cached.type === 'user') {
        setUserBooks(cached.books as UserBook[]);
        return cached.books as UserBook[];
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserBooks([]);
        return [];
      }

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false });

      if (error) throw error;

      const books = data || [];
      
      // Guardar en cache (memoria y localStorage)
      const cacheData = {
        books,
        timestamp: Date.now(),
        type: 'user' as const
      };
      bookCache.set(cacheKey, cacheData);
      saveToLocalStorage(cacheKey, cacheData);

      setUserBooks(books);
      return books;
    } catch (err) {
      console.error('Error fetching user books:', err);
      setError('Error al cargar los libros del usuario');
      return [];
    }
  }, []);

  // Función para obtener libros comunitarios con cache
  const fetchCommunityBooks = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'community_books';
    
    // Verificar cache si no es forzado
    if (!forceRefresh && isCacheValid(cacheKey)) {
      const cached = bookCache.get(cacheKey);
      if (cached && cached.type === 'community') {
        setCommunityBooks(cached.books as CommunityBook[]);
        return cached.books as CommunityBook[];
      }
    }

    try {
      // Libros comunitarios con rutas corregidas
      const books: CommunityBook[] = [
        {
          id: '1',
          title: 'The Adventures of Sherlock Holmes',
          author: 'Arthur Conan Doyle',
          cover: '/img/books/the-adventures-of-sherlock-holmes.jpg',
          filename: 'the-adventures-of-sherlock-holmes.pdf',
          totalPages: 120
        },
        {
          id: '2', 
          title: 'Natural Remedies Encyclopedia',
          author: 'Barbara O\'Neill',
          cover: '/img/books/barbara-oneill-natural-remedies.jpg',
          filename: 'barbara-oneill-natural-remedies.pdf',
          totalPages: 186
        },
        {
          id: '3',
          title: 'Rich Dad\'s Retire Young Retire Rich',
          author: 'Robert Kiyosaki',
          cover: '/img/books/robert-kiyosaki-rich-dad-49-retirement.jpg',
          filename: 'robert-kiyosaki-rich-dad-49-retirement.pdf',
          totalPages: 456
        },
        {
          id: '4',
          title: 'The Alchemist',
          author: 'Paulo Coelho',
          cover: '/img/books/the-alchemist.jpg',
          filename: 'the-alchemist.pdf',
          totalPages: 163
        }
      ];

      // Guardar en cache (memoria y localStorage)
      const cacheData = {
        books,
        timestamp: Date.now(),
        type: 'community' as const
      };
      bookCache.set(cacheKey, cacheData);
      saveToLocalStorage(cacheKey, cacheData);

      setCommunityBooks(books);
      return books;
    } catch (err) {
      console.error('Error fetching community books:', err);
      setError('Error al cargar los libros comunitarios');
      return [];
    }
  }, []);

  // Función para obtener libros recientes con progreso
  const getRecentBooks = useMemo(() => {
    return userBooks
      .filter(book => {
        // Solo incluir libros con progreso y contenido válido
        return book.current_page > 0 && 
               book.content && 
               book.content !== '[]' &&
               book.total_pages > 0;
      })
      .sort((a, b) => new Date(b.last_read).getTime() - new Date(a.last_read).getTime())
      .slice(0, 10)
      .map(book => ({
        ...book,
        progress: Math.round((book.current_page / book.total_pages) * 100),
        isRecent: true
      }));
  }, [userBooks]);

  // Función para obtener libros marcados
  const getBookmarkedBooks = useMemo(() => {
    return userBooks.filter(book => {
      return book.bookmarked && 
             book.content && 
             book.content !== '[]' &&
             book.total_pages > 0;
    });
  }, [userBooks]);

  // Función para limpiar cache (memoria y localStorage)
  const clearCache = useCallback(() => {
    bookCache.clear();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);

  // Función para refrescar todos los datos
  const refreshAllBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchUserBooks(true),
        fetchCommunityBooks(true)
      ]);
    } catch (err) {
      console.error('Error refreshing books:', err);
      setError('Error al actualizar los libros');
    } finally {
      setLoading(false);
    }
  }, [fetchUserBooks, fetchCommunityBooks]);

  // Cargar datos iniciales
  useEffect(() => {
    // Ejecutar limpieza de emergencia al cargar
    emergencyCleanup();
    
    // Limpiar caché si tenemos libros con contenido vacío
    const hasCachedBooks = bookCache.size > 0;
    if (hasCachedBooks) {
      clearCache();
    }
    
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchUserBooks(),
          fetchCommunityBooks()
        ]);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Error al cargar los datos iniciales');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchUserBooks, fetchCommunityBooks]);

  return {
    userBooks,
    communityBooks,
    recentBooks: getRecentBooks,
    bookmarkedBooks: getBookmarkedBooks,
    loading,
    error,
    fetchUserBooks,
    fetchCommunityBooks,
    refreshAllBooks,
    clearCache
  };
};

export default useOptimizedBooks; 