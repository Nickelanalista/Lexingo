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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Bienvenido a{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Lexingo
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Tu asistente de lectura con traducción instantánea. Mejora tu comprensión lectora en inglés de forma interactiva.
        </p>
      </div>

      {/* Recent Books Carousel */}
      {recentBooks.length > 0 && (
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
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
                    className="w-full flex-shrink-0 relative aspect-[16/9] bg-gradient-to-br from-purple-500/10 to-blue-500/10"
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
                        <Book className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <div className="text-white">
                        <h3 className="text-xl font-bold mb-2">{book.title}</h3>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm">
                            Página {book.current_page} de {book.total_pages}
                          </div>
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-gray-800 hover:bg-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-gray-800 hover:bg-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Cargar nuevo libro
        </h2>
        <div className="max-w-xl mx-auto">
          <FileUploader onFileProcessed={() => fetchRecentBooks()} />
        </div>
      </div>

      {/* Surprise Me Section */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-purple-500" />
            Sorpréndeme
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sample Books */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                <Book className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Libro de muestra {i}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Una breve descripción del libro de muestra para probar la funcionalidad.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}