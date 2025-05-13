import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Book, Trash2, BookOpen, Edit2, Check, X, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBookContext } from '../context/BookContext';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();
  const { loadBookAndSkipEmptyPages } = useBookContext();

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
    setEditingId(book.id);
    setEditTitle(book.title);
  };

  const saveTitle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ title: editTitle })
        .eq('id', id);

      if (error) throw error;
      setBooks(books.map(book => 
        book.id === id ? { ...book, title: editTitle } : book
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating book title:', error);
    }
  };

  const handleOpenBook = async (book) => {
    try {
      // Indicar que estamos cargando
      setLoading(true);
      
      // Usar la página actual guardada en la base de datos
      const bookData = {
        id: book.id,
        title: book.title,
        pages: JSON.parse(book.content),
        currentPage: book.current_page || 1, // Usar la página guardada en lugar de forzar página 1
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
    <div className="container mx-auto px-4 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Mis Libros
      </h1>

      {books.length === 0 ? (
        <div className="text-center py-12">
          <Book className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay libros</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comienza subiendo tu primer libro desde la página principal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Cover Image */}
              <div 
                className="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden"
                onClick={() => handleOpenBook(book)}
              >
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
                
                {/* Reading Progress */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2">
                  <div className="flex justify-between items-center">
                    <span>Progreso: {Math.round((book.current_page / book.total_pages) * 100)}%</span>
                    <span>Página {book.current_page} de {book.total_pages}</span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-purple-500 h-1 rounded-full"
                      style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Title */}
                <div className="flex items-start justify-between mb-2">
                  {editingId === book.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                        autoFocus
                      />
                      <button
                        onClick={() => saveTitle(book.id)}
                        className="text-green-500 hover:text-green-600"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1 truncate mr-2">
                        {book.title}
                      </h3>
                      <button
                        onClick={() => startEditingTitle(book)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>

                {/* Last Read */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {isNewBook(book) ? (
                    'Libro sin comenzar'
                  ) : (
                    <span className="flex items-center">
                      {`Última lectura: ${new Date(book.last_read).toLocaleDateString()}`}
                      {book.bookmarked && (
                        <span className="ml-2 flex items-center text-blue-500" title="Tiene marcador guardado">
                          <BookmarkCheck size={14} />
                        </span>
                      )}
                    </span>
                  )}
                </p>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleOpenBook(book)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {isNewBook(book) ? 'Empezar' : 'Continuar'}
                  </button>

                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="inline-flex items-center p-2 text-red-600 hover:text-red-700 focus:outline-none"
                    title="Eliminar libro"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}