import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Book, Trash2, BookOpen, Edit2, Check, X, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBookContext } from '../context/BookContext';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { loadBookAndSkipEmptyPages } = useBookContext();

  // Nuevos estados para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditingBook, setCurrentEditingBook] = useState(null);
  const [modalEditTitle, setModalEditTitle] = useState('');

  useEffect(() => {
    fetchBooks();
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
    if (!confirm('¿Estás seguro de que quieres eliminar este libro?')) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBooks(books.filter(book => book.id !== id));
    } catch (error) {
      console.error('Error deleting book:', error);
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
      const { error } = await supabase
        .from('books')
        .update({ title: newTitle })
        .eq('id', id);

      if (error) throw error;
      setBooks(books.map(book => 
        book.id === id ? { ...book, title: newTitle } : book
      ));
      closeEditModal();
    } catch (error) {
      console.error('Error updating book title:', error);
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
      
      console.log(`Abriendo libro: ${book.title}, página guardada: ${book.current_page}`);
      
      // Verificar que la página actual es válida
      let currentPage = book.current_page || 1;
      
      // Asegurarnos de que la página está dentro del rango válido
      if (currentPage > book.total_pages) {
        console.log(`La página guardada ${currentPage} excede el total (${book.total_pages}), reseteando a 1`);
        currentPage = 1;
      }
      
      // Usar la página actual guardada en la base de datos
      const bookData = {
        id: book.id,
        title: book.title,
        pages: JSON.parse(book.content),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-5xl pb-24">
      {/* Título y Subtítulo Modificados */}
      <div className="text-center pt-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Mis Libros
          </span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Disfruta de tus libros en un formato multilingüe
        </p>
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
                  {/* Botón Eliminar Reposicionado */}
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); // Prevenir que se abra el libro
                      handleDeleteBook(book.id);
                    }}
                    className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-md transition-colors duration-200"
                    title="Eliminar libro"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div onClick={() => handleOpenBook(book)} className="w-full h-full">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                        <Book className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
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
                  {/* Title & Edit Button */}
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white flex-1 truncate mr-2" title={book.title}>
                      {book.title}
                    </h3>
                    <button
                      onClick={() => startEditingTitle(book)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  {/* Información de Última Lectura y Páginas */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">
                    <p>
                      {isNewBook(book) ? 'Libro sin comenzar' : `Últ. lectura: ${new Date(book.last_read).toLocaleDateString()}`}
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
  );
}