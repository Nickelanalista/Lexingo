import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { useTranslator } from '../hooks/useTranslator';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Sun, Moon, Plus, Minus, Home, Bookmark, BookmarkCheck, ArrowLeft, ArrowRight, Languages, TextSelect, X, Type, Check, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const { translateParagraph } = useTranslator();
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [hasBookmark, setHasBookmark] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(false);
  const [isParagraphTranslationOpen, setIsParagraphTranslationOpen] = useState(false);
  const [translatedParagraph, setTranslatedParagraph] = useState<string>('');
  const [isTranslatingParagraph, setIsTranslatingParagraph] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'inactive' | 'selectingStart' | 'selectingEnd' | 'selected'>('inactive');
  const [startWordIndex, setStartWordIndex] = useState<{paraIdx: number, wordIdx: number} | null>(null);
  const [endWordIndex, setEndWordIndex] = useState<{paraIdx: number, wordIdx: number} | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<string>('');
  const [showParaSelectionInstructions, setShowParaSelectionInstructions] = useState(false);
  const [translationPosition, setTranslationPosition] = useState<'top' | 'bottom' | 'center'>('bottom');
  const [translationCoords, setTranslationCoords] = useState({ top: 0, left: 0 });
  const [isMobileView, setIsMobileView] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paragraphTranslationRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const closeParaTranslation = useCallback(() => {
    setIsParagraphTranslationOpen(false);
    setTranslatedParagraph('');
    setIsTranslatingParagraph(false);
  }, []);

  const resetParagraphSelection = useCallback(() => {
    setSelectionMode('inactive');
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedParagraph('');
    setShowParaSelectionInstructions(false);
  }, []);

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

  // Page navigation
  const handlePreviousPage = () => {
    if (book && book.currentPage > 1) {
      goToPage(book.currentPage - 1);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  const handleNextPage = () => {
    if (book && book.currentPage < book.totalPages) {
      goToPage(book.currentPage + 1);
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
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book]);

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            No hay libro seleccionado
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <Home className="h-6 w-6" />
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-medium text-gray-900 dark:text-white">{book.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Página {book.currentPage} de {book.totalPages}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto px-4 py-8"
      >
        <div className="max-w-3xl mx-auto">
          {words.map((word, idx) => (
            <React.Fragment key={`${word.text}-${idx}`}>
              <span
                className="word inline-block cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 px-1.5 py-0.5 rounded transition-colors text-gray-900 dark:text-white"
                onClick={(e) => handleWordClick(word, e)}
                style={{ fontSize: `${fontSize}px` }}
              >
                {word.text}
              </span>
              {' '}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousPage}
              disabled={book.currentPage <= 1}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              <button
                onClick={decreaseFontSize}
                disabled={fontSize <= 12}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
              >
                <Minus className="h-5 w-5" />
              </button>
              
              <span className="text-gray-900 dark:text-white font-medium">
                {fontSize}
              </span>
              
              <button
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={handleNextPage}
              disabled={book.currentPage >= book.totalPages}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
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