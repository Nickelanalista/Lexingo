import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Upload, Clock, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FileUploader from './PDFUploader';

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef(null);
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

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    
    const scrollAmount = 300;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(
          carouselRef.current.scrollWidth - carouselRef.current.clientWidth,
          scrollPosition + scrollAmount
        );
    
    carouselRef.current.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
    
    setScrollPosition(newPosition);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Welcome Section - Minimal */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Bienvenido a{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Lexingo
          </span>
        </h1>
      </div>

      {/* Recent Books Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Clock className="w-4 h-4 mr-2 text-purple-500" />
            Continuar leyendo
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel('left')}
              className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : recentBooks.length > 0 ? (
          <div 
            ref={carouselRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex gap-4 pb-4" style={{ minWidth: 'min-content' }}>
              {recentBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleOpenBook(book)}
                  className="flex-none w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden group"
                >
                  {/* Book Cover/Icon */}
                  <div className="w-full h-36 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                        <Book className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2">
                      <div className="flex justify-between items-center">
                        <span>{Math.round((book.current_page / book.total_pages) * 100)}%</span>
                        <span>Pág. {book.current_page}/{book.total_pages}</span>
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-purple-500 h-1 rounded-full"
                          style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Última lectura: {new Date(book.last_read).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
      <div className="mb-8">
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

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}