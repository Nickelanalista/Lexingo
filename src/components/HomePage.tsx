import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Upload, Clock, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FileUploader from './PDFUploader';

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);
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

  const checkScrollButtons = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [recentBooks]);

  const scroll = (direction) => {
    if (!carouselRef.current) return;
    
    const scrollAmount = direction === 'left' ? -400 : 400;
    carouselRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });

    // Update scroll buttons after animation
    setTimeout(checkScrollButtons, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Bienvenido a{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Lexingo
            </span>
          </h1>
        </div>

        {/* Recent Books Section */}
        <div className="mb-12 relative group">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Clock className="w-4 h-4 mr-2 text-purple-500" />
              Continuar leyendo
            </h2>
          </div>

          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : recentBooks.length > 0 ? (
            <div className="relative">
              {/* Left Scroll Button */}
              {showLeftScroll && (
                <button
                  onClick={() => scroll('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full px-2 bg-gradient-to-r from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
              )}

              {/* Books Carousel */}
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 pl-1"
                onScroll={checkScrollButtons}
              >
                {recentBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex-none w-[300px] group/item transition-transform duration-300 transform hover:scale-105"
                    style={{ perspective: '1000px' }}
                  >
                    <div
                      onClick={() => handleOpenBook(book)}
                      className="relative h-[400px] rounded-lg overflow-hidden shadow-lg cursor-pointer transform-gpu transition-transform duration-500 hover:z-10"
                    >
                      {/* Book Cover */}
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                          <Book className="w-20 h-20 text-gray-400" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <h3 className="text-white text-lg font-bold mb-2 line-clamp-2">
                          {book.title}
                        </h3>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-300">
                            <span>Progreso: {Math.round((book.current_page / book.total_pages) * 100)}%</span>
                            <span>Página {book.current_page} de {book.total_pages}</span>
                          </div>
                          
                          <div className="bg-gray-600/50 rounded-full h-1">
                            <div 
                              className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                            />
                          </div>
                          
                          <p className="text-xs text-gray-400">
                            Última lectura: {new Date(book.last_read).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Scroll Button */}
              {showRightScroll && (
                <button
                  onClick={() => scroll('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full px-2 bg-gradient-to-l from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                No hay libros recientes
              </p>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Plus className="w-4 h-4 mr-2 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cargar nuevo libro
            </h2>
          </div>
          <FileUploader onFileProcessed={() => fetchRecentBooks()} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
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