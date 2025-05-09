import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Minimize, Sun, Moon, Plus, Minus, HelpCircle, X, ArrowLeft, ArrowRight, Home, Bookmark, BookmarkCheck, Save } from 'lucide-react';

interface FullScreenReaderProps {
  onExitFullscreen: () => void;
}

const FullScreenReader: React.FC<FullScreenReaderProps> = ({ onExitFullscreen }) => {
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [hasBookmark, setHasBookmark] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const helpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Comprobar si es la primera vez que se abre la vista
  useEffect(() => {
    // Verificar si ya se ha mostrado la ayuda antes
    const hasSeenHelp = localStorage.getItem('lexingo_fullscreen_help_seen') === 'true';
    setShowHelp(!hasSeenHelp);
    
    // Ocultar la ayuda automáticamente después de 10 segundos
    if (!hasSeenHelp) {
      helpTimeoutRef.current = setTimeout(() => {
        setShowHelp(false);
        localStorage.setItem('lexingo_fullscreen_help_seen', 'true');
      }, 10000);
    }
    
    return () => {
      if (helpTimeoutRef.current) {
        clearTimeout(helpTimeoutRef.current);
      }
    };
  }, []);

  // Cerrar la ayuda manualmente
  const closeHelp = () => {
    setShowHelp(false);
    localStorage.setItem('lexingo_fullscreen_help_seen', 'true');
    if (helpTimeoutRef.current) {
      clearTimeout(helpTimeoutRef.current);
    }
  };
  
  // Ajustar tamaño de letra para diferentes dispositivos
  const getResponsiveFontSize = () => {
    const baseSize = fontSize || 16;
    if (window.innerWidth < 640) {
      return baseSize - 2; // Más pequeño en móviles
    } else if (window.innerWidth < 1024) {
      return baseSize - 1; // Ligeramente más pequeño en tablets
    }
    return baseSize; // Tamaño normal en escritorio
  };
  
  const [responsiveFontSize, setResponsiveFontSize] = useState(getResponsiveFontSize());

  // Actualizar el tamaño de fuente cuando cambia el contexto
  useEffect(() => {
    setResponsiveFontSize(getResponsiveFontSize());
  }, [fontSize]);

  // Manejar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setResponsiveFontSize(getResponsiveFontSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fontSize]);

  // Manejadores personalizados de tamaño de fuente
  const handleIncreaseFontSize = () => {
    increaseFontSize();
    setResponsiveFontSize(getResponsiveFontSize()); 
  };

  const handleDecreaseFontSize = () => {
    decreaseFontSize();
    setResponsiveFontSize(getResponsiveFontSize());
  };

  // Palabras de la página actual
  const words = React.useMemo(() => {
    if (!book) return [];
    
    const currentPageIndex = book.currentPage - 1;
    const pageContent = book.pages[currentPageIndex]?.content || '';
    
    // Dividir el contenido en palabras
    return pageContent.split(/\s+/).map((text, index) => ({
      text: text.replace(/[.,;:!?()[\]{}""'']/g, ''), // Eliminar puntuación
      index
    }));
  }, [book]);

  // Función para manejar el clic en una palabra
  const handleWordClick = useCallback((word: Word, event: React.MouseEvent<HTMLSpanElement>) => {
    if (word.text.trim() === '') return;
    
    setSelectedWord(word.text);
    setTooltipAnchor(event.currentTarget);
    setIsTooltipOpen(true);
    
    // Mostrar controles cuando se hace clic en una palabra
    setShowControls(true);
    resetControlsTimeout();
  }, []);

  // Cerrar tooltip
  const closeTooltip = useCallback(() => {
    setIsTooltipOpen(false);
  }, []);

  // Navegación de páginas
  const handlePreviousPage = () => {
    if (book && book.currentPage > 1) {
      goToPage(book.currentPage - 1);
      // Scroll al inicio
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  const handleNextPage = () => {
    if (book && book.currentPage < book.totalPages) {
      goToPage(book.currentPage + 1);
      // Scroll al inicio
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  // Manejar pantalla completa
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (readerRef.current?.requestFullscreen) {
        readerRef.current.requestFullscreen();
        setIsFullScreen(true);
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };
  
  // Salir de la vista de pantalla completa
  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    onExitFullscreen();
  };

  // Detectar cambios en fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      // Si salimos de pantalla completa usando ESC, volver a la vista normal
      if (!document.fullscreenElement && isFullScreen) {
        onExitFullscreen();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullScreen, onExitFullscreen]);

  // Ocultar controles después de un tiempo de inactividad
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isTooltipOpen) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Mostrar controles con movimiento del ratón
  const handleMouseMove = () => {
    if (!showControls) {
      setShowControls(true);
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isTooltipOpen]);

  // Accesibilidad para teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'Escape' && isFullScreen) {
        document.exitFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, isFullScreen]);

  // Navegar con gestos táctiles
  useEffect(() => {
    let touchstartX = 0;
    let touchendX = 0;
    
    const handleSwipe = () => {
      const swipeDistance = touchendX - touchstartX;
      // Sólo considerar como swipe si el movimiento fue mayor a 50px
      if (Math.abs(swipeDistance) > 50) {
        if (swipeDistance > 0) {
          handlePreviousPage(); // Swipe derecha -> página anterior
        } else {
          handleNextPage(); // Swipe izquierda -> página siguiente
        }
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      touchstartX = e.changedTouches[0].screenX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchendX = e.changedTouches[0].screenX;
      handleSwipe();
    };
    
    const content = contentRef.current;
    if (content) {
      content.addEventListener('touchstart', handleTouchStart);
      content.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        content.removeEventListener('touchstart', handleTouchStart);
        content.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [book]);

  // Comprobar si hay un marcador guardado para este libro al cargar
  useEffect(() => {
    if (book) {
      const savedPosition = localStorage.getItem(`reading_position_${book.title}`);
      if (savedPosition) {
        setHasBookmark(true);
      } else {
        setHasBookmark(false);
      }
    }
    
  }, [book]);
  
  // Guardar posición de lectura
  const saveReadingPosition = () => {
    if (book) {
      localStorage.setItem(`reading_position_${book.title}`, book.currentPage.toString());
      setSaveConfirmation(true);
      setHasBookmark(true);
      
      // Ocultar el mensaje de confirmación después de 2 segundos
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        setSaveConfirmation(false);
      }, 2000);
    }
  };

  if (!book) {
    return null;
  }

  return (
    <div 
      ref={readerRef}
      className={`reader-fullscreen relative w-full h-full flex flex-col bg-white dark:bg-gray-900 ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}
      onMouseMove={handleMouseMove}
    >
      {/* Mensaje de ayuda */}
      {showHelp && (
        <div className="fixed bottom-24 right-8 left-8 sm:left-auto sm:w-80 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 z-50 animate-fade-in">
          <button 
            onClick={closeHelp}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-500"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start">
            <HelpCircle className="text-blue-500 w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Modo Lectura</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Toca cualquier palabra para ver su traducción. Desliza hacia los lados para cambiar de página y mueve el cursor para mostrar los controles.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400 flex justify-between items-center">
                <span>← → para navegar</span>
                <span>ESC para salir</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de confirmación de guardado */}
      {saveConfirmation && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-md shadow-md z-50 animate-fade-in">
          <div className="flex items-center">
            <BookmarkCheck size={16} className="mr-2" />
            <span>Posición guardada</span>
          </div>
        </div>
      )}

      {/* Barra superior - Siempre visible en mobile, ocultable en desktop */}
      <header 
        className={`flex items-center justify-between p-2 sm:p-4 border-b border-gray-200 dark:border-gray-800 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm ${isFullScreen ? 'sm:hidden' : ''}`}
      >
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between px-4">
          {/* Sección de inicio */}
          <div className="flex items-center">
            <button
              onClick={handleExit}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Inicio"
            >
              <Home size={20} />
            </button>
          </div>
          
          {/* Separador */}
          <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-3 hidden sm:block"></div>
          
          {/* Título y página */}
          <div className="text-center flex-grow">
            <div className="flex flex-col sm:flex-row items-center justify-center">
              <span className="font-medium hidden sm:inline text-gray-700 dark:text-gray-300">{book.title}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 sm:ml-2">
                {book.currentPage} / {book.totalPages}
              </span>
            </div>
          </div>
          
          {/* Separador */}
          <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-3 hidden sm:block"></div>
          
          {/* Controles de tema y pantalla */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            <button
              onClick={toggleFullScreen}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            <button
              onClick={handleExit}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Cerrar"
            >
              <XCircle size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex-grow relative overflow-hidden">
        {/* Contenido del libro */}
        <div
          ref={contentRef}
          className="h-[calc(100vh-120px)] px-4 sm:px-12 md:px-16 py-8 overflow-y-auto mb-14"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.4) transparent'
          }}
        >
          <div 
            className="max-w-3xl mx-auto text-justify"
            style={{ fontSize: `${responsiveFontSize}px`, lineHeight: 1.8 }}
          >
            {words.map((word, idx) => (
              <React.Fragment key={`${word.text}-${idx}`}>
                <span
                  className="word inline-block cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 px-1.5 py-0.5 rounded transition-colors text-gray-900 dark:text-white border border-gray-200/40 dark:border-gray-700/40 mx-0.5 bg-gray-50/30 dark:bg-gray-800/30"
                  onClick={(e) => handleWordClick(word, e)}
                  title="Pulsa para ver traducción"
                >
                  {word.text}
                </span>
                {' '}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Barra de control inferior fija */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-2 z-20 transition-opacity duration-300">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4">
            {/* Sección de marcador */}
            <div className="flex items-center mr-4">
              <button
                onClick={saveReadingPosition}
                className="p-2 rounded-md text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                title="Guardar marcador"
              >
                {hasBookmark ? (
                  <BookmarkCheck size={18} />
                ) : (
                  <Bookmark size={18} />
                )}
              </button>
            </div>
            
            {/* Separador */}
            <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-3"></div>
            
            {/* Sección de navegación */}
            <div className="flex items-center">
              <button
                onClick={handlePreviousPage}
                disabled={book.currentPage <= 1}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ArrowLeft size={20} />
              </button>
              
              <span className="mx-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                {book.currentPage} / {book.totalPages}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={book.currentPage >= book.totalPages}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ArrowRight size={20} />
              </button>
            </div>
            
            {/* Separador */}
            <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-3"></div>
            
            {/* Sección de zoom */}
            <div className="flex items-center">
              <button
                onClick={handleDecreaseFontSize}
                disabled={fontSize <= 12}
                className="p-2 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700"
                aria-label="Reducir tamaño de fuente"
              >
                <Minus size={16} />
              </button>
              
              <span className="mx-2 text-sm font-medium text-gray-700 dark:text-gray-300">{fontSize}</span>
              
              <button
                onClick={handleIncreaseFontSize}
                disabled={fontSize >= 24}
                className="p-2 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700"
                aria-label="Aumentar tamaño de fuente"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* WordTooltip para mostrar traducciones */}
      <WordTooltip
        word={selectedWord}
        isOpen={isTooltipOpen}
        onClose={closeTooltip}
        referenceElement={tooltipAnchor}
      />
      
      {/* Estilos de scrollbar y animaciones */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .reader-fullscreen::-webkit-scrollbar {
          width: 8px;
        }
        
        .reader-fullscreen::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .reader-fullscreen::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.4);
          border-radius: 10px;
        }
        
        .reader-fullscreen::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.5);
        }
      `}</style>
    </div>
  );
};

export default FullScreenReader; 