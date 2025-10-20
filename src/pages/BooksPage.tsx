import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Book, Trash2, BookOpen, Edit2, Check, X, BookmarkCheck, Plus, Clock, XCircle, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBookContext } from '../context/BookContext';
import BookCover from '../components/BookCover';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { loadBookAndSkipEmptyPages } = useBookContext();

  // Nuevos estados para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditingBook, setCurrentEditingBook] = useState(null);
  const [modalEditTitle, setModalEditTitle] = useState('');
  
  // Estado para mensaje de error
  const [bookError, setBookError] = useState<string | null>(null);
  
  // Estado para el menú de opciones
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  // Efecto para cerrar el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setOpenMenuId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    console.log('[DEBUG] Attempting to delete book with ID:', id);
    
    if (!confirm('¿Estás seguro de que quieres eliminar este libro?')) {
      console.log('[DEBUG] User cancelled deletion');
      return;
    }

    try {
      console.log('[DEBUG] Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[DEBUG] Error getting user:', userError);
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      if (!user) {
        console.error('[DEBUG] No user found');
        alert('Debes iniciar sesión para eliminar libros.');
        return;
      }
      
      console.log('[DEBUG] User ID:', user.id);
      console.log('[DEBUG] Deleting book...');
      
      const { data, error } = await supabase
        .from('books')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Asegurar que solo se eliminen los libros del usuario actual

      console.log('[DEBUG] Delete response data:', data);
      console.log('[DEBUG] Delete response error:', error);

      if (error) {
        console.error('[DEBUG] Error from Supabase:', error);
        alert(`Error al eliminar el libro: ${error.message}`);
        throw error;
      }
      
      console.log('[DEBUG] Book deleted successfully, updating local state...');
      setBooks(prevBooks => prevBooks.filter(book => book.id !== id));
      alert('Libro eliminado exitosamente.');
      
    } catch (error) {
      console.error('[DEBUG] Error deleting book:', error);
      alert('Error inesperado al eliminar el libro. Revisa la consola para más detalles.');
    }
  };

  const startEditingTitle = (book) => {
    setCurrentEditingBook(book);
    setModalEditTitle(book.title);
    setIsEditModalOpen(true);
  };

  const saveTitle = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) {
      alert('El título no puede estar vacío.');
      return;
    }
    
    try {
      console.log('[DEBUG] Updating book title. ID:', id, 'New title:', newTitle);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[DEBUG] Error getting user for title update:', userError);
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      const { data, error } = await supabase
        .from('books')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      console.log('[DEBUG] Update title response data:', data);
      console.log('[DEBUG] Update title response error:', error);

      if (error) {
        console.error('[DEBUG] Error from Supabase updating title:', error);
        alert(`Error al actualizar el título: ${error.message}`);
        throw error;
      }
      
      console.log('[DEBUG] Title updated successfully, updating local state...');
      setBooks(prevBooks => prevBooks.map(book => 
        book.id === id ? { ...book, title: newTitle } : book
      ));
      closeEditModal();
      alert('Título actualizado exitosamente.');
      
    } catch (error) {
      console.error('[DEBUG] Error updating book title:', error);
      alert('Error inesperado al actualizar el título. Revisa la consola para más detalles.');
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentEditingBook(null);
    setModalEditTitle('');
  };

  const handleSaveTitleFromModal = () => {
    if (currentEditingBook && modalEditTitle) {
      saveTitle(currentEditingBook.id, modalEditTitle);
    }
  };

  const handleOpenBook = async (book) => {
    try {
      // Indicar que estamos cargando
      setLoading(true);
      
      // VALIDACIÓN DE CONTENIDO - Verificar que el libro tenga contenido válido
      console.log(`[DEBUG] Abriendo libro: ${book.title}`);
      console.log(`[DEBUG] Content length: ${book.content?.length || 0}`);
      console.log(`[DEBUG] Content preview: ${book.content?.substring(0, 50)}...`);
      
      let parsedContent;
      try {
        parsedContent = JSON.parse(book.content || '[]');
      } catch (error) {
        console.log(`[DEBUG] JSON parse error:`, error);
        setBookError(`El libro "${book.title}" tiene datos corruptos. Intenta subirlo nuevamente.`);
        setTimeout(() => setBookError(null), 5000);
        return;
      }

      console.log(`[DEBUG] Parsed content length: ${parsedContent?.length || 0}`);
      console.log(`[DEBUG] Parsed content type: ${typeof parsedContent}`);

      // Verificar que el contenido no esté completamente vacío o corrupto
      if (!parsedContent || parsedContent.length === 0 || 
          (typeof book.content === 'string' && book.content.includes('Este libro parece no tener contenido disponible'))) {
        console.log(`[DEBUG] Content validation failed - empty, null, or corrupted`);
        setBookError(`El libro "${book.title}" no tiene contenido válido. Es posible que los datos se hayan corrompido.`);
        setTimeout(() => setBookError(null), 5000);
        return;
      }

      // Para libros con pocas páginas (posiblemente corruptos), verificar si tienen al menos ALGUNAS páginas válidas
      if (parsedContent.length < 10) {
        const pagesWithContent = parsedContent.filter(page => 
          page && page.content && page.content.trim().length > 0
        ).length;
        
        console.log(`[DEBUG] Book has ${parsedContent.length} pages, ${pagesWithContent} with content`);
        
        if (pagesWithContent === 0) {
          setBookError(`El libro "${book.title}" no tiene páginas con contenido válido.`);
          setTimeout(() => setBookError(null), 5000);
          return;
        }
      }
      
      console.log(`[DEBUG] Content validation passed!`);
      
      // Verificar que la página actual es válida
      let currentPage = book.current_page || 1;
      
      // Asegurarnos de que la página está dentro del rango válido
      if (currentPage > book.total_pages) {
        currentPage = 1;
      }
      
      // Usar la página actual guardada en la base de datos
      const bookData = {
        id: book.id,
        title: book.title,
        pages: parsedContent, // Usar el contenido ya parseado y validado
        currentPage: currentPage,
        totalPages: book.total_pages,
        coverUrl: book.cover_url,
        lastRead: book.last_read,
        bookmarked: book.bookmarked,
        bookmark_page: book.bookmark_page,
        bookmark_position: book.bookmark_position,
        bookmark_updated_at: book.bookmark_updated_at
      };
      
      // Si es un libro sin comenzar, eliminar la marca de mensaje mostrado
      // para que el mensaje de páginas omitidas aparezca nuevamente
      if (isNewBook(book)) {
        const bookId = book.title.replace(/\s+/g, '_').toLowerCase();
        localStorage.removeItem(`book_${bookId}_message_shown`);
      }
      
      // Cargar el libro manteniendo la página actual
      loadBookAndSkipEmptyPages(bookData);
      
      // Navegar hacia la página de lectura
      navigate('/reader');
    } catch (error) {
      console.error('Error al abrir el libro:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar si un libro no ha sido comenzado
  const isNewBook = (book) => {
    return book.current_page === 1 && new Date(book.last_read).getTime() === new Date(book.created_at).getTime();
  };

  // Función para calcular tiempo desde la última lectura
  const getTimeAgo = (lastReadDate) => {
    const now = new Date();
    const lastRead = new Date(lastReadDate);
    const diffTime = Math.abs(now.getTime() - lastRead.getTime());
    
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffMinutes < 1) {
      return 'Ahora mismo';
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? 'Hace 1 min' : `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`;
    } else if (diffDays < 7) {
      if (diffDays === 1) {
        return 'Ayer';
      } else {
        return `Hace ${diffDays} días`;
      }
    } else if (diffDays < 30) {
      return diffWeeks === 1 ? 'Hace 1 semana' : `Hace ${diffWeeks} semanas`;
    } else if (diffDays < 365) {
      return diffMonths === 1 ? 'Hace 1 mes' : `Hace ${diffMonths} meses`;
    } else {
      return diffYears === 1 ? 'Hace 1 año' : `Hace ${diffYears} años`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes fade-in-menu {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in-menu 0.2s ease-out;
        }
      `}</style>
      
      <div className="container mx-auto px-4 max-w-5xl pb-24">
      {/* Título y Subtítulo Modificados */}
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Mis Libros
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
          Disfruta de tus libros en un formato multilingüe
        </p>
        
        {/* Mensaje de error para libros */}
        {bookError && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 max-w-md mx-auto">
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
        
        {/* Botón de añadir libro */}
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Plus size={20} className="mr-2" />
          Añadir Libro
        </button>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-12">
          <Book className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay libros</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comienza subiendo tu primer libro desde la página principal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300"
            >
              {/* Sección Superior: Imagen y Contenido Principal */}
              <div>
                {/* Cover Image & Progress Overlay */}
                <div
                  className="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden cursor-pointer"
                >
                  {/* Menú de opciones con 3 puntos */}
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={(e) => { 
                        console.log('[DEBUG] 3-dots menu button clicked for book:', book.id, book.title);
                        console.log('[DEBUG] Current openMenuId:', openMenuId);
                        e.preventDefault();
                        e.stopPropagation();
                        const newMenuId = openMenuId === book.id ? null : book.id;
                        console.log('[DEBUG] Setting openMenuId to:', newMenuId);
                        setOpenMenuId(newMenuId);
                      }}
                      className="w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200 shadow-md"
                      title="Opciones"
                    >
                      <MoreVertical size={16} className="text-white" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {openMenuId === book.id && (
                      <div className="absolute right-0 top-10 w-36 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/20 dark:border-gray-700/30 py-1 z-50 animate-fade-in">
                        <button
                          onMouseDown={(e) => {
                            console.log('[DEBUG] Edit button mouse down for book:', book.id, book.title);
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            console.log('[DEBUG] Edit button clicked for book:', book.id, book.title);
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Usar setTimeout para asegurar que el evento se procese
                            setTimeout(() => {
                              console.log('[DEBUG] Processing edit after timeout...');
                              setOpenMenuId(null);
                              startEditingTitle(book);
                            }, 10);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 flex items-center transition-colors"
                        >
                          <Edit2 className="w-3 h-3 mr-2" />
                          Editar nombre
                        </button>
                        <button
                          onMouseDown={(e) => {
                            console.log('[DEBUG] Delete button mouse down for book:', book.id, book.title);
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            console.log('[DEBUG] Delete button clicked for book:', book.id, book.title);
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Usar setTimeout para asegurar que el evento se procese
                            setTimeout(() => {
                              console.log('[DEBUG] Processing delete after timeout...');
                              setOpenMenuId(null);
                              handleDeleteBook(book.id);
                            }, 10);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 flex items-center transition-colors"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>

                  <div onClick={() => handleOpenBook(book)} className="w-full h-full">
                    <BookCover
                      src={book.cover_url}
                      title={book.title}
                      alt={book.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {/* Reading Progress BAR (solo barra y %) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2">
                      <div className="flex justify-between items-center mb-0.5">
                        <span>Progreso: {Math.round((book.current_page / book.total_pages) * 100)}%</span>
                      </div>
                      <div className="bg-gray-400 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full"
                          style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido Principal de la Tarjeta */}
                <div className="p-3">
                  {/* Title */}
                  <div className="mb-1.5">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white truncate" title={book.title}>
                      {book.title}
                    </h3>
                  </div>

                  {/* Información de Última Lectura y Páginas */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">
                    <p className="flex items-center">
                      {isNewBook(book) ? (
                        <>
                          <Clock size={12} className="mr-1" />
                          Libro sin comenzar
                        </>
                      ) : (
                        <>
                          <Clock size={12} className="mr-1" />
                          {getTimeAgo(book.last_read)}
                        </>
                      )}
                      {book.bookmarked && !isNewBook(book) && (
                        <BookmarkCheck size={14} className="inline ml-1 text-blue-500" title="Marcador guardado" />
                      )}
                    </p>
                    <p>Página {book.current_page} de {book.total_pages}</p>
                  </div>
                </div>
              </div>

              {/* Sección Inferior: Acciones */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleOpenBook(book)}
                    className="flex-grow inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <BookOpen className="h-4 w-4 mr-1.5" />
                    {isNewBook(book) ? 'Empezar' : 'Continuar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Editar Título */}
      {isEditModalOpen && currentEditingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Editar Título</h2>
            <input
              type="text"
              value={modalEditTitle}
              onChange={(e) => setModalEditTitle(e.target.value)}
              className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitleFromModal()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTitleFromModal}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}