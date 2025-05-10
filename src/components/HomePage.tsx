import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Upload, Clock, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBookContext } from '../context/BookContext';
import FileUploader from './PDFUploader';

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setBook } = useBookContext();

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

  const handleOpenBook = async (book) => {
    try {
      // Create book object for the context
      const bookData = {
        title: book.title,
        pages: JSON.parse(book.content),
        currentPage: book.current_page,
        totalPages: book.total_pages,
        coverUrl: book.cover_url,
        lastRead: book.last_read
      };
      
      // Set the book in context
      setBook(bookData);
      
      // Navigate to reader
      navigate('/reader');
    } catch (error) {
      console.error('Error opening book:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Bienvenido a{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Lexingo
            </span>
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Tu asistente de lectura con traducción instantánea
          </p>
        </div>

        {/* Recent Books Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Clock className="w-4 h-4 mr-2 text-purple-500" />
              Continuar leyendo
            </h2>
            {recentBooks.length > 0 && (
              <button
                onClick={() => navigate('/books')}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Ver todos
              </button>
            )}
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : recentBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentBooks.slice(0, 6).map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleOpenBook(book)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                        <Book className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                      <div className="flex justify-between text-xs text-white mb-1">
                        <span>{Math.round((book.current_page / book.total_pages) * 100)}%</span>
                        <span>Página {book.current_page} de {book.total_pages}</span>
                      </div>
                      <div className="bg-gray-600/50 rounded-full h-1">
                        <div 
                          className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Última lectura: {new Date(book.last_read).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                No hay libros recientes
              </p>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center">
            <Plus className="w-4 h-4 mr-2 text-purple-500" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Cargar nuevo libro
            </h2>
          </div>
          <FileUploader onFileProcessed={fetchRecentBooks} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/books')}
            className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300 transform hover:scale-105"
          >
            <Book className="w-8 h-8 text-purple-500 mb-3 mx-auto" />
            <span className="block text-sm font-medium text-gray-900 dark:text-white">
              Mis Libros
            </span>
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-300 transform hover:scale-105"
          >
            <Upload className="w-8 h-8 text-blue-500 mb-3 mx-auto" />
            <span className="block text-sm font-medium text-gray-900 dark:text-white">
              Importar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}