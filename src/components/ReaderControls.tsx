import React from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { ChevronLeft, ChevronRight, Sun, Moon, Plus, Minus, Maximize, Minimize, XCircle } from 'lucide-react';

interface ReaderControlsProps {
  onFullScreenModeClick?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

const ReaderControls: React.FC<ReaderControlsProps> = ({ 
  onFullScreenModeClick, 
  onExitFullScreen,
  isFullScreen = false
}) => {
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
    <div className={`reader-controls sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 ${isFullScreen ? 'sm:hidden' : ''}`}>
      <div className="mx-auto py-1.5 px-1 flex items-center justify-between">
        {/* Sección de navegación - ligeramente más grande */}
        <div className="flex items-center">
          <button
            onClick={goToPreviousPage}
            disabled={book.currentPage <= 1}
            className={`p-1 ${
              book.currentPage <= 1
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label="Página anterior"
          >
            <ChevronLeft size={17} />
          </button>
          
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mx-1">
            {book.currentPage}/{book.totalPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={book.currentPage >= book.totalPages}
            className={`p-1 ${
              book.currentPage >= book.totalPages
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label="Página siguiente"
          >
            <ChevronRight size={17} />
          </button>
        </div>
        
        {/* Grupo de botones de la derecha */}
        <div className="flex items-center">
          {/* Botón Modo Lectura / Salir Pantalla Completa */}
          {isFullScreen ? (
            <button
              onClick={onExitFullScreen}
              className="p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Salir de pantalla completa"
            >
              <XCircle size={17} />
            </button>
          ) : (
            <button
              onClick={onFullScreenModeClick}
              className="p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Modo lectura completa"
            >
              <Maximize size={17} />
            </button>
          )}
          
          {/* Separador */}
          <div className="h-6 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-2"></div>
          
          {/* Control de tamaño - más compacto */}
          <div className="flex items-center">
            <button
              onClick={decreaseFontSize}
              disabled={fontSize <= 12}
              className="p-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Reducir tamaño de fuente"
            >
              <Minus size={15} />
            </button>
            
            <span className="mx-1 text-sm font-medium text-gray-700 dark:text-gray-300">{fontSize}</span>
            
            <button
              onClick={increaseFontSize}
              disabled={fontSize >= 24}
              className="p-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Aumentar tamaño de fuente"
            >
              <Plus size={15} />
            </button>
          </div>
          
          {/* Separador */}
          <div className="h-6 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-2"></div>
          
          {/* Control de tema */}
          <button
            onClick={toggleTheme}
            className="p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderControls;