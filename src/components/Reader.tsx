import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { useTranslator } from '../hooks/useTranslator';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Minimize, Sun, Moon, Plus, Minus, HelpCircle, X, ArrowLeft, ArrowRight, Home, Bookmark, BookmarkCheck, Save, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Reader: React.FC = () => {
  const navigate = useNavigate();
  const { book, goToPage } = useBookContext();
  const { fontSize, increaseFontSize, decreaseFontSize, theme, toggleTheme } = useThemeContext();
  const { translateParagraph } = useTranslator();
  
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [selectedParagraph, setSelectedParagraph] = useState<string>('');
  const [translatedParagraph, setTranslatedParagraph] = useState<string>('');
  const [isTranslatingParagraph, setIsTranslatingParagraph] = useState(false);
  const [isParagraphTranslationOpen, setIsParagraphTranslationOpen] = useState(false);
  const [translationPosition, setTranslationPosition] = useState({ top: 0, left: 0 });
  
  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const helpTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if it's the first time opening the reader
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('reader_help_seen') === 'true';
    setShowHelp(!hasSeenHelp);
    
    if (!hasSeenHelp) {
      helpTimeoutRef.current = setTimeout(() => {
        setShowHelp(false);
        localStorage.setItem('reader_help_seen', 'true');
      }, 10000);
    }
    
    return () => {
      if (helpTimeoutRef.current) {
        clearTimeout(helpTimeoutRef.current);
      }
    };
  }, []);

  // Handle word click
  const handleWordClick = useCallback((word: Word, event: React.MouseEvent<HTMLSpanElement>) => {
    if (word.text.trim() === '') return;
    
    setSelectedWord(word.text);
    setTooltipAnchor(event.currentTarget);
    setIsTooltipOpen(true);
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  // Handle paragraph selection
  const handleParagraphSelect = async (text: string, event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedParagraph(text);
    setIsTranslatingParagraph(true);
    
    try {
      const translation = await translateParagraph(text);
      setTranslatedParagraph(translation);
      
      // Calculate position for translation popup
      const rect = event.currentTarget.getBoundingClientRect();
      setTranslationPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
      
      setIsParagraphTranslationOpen(true);
    } catch (error) {
      console.error('Error translating paragraph:', error);
    } finally {
      setIsTranslatingParagraph(false);
    }
  };

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Navigation
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

  // Words of current page
  const paragraphs = useMemo(() => {
    if (!book) return [];
    
    const currentPageIndex = book.currentPage - 1;
    const pageContent = book.pages[currentPageIndex]?.content || '';
    
    return pageContent.split('\n\n').filter(p => p.trim().length > 0);
  }, [book]);

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-4">
            No hay libro seleccionado
          </h2>
          <button
            onClick={() => navigate('/books')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <Home className="mr-2 h-5 w-5" />
            Volver a la biblioteca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={readerRef}
      className={`min-h-screen bg-gray-900 flex flex-col ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}
    >
      {/* Top Controls */}
      <div className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => navigate('/books')}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Home className="h-5 w-5" />
          </button>

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
              {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto px-4 py-8"
      >
        <div 
          className="max-w-3xl mx-auto space-y-6"
          style={{ fontSize: `${fontSize}px` }}
        >
          {paragraphs.map((paragraph, idx) => (
            <div
              key={idx}
              className="relative group"
              onContextMenu={(e) => handleParagraphSelect(paragraph, e)}
            >
              {paragraph.split(/\s+/).map((word, wordIdx) => (
                <React.Fragment key={`${word}-${wordIdx}`}>
                  <span
                    className="inline-block px-1.5 py-0.5 mx-0.5 rounded cursor-pointer text-white bg-gray-800/50 hover:bg-blue-900/30 border border-gray-700/30"
                    onClick={(e) => handleWordClick({ text: word, index: wordIdx }, e)}
                  >
                    {word}
                  </span>
                  {' '}
                </React.Fragment>
              ))}
              
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-purple-600 rounded text-white"
                onClick={(e) => handleParagraphSelect(paragraph, e)}
              >
                <Languages className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="sticky bottom-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
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

      {/* Help Message */}
      {showHelp && (
        <div className="fixed bottom-24 right-8 left-8 sm:left-auto sm:w-80 p-4 bg-blue-900/50 rounded-lg border border-blue-800 z-50 animate-fade-in">
          <button 
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-300"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start">
            <HelpCircle className="text-blue-400 w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-200 mb-1">Modo Lectura</h4>
              <p className="text-sm text-blue-300 mb-2">
                • Toca cualquier palabra para ver su traducción
              </p>
              <p className="text-sm text-blue-300 mb-2">
                • Clic derecho o toca el icono de traducción para traducir párrafos completos
              </p>
              <div className="text-xs text-blue-400 flex justify-between items-center">
                <span>← → para navegar</span>
                <span>ESC para salir</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paragraph Translation */}
      {isParagraphTranslationOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsParagraphTranslationOpen(false)}
        >
          <div 
            className="bg-gray-900 rounded-lg w-full max-w-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Original</h3>
              <p className="text-white">{selectedParagraph}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Traducción</h3>
              {isTranslatingParagraph ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
                </div>
              ) : (
                <p className="text-blue-400">{translatedParagraph}</p>
              )}
            </div>
            
            <button
              onClick={() => setIsParagraphTranslationOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Word Translation Tooltip */}
      <WordTooltip
        word={selectedWord}
        isOpen={isTooltipOpen}
        onClose={() => setIsTooltipOpen(false)}
        referenceElement={tooltipAnchor}
      />
    </div>
  );
};

export default Reader;