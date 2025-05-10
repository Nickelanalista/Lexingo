import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import { Home, Sun, Moon, Maximize, Minimize, ArrowLeft, ArrowRight, Minus, Plus, Languages, Bookmark, BookmarkCheck, Book, Library, User, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface ReaderProps {
  onFullScreenMode?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

const Reader: React.FC<ReaderProps> = ({ 
  onFullScreenMode, 
  onExitFullScreen,
  isFullScreen = false 
}) => {
  const navigate = useNavigate();
  const { book, goToPage } = useBookContext();
  const { 
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    theme,
    toggleTheme
  } = useThemeContext();

  const [selectedWord, setSelectedWord] = useState<string>('');
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [hasBookmark, setHasBookmark] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  // Find first non-empty page
  useEffect(() => {
    if (book && book.currentPage === 1) {
      const firstNonEmptyPage = book.pages.findIndex(page => 
        page.content.trim().length > 0
      );
      if (firstNonEmptyPage > 0) {
        goToPage(firstNonEmptyPage + 1);
      }
    }
  }, [book]);

  // Handle word click
  const handleWordClick = useCallback((word: Word, event: React.MouseEvent<HTMLSpanElement>) => {
    if (word.text.trim() === '') return;
    
    setSelectedWord(word.text);
    setTooltipAnchor(event.currentTarget);
    setIsTooltipOpen(true);
  }, []);

  // Close tooltip
  const closeTooltip = useCallback(() => {
    setIsTooltipOpen(false);
  }, []);

  // Toggle full screen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen();
      setIsFullScreenMode(true);
    } else {
      document.exitFullscreen();
      setIsFullScreenMode(false);
    }
  };

  // Page navigation
  const handlePreviousPage = () => {
    if (book && book.currentPage > 1) {
      let prevPage = book.currentPage - 1;
      while (prevPage > 1 && !book.pages[prevPage - 1].content.trim()) {
        prevPage--;
      }
      goToPage(prevPage);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  const handleNextPage = () => {
    if (book && book.currentPage < book.totalPages) {
      let nextPage = book.currentPage + 1;
      while (nextPage < book.totalPages && !book.pages[nextPage - 1].content.trim()) {
        nextPage++;
      }
      goToPage(nextPage);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'Escape' && isFullScreenMode) {
        document.exitFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, isFullScreenMode]);

  // Words of the current page
  const words = useMemo(() => {
    if (!book) return [];
    
    const currentPageIndex = book.currentPage - 1;
    const pageContent = book.pages[currentPageIndex]?.content || '';
    
    return pageContent.split(/\s+/).map((text, index) => ({
      text: text.replace(/[.,;:!?()[\]{}""'']/g, ''),
      index
    }));
  }, [book]);

  // Mobile navigation items
  const navigationItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/books', icon: Library, label: 'Libros' },
    { path: '/profile', icon: User, label: 'Perfil' },
    { path: '/settings', icon: Settings, label: 'Ajustes' }
  ];

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-900 p-4">
        <div className="text-center">
          <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-4">
            No hay libro seleccionado
          </h2>
          <p className="text-gray-400 mb-8">
            Selecciona un libro de tu biblioteca para comenzar a leer
          </p>
          <button
            onClick={() => navigate('/books')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Book className="mr-2 h-5 w-5" />
            Ir a la biblioteca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={readerRef}
      className="min-h-screen bg-gray-900 flex flex-col"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
        <button
          onClick={() => navigate('/books')}
          className="p-2 text-gray-400 hover:text-white"
        >
          <Home className="h-5 w-5" />
        </button>

        <div className="text-gray-400">
          {book.currentPage} / {book.totalPages}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-white"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          
          <button
            onClick={toggleFullScreen}
            className="p-2 text-gray-400 hover:text-white"
          >
            {isFullScreenMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto px-4 py-8"
        style={{
          height: 'calc(100vh - 8rem)',
          paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 16px))'
        }}
      >
        <div 
          className="max-w-3xl mx-auto"
          style={{ fontSize: `${fontSize}px` }}
        >
          {words.map((word, idx) => (
            <React.Fragment key={`${word.text}-${idx}`}>
              <span
                className="inline-block px-1.5 py-0.5 mx-0.5 rounded cursor-pointer text-white bg-gray-800/50 hover:bg-blue-900/30 border border-gray-700/30"
                onClick={(e) => handleWordClick(word, e)}
              >
                {word.text}
              </span>
              {' '}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800">
        {/* Reading Controls */}
        <div className="py-2 px-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePreviousPage}
              disabled={book.currentPage <= 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              <button
                onClick={decreaseFontSize}
                disabled={fontSize <= 12}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <Minus className="h-5 w-5" />
              </button>
              
              <span className="text-gray-400 font-medium">
                {fontSize}
              </span>
              
              <button
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={handleNextPage}
              disabled={book.currentPage >= book.totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="md:hidden border-t border-gray-800">
          <div className="flex items-center justify-around px-2 py-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Word Translation Tooltip */}
      <WordTooltip
        word={selectedWord}
        isOpen={isTooltipOpen}
        onClose={closeTooltip}
        referenceElement={tooltipAnchor}
      />
    </div>
  );
};

export default Reader;