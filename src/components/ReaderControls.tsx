import React from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { ChevronLeft, ChevronRight, Sun, Moon, Plus, Minus } from 'lucide-react';

const ReaderControls: React.FC = () => {
  const { book, goToPage } = useBookContext();
  const { 
    theme, 
    toggleTheme, 
    fontSize, 
    increaseFontSize, 
    decreaseFontSize 
  } = useThemeContext();

  if (!book) return null;

  const goToPreviousPage = () => {
    if (book) {
      goToPage(book.currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (book) {
      goToPage(book.currentPage + 1);
    }
  };

  return (
    <div className="reader-controls sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto py-3 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousPage}
            disabled={book.currentPage <= 1}
            className={`p-2 rounded-full ${
              book.currentPage <= 1
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
            aria-label="Página anterior"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-sm font-medium dark:text-white">
            Página {book.currentPage} / {book.totalPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={book.currentPage >= book.totalPages}
            className={`p-2 rounded-full ${
              book.currentPage >= book.totalPages
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
            aria-label="Página siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center mr-2 border-r dark:border-gray-700 pr-2">
            <button
              onClick={decreaseFontSize}
              disabled={fontSize <= 12}
              className={`p-2 rounded-full ${
                fontSize <= 12
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
              aria-label="Reducir tamaño de fuente"
            >
              <Minus size={18} />
            </button>
            
            <span className="mx-2 text-sm dark:text-white">{fontSize}px</span>
            
            <button
              onClick={increaseFontSize}
              disabled={fontSize >= 24}
              className={`p-2 rounded-full ${
                fontSize >= 24
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
              aria-label="Aumentar tamaño de fuente"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderControls;