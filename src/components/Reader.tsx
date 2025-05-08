import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import ReaderControls from './ReaderControls';

const Reader: React.FC = () => {
  const { book } = useBookContext();
  const { fontSize } = useThemeContext();
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{x: number, y: number} | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar si la API key está configurada
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    setShowApiKeyWarning(!apiKey);
  }, []);

  const currentPageContent = useMemo(() => {
    if (!book) return '';
    
    const currentPageIndex = book.currentPage - 1;
    return book.pages[currentPageIndex]?.content || '';
  }, [book]);

  // Process page content into words
  const words = useMemo(() => {
    if (!currentPageContent) return [];
    
    // Split content into words
    return currentPageContent.split(/\s+/).map((text, index) => ({
      text: text.replace(/[.,;:!?()[\]{}""'']/g, ''), // Remove punctuation
      index
    }));
  }, [currentPageContent]);

  const handleWordClick = useCallback((word: Word, event: React.MouseEvent<HTMLSpanElement>) => {
    if (word.text.trim() === '') return;
    
    setSelectedWord(word.text);
    setTooltipAnchor(event.currentTarget);
    setIsTooltipOpen(true);
  }, []);

  const closeTooltip = useCallback(() => {
    setIsTooltipOpen(false);
    setSelectedText('');
    setSelectionCoords(null);
  }, []);

  // Estado para el modo de selección
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Manejadores para la selección de texto
  const handleTextSelection = useCallback(() => {
    if (!selectionMode) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const content = range.toString().trim();

    if (content && content.length > 1) {
      // Obtenemos las coordenadas de la selección
      const rect = range.getBoundingClientRect();
      setSelectedText(content);
      
      // Calcular posición para el botón de traducir
      const readerRect = contentRef.current?.getBoundingClientRect();
      if (readerRect) {
        const x = rect.left + (rect.width / 2) - readerRect.left;
        const y = rect.bottom - readerRect.top + 10; // 10px debajo de la selección
        setSelectionCoords({ x, y });
      }
    }
  }, [selectionMode]);

  const handleTranslateClick = useCallback(() => {
    if (!selectedText) return;
    
    setSelectedWord(selectedText);
    
    // Usar la posición del botón como anclaje
    if (selectionCoords && contentRef.current) {
      const button = document.getElementById('translate-button');
      if (button) {
        setTooltipAnchor(button);
        setIsTooltipOpen(true);
      }
    }
  }, [selectedText, selectionCoords]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedText('');
    setSelectionCoords(null);
    setIsTooltipOpen(false);
  }, []);

  if (!book) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <ReaderControls />
      
      {showApiKeyWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No se ha configurado la API key de OpenAI. Usando traducciones simuladas. 
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="font-medium underline text-yellow-700 hover:text-yellow-600">
                  Obtén una clave API
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleSelectionMode}
          className={`
            px-3 py-1 rounded-md text-sm font-medium
            ${selectionMode 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
          `}
        >
          {selectionMode ? 'Modo selección: Activo' : 'Activar modo selección'}
        </button>
      </div>
      
      <div className={`reader-container relative overflow-hidden bg-white dark:bg-gray-900 shadow-xl mx-auto rounded-lg ${selectionMode ? 'cursor-text selection:bg-blue-200 dark:selection:bg-blue-800' : ''}`}>
        {/* Page number */}
        <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
          Page {book.currentPage} of {book.totalPages}
        </div>
        
        {/* Book content */}
        <div 
          ref={contentRef}
          className={`reader-content px-6 md:px-12 py-8 prose prose-sm sm:prose dark:prose-invert mx-auto relative`}
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: 1.8,
            minHeight: 'calc(100vh - 200px)',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            userSelect: selectionMode ? 'text' : 'none',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.4) transparent'
          }}
          onMouseUp={handleTextSelection}
        >
          {/* Botón de traducir para texto seleccionado */}
          {selectionMode && selectedText && selectionCoords && (
            <button
              id="translate-button"
              onClick={handleTranslateClick}
              className="absolute z-10 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-full shadow-md transition-colors flex items-center justify-center animate-fadeIn"
              style={{
                left: `${selectionCoords.x}px`,
                top: `${selectionCoords.y}px`,
                transform: 'translateX(-50%)'
              }}
            >
              Traducir
            </button>
          )}

          <div className="text-justify">
            {selectionMode ? (
              <div>
                {currentPageContent}
              </div>
            ) : (
              words.map((word, idx) => (
                <React.Fragment key={`${word.text}-${idx}`}>
                  <span
                    className="word inline-block cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 px-0.5 rounded transition-colors"
                    onClick={(e) => handleWordClick(word, e)}
                  >
                    {word.text}
                  </span>
                  {' '}
                </React.Fragment>
              ))
            )}
          </div>

          {/* Estilos para la barra de desplazamiento */}
          <style jsx>{`
            /* Estilos de la barra de desplazamiento en WebKit */
            .reader-content::-webkit-scrollbar {
              width: 8px;
            }
            
            .reader-content::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 10px;
            }
            
            .reader-content::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.4);
              border-radius: 10px;
              border: 2px solid transparent;
              background-clip: padding-box;
            }
            
            .reader-content::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 0.5);
              border: 2px solid transparent;
              background-clip: padding-box;
            }
          `}</style>

          {/* Estilos para la animación de aparición */}
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            .animate-fadeIn {
              animation: fadeIn 0.2s ease-in-out;
            }
          `}</style>
        </div>
        
        <WordTooltip
          word={selectedWord}
          isOpen={isTooltipOpen}
          onClose={closeTooltip}
          referenceElement={tooltipAnchor}
          showBothLanguages={!selectionMode}
        />
      </div>
    </div>
  );
};

export default Reader;