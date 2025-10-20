import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, RefreshCw, XCircle, X } from 'lucide-react';
import { useBookContext } from '../context/BookContext';
import { ModernBookCarousel } from './ModernBookCarousel';
import { useOptimizedBooks } from '../hooks/useOptimizedBooks';
import { supabase } from '../lib/supabase';
import MinimalLoadingIndicator from './MinimalLoadingIndicator';

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
  const [bookError, setBookError] = useState<string | null>(null);
  
  const {
    userBooks,
    communityBooks,
    recentBooks,
    bookmarkedBooks,
    loading,
    error,
    refreshAllBooks,
    clearCache
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

  // Efecto para refrescar datos cuando se carga la página de inicio
  useEffect(() => {
    // Limpiar caché y refrescar datos para evitar mostrar libros eliminados
    const refreshOnMount = async () => {
      // Solo refrescar si no estamos cargando ya
      if (!loading) {
        await refreshAllBooks();
      }
    };
    
    refreshOnMount();
  }, []); // Solo al montar el componente

  // Función para refrescar manualmente los datos
  const handleRefresh = async () => {
    clearCache(); // Limpiar caché primero
    await refreshAllBooks(); // Luego refrescar
  };

  // Mapear libros del usuario para el carrusel (solo libros válidos)
  const mappedUserBooks: Book[] = userBooks
    .filter(book => {
      // Solo incluir libros con contenido válido (menos estricto)
      return book.content && 
             book.content !== '[]' &&
             book.total_pages > 0 &&
             book.title &&
             !book.content.includes('Este libro parece no tener contenido disponible');
    })
    .map(book => ({
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


  const handleBookClick = async (book: Book) => {
    // Buscar el libro original para obtener todos los datos
    const userBook = userBooks.find(b => b.id === book.id);
    const communityBook = communityBooks.find(b => b.id === book.id);

    if (userBook) {
      // Verificar que el libro tenga contenido válido antes de abrir
      let parsedContent;
      try {
        parsedContent = JSON.parse(userBook.content || '[]');
      } catch (error) {
        setBookError(`El libro "${userBook.title}" tiene datos corruptos. Intenta subirlo nuevamente.`);
        setTimeout(() => setBookError(null), 5000);
        return;
      }

      // Verificar que el contenido no esté vacío o corrupto
      if (!parsedContent || parsedContent.length === 0 || 
          (typeof userBook.content === 'string' && userBook.content.includes('Este libro parece no tener contenido disponible'))) {
        // Mostrar mensaje de error amigable
        setBookError(`El libro "${userBook.title}" no tiene contenido válido. Es posible que los datos se hayan corrompido.`);
        setTimeout(() => setBookError(null), 5000);
        return;
      }

      // Convertir formato para el contexto
      const bookForContext = {
        id: userBook.id,
        title: userBook.title,
        content: userBook.content,
        totalPages: userBook.total_pages,
        currentPage: userBook.current_page,
        pages: parsedContent,
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
          setBookError(`No se pudo cargar el libro "${communityBook.title}". Verifica tu conexión e intenta nuevamente.`);
          setTimeout(() => setBookError(null), 5000);
        }
      } catch (error) {
        setBookError(`Error al acceder al libro "${communityBook.title}". Intenta más tarde.`);
        setTimeout(() => setBookError(null), 5000);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <MinimalLoadingIndicator 
          message="Cargando" 
          size="large" 
          showMessage={true} 
        />
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
    <>
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes fade-in-menu {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in-menu 0.2s ease-out;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-24 md:pb-8">
        
        {/* Header simple como estaba antes */}
        <div className="mb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">
              <span className="text-gray-800 dark:text-white">Hola </span>
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 via-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x bg-[length:400%_400%] font-extrabold">
                {userName}
              </span>
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ¿Qué quieres leer hoy?
              </p>
            </div>
            
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs rounded-lg shadow-sm hover:shadow-md transition-all transform hover:scale-105"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Mensaje de error para libros */}
        {bookError && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {bookError}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setBookError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sección destacada: Continuar leyendo - Glassmorphism con degradado morado/negro */}
        {recentBooks.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-black/40 to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 mb-8 shadow-2xl border border-purple-500/20">
            {/* Efectos glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-purple-900/20 to-black/30 backdrop-blur-sm"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full -translate-y-20 translate-x-20 blur-2xl animate-float"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-700/20 to-transparent rounded-full translate-y-16 -translate-x-16 blur-2xl animate-float"></div>
            
            <div className="relative">
              <ModernBookCarousel
                title="📚 Continuar leyendo"
                subtitle="Retoma donde lo dejaste"
                books={recentBooks.map(book => ({
                  id: book.id,
                  title: book.title,
                  author: '',
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
          </div>
        )}


        {/* Biblioteca comunitaria - Glassmorphism mejorado */}
        {mappedCommunityBooks.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-black/30 to-blue-900/20 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-purple-400/20 shadow-2xl">
            {/* Efectos glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-purple-900/10 to-black/20 backdrop-blur-sm"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-600/15 to-transparent rounded-full -translate-y-16 -translate-x-16 blur-2xl animate-float"></div>
            <div className="absolute bottom-0 right-0 w-28 h-28 bg-gradient-to-tl from-purple-600/15 to-transparent rounded-full translate-y-14 translate-x-14 blur-2xl animate-float"></div>
            
            <div className="relative">
              <ModernBookCarousel
                title="🌍 Biblioteca comunitaria"
                subtitle="Lecturas seleccionadas por la comunidad"
                books={mappedCommunityBooks}
                onBookClick={handleBookClick}
                className=""
              />
            </div>
          </div>
        )}

        {/* Mi biblioteca personal - Glassmorphism mejorado */}
        {mappedUserBooks.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-800/25 via-black/35 to-purple-900/20 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-purple-300/20 shadow-2xl">
            {/* Efectos glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-purple-800/15 to-black/25 backdrop-blur-sm"></div>
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-full -translate-y-18 translate-x-18 blur-2xl animate-float"></div>
            <div className="absolute bottom-0 left-0 w-30 h-30 bg-gradient-to-tr from-purple-700/20 to-transparent rounded-full translate-y-15 -translate-x-15 blur-2xl animate-float"></div>
            
            <div className="relative">
              <ModernBookCarousel
                title="📚 Mi biblioteca personal"
                subtitle="Tus libros subidos y favoritos"
                books={mappedUserBooks.map(book => ({
                  ...book,
                  currentPage: userBooks.find(ub => ub.id === book.id)?.current_page,
                  totalPages: userBooks.find(ub => ub.id === book.id)?.total_pages,
                  showOptionsMenu: true
                }))}
                onBookClick={handleBookClick}
                showProgress={true}
                className=""
                onEditTitle={(bookId) => {
                  // Función para editar título
                  const newTitle = prompt('Ingresa el nuevo título:', mappedUserBooks.find(b => b.id === bookId)?.title);
                  if (newTitle && newTitle.trim()) {
                    console.log('Editando título:', bookId, newTitle);
                    // Aquí se implementaría la lógica para actualizar el título en la base de datos
                  }
                }}
                onDelete={(bookId) => {
                  // Función para eliminar
                  const book = mappedUserBooks.find(b => b.id === bookId);
                  if (book && confirm(`¿Estás seguro de que quieres eliminar "${book.title}"?`)) {
                    console.log('Eliminando libro:', bookId);
                    // Aquí se implementaría la lógica para eliminar de la base de datos
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Estado vacío mejorado con características */}
        {userBooks.length === 0 && communityBooks.length === 0 && (
          <div className="space-y-8">
            {/* Mensaje de bienvenida - Glassmorphism mejorado */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-black/50 to-purple-800/30 backdrop-blur-xl rounded-2xl p-8 text-center text-white shadow-2xl border border-purple-400/30">
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-purple-900/20 to-black/30 backdrop-blur-sm"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-600/30 to-transparent rounded-full -translate-y-20 translate-x-20 blur-2xl animate-float"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-700/30 to-transparent rounded-full translate-y-16 -translate-x-16 blur-2xl animate-float"></div>
              
              <div className="relative z-10">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-lg">✨</span>
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold mb-4">¡Bienvenido a Lexingo!</h2>
                <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
                  Tu biblioteca personal está vacía. Comienza tu aventura de lectura con traducción instantánea e IA integrada.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => navigate('/upload')}
                    className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-purple-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 hover:-translate-y-1"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Subir mi primer libro</span>
                  </button>
                  
                  {mappedCommunityBooks.length > 0 && (
                    <button
                      onClick={() => {
                        const firstCommunityBook = mappedCommunityBooks[0];
                        if (firstCommunityBook) handleBookClick(firstCommunityBook);
                      }}
                      className="inline-flex items-center space-x-2 px-8 py-4 bg-white/20 text-white font-medium rounded-xl border border-white/30 backdrop-blur-sm hover:bg-white/30 transition-all transform hover:scale-105"
                    >
                      <BookOpen className="w-5 h-5" />
                      <span>Explorar comunidad</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Características destacadas - Glassmorphism */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-900/30 via-black/40 to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-400/30 shadow-2xl text-center hover:border-purple-300/50 transition-all duration-300">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto mb-4 flex items-center justify-center border border-white/20">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 drop-shadow-lg">Traducción Instantánea</h3>
                <p className="text-purple-200/80 text-sm">
                  Haz clic en cualquier palabra para obtener su traducción al instante. Aprende mientras lees.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 via-black/40 to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-400/30 shadow-2xl text-center hover:border-purple-300/50 transition-all duration-300">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto mb-4 flex items-center justify-center border border-white/20">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 drop-shadow-lg">IA Integrada</h3>
                <p className="text-purple-200/80 text-sm">
                  Chat con Lexingo AI para obtener resúmenes, explicaciones y respuestas sobre tu lectura.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 via-black/40 to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-400/30 shadow-2xl text-center hover:border-purple-300/50 transition-all duration-300">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto mb-4 flex items-center justify-center border border-white/20">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 drop-shadow-lg">Progreso Automático</h3>
                <p className="text-purple-200/80 text-sm">
                  Tu progreso se guarda automáticamente. Continúa donde lo dejaste desde cualquier dispositivo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default ModernHomePage; 