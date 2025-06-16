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

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos - cache más duradero
const LOCAL_STORAGE_KEY = 'lexingo_books_cache';
const bookCache = new Map<string, BookCache>();

// Funciones para persistencia en localStorage
const saveToLocalStorage = (key: string, data: BookCache) => {
  try {
    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY) || '{}';
    const parsedData = JSON.parse(storageData);
    parsedData[key] = data;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedData));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
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
      .filter(book => book.current_page > 0)
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
    return userBooks.filter(book => book.bookmarked);
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