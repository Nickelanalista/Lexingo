import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Upload, Clock, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FileUploader from './PDFUploader';

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentBooks();
  }, []);

  const fetchRecentBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false });

      if (error) throw error;
      setRecentBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBook = (book) => {
    navigate('/reader', { state: { bookId: book.id } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Welcome Section - Minimal */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Bienvenido a{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Lexingo
          </span>
        </h1>
      </div>

      {/* Recent Books Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Clock className="w-4 h-4 mr-2 text-purple-500" />
            Continuar leyendo
          </h2>
          <button
            onClick={() => navigate('/books')}
            className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Ver todos
          </button>
        </div>

        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : recentBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentBooks.slice(0, 2).map((book) => (
              <div
                key={book.id}
                onClick={() => handleOpenBook(book)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden flex"
              >
                {/* Book Cover/Icon */}
                <div className="w-20 h-24 bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Book className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                {/* Book Info */}
                <div className="p-3 flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">
                    {book.title}
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Página {book.current_page} de {book.total_pages}
                    </span>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <Book className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No hay libros recientes
            </p>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <Plus className="w-4 h-4 mr-2 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cargar nuevo libro
          </h2>
        </div>
        <FileUploader onFileProcessed={() => fetchRecentBooks()} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/books')}
          className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <Book className="w-6 h-6 text-purple-500 mb-2 mx-auto" />
          <span className="block text-sm font-medium text-gray-900 dark:text-white">
            Mis Libros
          </span>
        </button>
        
        <button
          onClick={() => navigate('/settings')}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Upload className="w-6 h-6 text-blue-500 mb-2 mx-auto" />
          <span className="block text-sm font-medium text-gray-900 dark:text-white">
            Importar
          </span>
        </button>
      </div>
    </div>
  );
}