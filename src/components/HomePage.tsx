import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FileUploader from './PDFUploader';

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
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
        .order('last_read', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % recentBooks.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + recentBooks.length) % recentBooks.length);
  };

  const handleOpenBook = (book) => {
    navigate('/reader', { state: { bookId: book.id } });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Section - More compact */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bienvenido a{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Lexingo
          </span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
          Tu asistente de lectura con traducción instantánea
        </p>
      </div>

      {/* Recent Books Section - Adjusted height */}
      {recentBooks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Book className="w-5 h-5 mr-2 text-purple-500" />
            Continuar leyendo
          </h2>
          <div className="relative">
            <div className="overflow-hidden rounded-lg shadow-lg">
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {recentBooks.map((book) => (
                  <div
                    key={book.id}
                    className="w-full flex-shrink-0 relative h-[200px] sm:h-[250px] bg-gradient-to-br from-purple-500/10 to-blue-500/10 cursor-pointer"
                    onClick={() => handleOpenBook(book)}
                  >
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Book className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <div className="text-white w-full">
                        <h3 className="text-lg font-bold mb-2 truncate">{book.title}</h3>
                        <div className="flex items-center space-x-3 text-sm">
                          <span>
                            Página {book.current_page} de {book.total_pages}
                          </span>
                          <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${(book.current_page / book.total_pages) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {recentBooks.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-gray-800 hover:bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-gray-800 hover:bg-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Section - More compact */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
          Cargar nuevo libro
        </h2>
        <div className="max-w-md mx-auto">
          <FileUploader onFileProcessed={() => fetchRecentBooks()} />
        </div>
      </div>

      {/* Sample Books Section - More compact grid */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
          Libros de ejemplo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Book className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Libro de muestra {i}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Ejemplo para probar la funcionalidad
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}