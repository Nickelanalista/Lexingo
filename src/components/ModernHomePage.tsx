import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen } from 'lucide-react';
import { useBookContext } from '../context/BookContext';
import { ModernBookCarousel } from './ModernBookCarousel';
import { useOptimizedBooks } from '../hooks/useOptimizedBooks';
import { supabase } from '../lib/supabase';

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  progress?: number;
  rating?: number;
  isRecent?: boolean;
}

export const ModernHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setBook } = useBookContext();
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('Usuario');
  
  const {
    userBooks,
    communityBooks,
    recentBooks,
    bookmarkedBooks,
    loading,
    error,
    refreshAllBooks
  } = useOptimizedBooks();

  // Establecer saludo según la hora del día y obtener datos del usuario
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Buenos días');
    } else if (hour < 18) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }

    // Obtener información del perfil del usuario
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        if (data?.name) {
          setUserName(data.name);
        } else if (user.user_metadata?.name) {
          setUserName(user.user_metadata.name);
        } else if (user.email) {
          // Usar la primera parte del email como nombre
          const emailName = user.email.split('@')[0];
          const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          setUserName(formattedName);
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
    };

    getProfile();
  }, []);

  // Mapear libros del usuario para el carrusel
  const mappedUserBooks: Book[] = userBooks.map(book => ({
    id: book.id,
    title: book.title,
    author: 'Usuario', // Puedes agregar author al UserBook interface si quieres
    cover: book.cover_url,
    progress: Math.round((book.current_page / book.total_pages) * 100),
    rating: Math.random() * 2 + 3, // Rating simulado
    isRecent: recentBooks.some(recent => recent.id === book.id)
  }));

  // Mapear libros comunitarios para el carrusel
  const mappedCommunityBooks: Book[] = communityBooks.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    rating: Math.random() * 2 + 3 // Rating simulado
  }));

  // Libros destacados (mix de recientes y populares)
  const featuredBooks: Book[] = [
    ...mappedUserBooks.slice(0, 3),
    ...mappedCommunityBooks.slice(0, 4)
  ].slice(0, 6);

  const handleBookClick = async (book: Book) => {
    // Buscar el libro original para obtener todos los datos
    const userBook = userBooks.find(b => b.id === book.id);
    const communityBook = communityBooks.find(b => b.id === book.id);

    if (userBook) {
      // Convertir formato para el contexto
      const bookForContext = {
        id: userBook.id,
        title: userBook.title,
        content: userBook.content,
        totalPages: userBook.total_pages,
        currentPage: userBook.current_page,
        pages: JSON.parse(userBook.content || '[]'), // Parsear el contenido
        bookmarked: userBook.bookmarked,
        bookmark_page: userBook.bookmark_page
      };
      
      setBook(bookForContext);
      navigate('/reader');
    } else if (communityBook) {
      // Para libros comunitarios, cargar desde archivo PDF
      try {
        const response = await fetch(`/books/${communityBook.filename}`);
        if (response.ok) {
          // Crear estructura de libro para el contexto
          const bookForContext = {
            id: communityBook.id,
            title: communityBook.title,
            content: '', // Se cargará dinámicamente por el lector PDF
            totalPages: communityBook.totalPages,
            currentPage: 1,
            pages: [], // Se llenará dinámicamente
            isCommunityBook: true,
            filename: communityBook.filename
          };
          
          setBook(bookForContext);
          navigate('/reader');
        } else {
          console.error('Error al cargar el libro comunitario');
        }
      } catch (error) {
        console.error('Error al cargar el libro comunitario:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando biblioteca...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <BookOpen className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">Error al cargar la biblioteca</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={refreshAllBooks}
            className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        
        {/* Header elegante con degradado animado */}
        <div className="mb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">
              <span className="text-gray-800 dark:text-white">Hola </span>
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 via-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x bg-[length:400%_400%] font-extrabold">
                {userName}
              </span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              ¿Qué quieres leer hoy?
            </p>
            
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs rounded-lg shadow-sm hover:shadow-md transition-all transform hover:scale-105"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Carrusel de libros recientes compacto */}
        {recentBooks.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-4 mb-6 border border-green-100/50 dark:border-green-700/20">
            <ModernBookCarousel
              title="📚 Continuar"
              subtitle="Retoma donde lo dejaste"
              books={recentBooks.map(book => ({
                id: book.id,
                title: book.title,
                author: 'Tu libro',
                cover: book.cover_url,
                progress: book.progress,
                currentPage: book.current_page,
                totalPages: book.total_pages,
                isRecent: true
              }))}
              onBookClick={handleBookClick}
              showProgress={true}
              className=""
            />
          </div>
        )}

        {/* Carrusel de libros destacados compacto */}
        {featuredBooks.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl p-4 mb-6 border border-purple-100/50 dark:border-purple-700/20">
            <ModernBookCarousel
              title="⭐ Destacados"
              subtitle="Selección especial"
              books={featuredBooks}
              onBookClick={handleBookClick}
              className=""
            />
          </div>
        )}

        {/* Carrusel de biblioteca comunitaria compacto */}
        {mappedCommunityBooks.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-4 mb-6 border border-blue-100/50 dark:border-blue-700/20">
            <ModernBookCarousel
              title="🌍 Comunidad"
              subtitle="Lecturas seleccionadas"
              books={mappedCommunityBooks}
              onBookClick={handleBookClick}
              className=""
            />
          </div>
        )}

        {/* Carrusel de tu biblioteca compacto */}
        {mappedUserBooks.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-xl p-4 mb-6 border border-orange-100/50 dark:border-orange-700/20">
            <ModernBookCarousel
              title="📖 Mi biblioteca"
              subtitle="Tus libros favoritos"
              books={mappedUserBooks.map(book => ({
                ...book,
                currentPage: userBooks.find(ub => ub.id === book.id)?.current_page,
                totalPages: userBooks.find(ub => ub.id === book.id)?.total_pages
              }))}
              onBookClick={handleBookClick}
              showProgress={true}
              className=""
            />
          </div>
        )}

        {/* Estado vacío compacto */}
        {userBooks.length === 0 && communityBooks.length === 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-xl p-6 text-center border border-indigo-100/50 dark:border-indigo-700/20">
            <div className="relative mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mx-auto flex items-center justify-center shadow-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-xs">✨</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              ¡Biblioteca vacía!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Agrega tu primer libro para comenzar
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg font-medium shadow-sm hover:shadow-md transition-all transform hover:scale-105"
            >
              🚀 Subir libro
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernHomePage; 