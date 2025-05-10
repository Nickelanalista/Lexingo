import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import ReaderControls from './ReaderControls';
import { XCircle, Maximize, Sun, Moon, Plus, Minus, Home, Bookmark, BookmarkCheck, ArrowLeft, ArrowRight, Languages, TextSelect, X, Type, Check } from 'lucide-react';
import { useTranslator } from '../hooks/useTranslator';

interface ReaderProps {
  onFullScreenMode?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

// Modos de selección para la traducción
type SelectionMode = 'inactive' | 'selectingStart' | 'selectingEnd' | 'selected';

const Reader: React.FC<ReaderProps> = ({ 
  onFullScreenMode, 
  onExitFullScreen,
  isFullScreen = false 
}) => {
  const { book, goToPage, setBook } = useBookContext();
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
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('inactive');
  const [startWordIndex, setStartWordIndex] = useState<{paraIdx: number, wordIdx: number} | null>(null);
  const [endWordIndex, setEndWordIndex] = useState<{paraIdx: number, wordIdx: number} | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<string>('');
  const [showParaSelectionInstructions, setShowParaSelectionInstructions] = useState(false);
  const [translationPosition, setTranslationPosition] = useState<'top' | 'bottom' | 'center'>('bottom');
  const [translationCoords, setTranslationCoords] = useState({ top: 0, left: 0 });
  const [isMobileView, setIsMobileView] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paragraphTranslationRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar si la API key está configurada
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    setShowApiKeyWarning(!apiKey);
  }, []);

  // Detectar si es iOS
  useEffect(() => {
    const checkIOS = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      setIsIOS(isIOS);
    };
    
    checkIOS();
  }, []);

  // Ajuste adicional para iOS para manejar el viewport real
  useEffect(() => {
    if (!isIOS) return;
    
    // Función para ajustar la altura visible real en dispositivos iOS
    const adjustIOSHeight = () => {
      // Calcular la altura visual disponible real en iOS
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Ejecutar al montar y cuando cambie el tamaño
    adjustIOSHeight();
    window.addEventListener('resize', adjustIOSHeight);
    window.addEventListener('orientationchange', adjustIOSHeight);
    
    return () => {
      window.removeEventListener('resize', adjustIOSHeight);
      window.removeEventListener('orientationchange', adjustIOSHeight);
    };
  }, [isIOS]);

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

  // Cerrar la traducción de párrafo al cambiar de página
  useEffect(() => {
    closeParaTranslation();
    resetParagraphSelection();
  }, [book?.currentPage]);

  // Cerrar el menú de traducción de párrafo al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        paragraphTranslationRef.current && 
        !paragraphTranslationRef.current.contains(e.target as Node) &&
        isParagraphTranslationOpen &&
        !isTranslatingParagraph
      ) {
        closeParaTranslation();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isParagraphTranslationOpen, isTranslatingParagraph]);

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

  // Estructurar el contenido en párrafos para una mejor visualización
  const paragraphs = useMemo(() => {
    if (!currentPageContent) return [];
    
    return currentPageContent
      .split(/\n+/)
      .filter(para => para.trim().length > 0)
      .map((para, index) => ({
        text: para,
        index,
        words: para.split(/\s+/).map((word, wordIndex) => ({
          text: word.replace(/[.,;:!?()[\]{}""'']/g, ''),
          index: wordIndex
        }))
      }));
  }, [currentPageContent]);

  // Detectar si es móvil al cargar y al cambiar el tamaño de ventana
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
    };
    
    // Verificar al inicio
    checkMobile();
    
    // Actualizar cuando cambie el tamaño de la ventana
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcular el padding-bottom para dispositivos móviles
  const mobileBottomPadding = useMemo(() => {
    // Valores más altos para dispositivos más pequeños
    if (isMobileView) {
      if (window.innerHeight < 600) return 30; // Padding mínimo para pantallas muy pequeñas
      if (window.innerHeight < 700) return 20; // Padding mínimo para iPhone 13 Pro
      return 10; // Padding mínimo para móviles
    }
    return 0; // Sin padding adicional en desktop
  }, [isMobileView]);

  // Determinar posición del panel de traducción
  useEffect(() => {
    if (selectionMode === 'selected' && startWordIndex && endWordIndex) {
      // Encontrar la posición del texto seleccionado
      const findWordElement = (paraIdx: number, wordIdx: number) => {
        const selector = `[data-para-idx="${paraIdx}"][data-word-idx="${wordIdx}"]`;
        return document.querySelector(selector) as HTMLElement;
      };
      
      const startWordElement = findWordElement(startWordIndex.paraIdx, startWordIndex.wordIdx);
      const endWordElement = findWordElement(endWordIndex.paraIdx, endWordIndex.wordIdx);
      
      if (startWordElement && endWordElement && readerContainerRef.current && contentRef.current) {
        const startRect = startWordElement.getBoundingClientRect();
        const endRect = endWordElement.getBoundingClientRect();
        const readerRect = readerContainerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        
        // Determinar el tamaño de la pantalla
        const isMobile = window.innerWidth < 768;
        
        // Calcular la posición media del texto seleccionado
        const selectionCenterY = (startRect.top + endRect.bottom) / 2;
        
        // En móviles, simplemente posicionamos el popup en el centro de la pantalla
        if (isMobile) {
          // Centrar absolutamente en la pantalla
          setTranslationPosition('center');
          setTranslationCoords({ 
            top: window.innerHeight / 2,
            left: window.innerWidth / 2
          });
          return;
        }
        
        // Para desktop, calculamos la mejor posición según el espacio disponible
        const windowHeight = window.innerHeight;
        const spaceAbove = selectionCenterY - contentRect.top;
        const spaceBelow = contentRect.bottom - selectionCenterY;
        
        // Posicionamiento horizontal para desktop
        const leftPosition = readerRect.left + (readerRect.width / 2);
        
        // Determinar posición vertical y hacer scroll si es necesario
        let topPosition, bottomPosition;
        let scrollNeeded = false;
        
        if (spaceBelow > spaceAbove && spaceBelow > 150) {
          // Hay espacio abajo
          setTranslationPosition('bottom');
          topPosition = endRect.bottom + window.scrollY;
          
          // Verificar si el popup estaría fuera de la vista
          if (endRect.bottom + 200 > window.innerHeight) {
            scrollNeeded = true;
          }
        } else {
          // Hay más espacio arriba o no hay suficiente abajo
          setTranslationPosition('top');
          bottomPosition = windowHeight - startRect.top + window.scrollY;
          
          // Verificar si el popup estaría fuera de la vista
          if (startRect.top - 200 < 0) {
            scrollNeeded = true;
          }
        }
        
        // Actualizar posición
        setTranslationCoords({ 
          top: topPosition || undefined, 
          bottom: bottomPosition || undefined,
          left: leftPosition
        });
        
        // Hacer scroll si es necesario para mantener visible
        if (scrollNeeded && contentRef.current) {
          setTimeout(() => {
            if (paragraphTranslationRef.current) {
              paragraphTranslationRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
              });
            }
          }, 100);
        }
      }
    }
  }, [selectionMode, startWordIndex, endWordIndex]);

  const handleWordClick = useCallback((paraIdx: number, wordIdx: number, word: Word, event: React.MouseEvent<HTMLSpanElement>) => {
    // Si estamos en modo selección, manejar la selección de inicio/fin
    if (selectionMode === 'selectingStart') {
      setStartWordIndex({ paraIdx, wordIdx });
      setSelectionMode('selectingEnd');
      return;
    } 
    
    if (selectionMode === 'selectingEnd') {
      // Asegurarnos de que el fin no esté antes que el inicio
      if (startWordIndex && 
          (paraIdx > startWordIndex.paraIdx || 
           (paraIdx === startWordIndex.paraIdx && wordIdx >= startWordIndex.wordIdx))) {
        setEndWordIndex({ paraIdx, wordIdx });
        setSelectionMode('selected');
        
        // Extraer el texto seleccionado
        extractSelectedParagraph(startWordIndex, { paraIdx, wordIdx });
      } else {
        // Informar al usuario que la selección debe ir de izquierda a derecha
        alert('La selección debe ir de izquierda a derecha. Por favor selecciona un punto final después del punto inicial.');
      }
      return;
    }
    
    // Si no estamos en modo selección, comportamiento normal de traducción de palabra
    if (word.text.trim() === '') return;
    
    setSelectedWord(word.text);
    setTooltipAnchor(event.currentTarget);
    setIsTooltipOpen(true);
  }, [selectionMode, startWordIndex]);

  const extractSelectedParagraph = (start: {paraIdx: number, wordIdx: number}, end: {paraIdx: number, wordIdx: number}) => {
    let selectedText = '';
    
    // Navegar por los párrafos y palabras entre los puntos seleccionados
    for (let p = start.paraIdx; p <= end.paraIdx; p++) {
      const paragraph = paragraphs[p];
      if (!paragraph) continue;
      
      const startWord = p === start.paraIdx ? start.wordIdx : 0;
      const endWord = p === end.paraIdx ? end.wordIdx : paragraph.words.length - 1;
      
      for (let w = startWord; w <= endWord; w++) {
        if (paragraph.words[w]) {
          selectedText += paragraph.words[w].text + ' ';
        }
      }
      
      // Añadir un espacio entre párrafos
      if (p < end.paraIdx) {
        selectedText += '\n';
      }
    }
    
    setSelectedParagraph(selectedText.trim());
  };

  const closeTooltip = useCallback(() => {
    setIsTooltipOpen(false);
  }, []);
  
  // Iniciar el modo de selección de párrafo
  const startParagraphSelection = () => {
    setSelectionMode('selectingStart');
    setShowParaSelectionInstructions(true);
    // Cerrar cualquier tooltip abierto
    closeTooltip();
  };

  // Reiniciar la selección de párrafo
  const resetParagraphSelection = () => {
    setSelectionMode('inactive');
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedParagraph('');
    setShowParaSelectionInstructions(false);
  };

  // Cancelar la selección actual
  const cancelParagraphSelection = () => {
    resetParagraphSelection();
  };

  // Traducir el párrafo seleccionado
  const translateSelectedParagraph = useCallback(async () => {
    if (!selectedParagraph) return;
    
    setIsParagraphTranslationOpen(true);
    setIsTranslatingParagraph(true);
    
    try {
      const result = await translateParagraph(selectedParagraph);
      
      if (result) {
        setTranslatedParagraph(result.translated);
      } else {
        setTranslatedParagraph('Error al traducir el texto seleccionado.');
      }
    } catch (error) {
      console.error('Error al traducir el párrafo:', error);
      setTranslatedParagraph('Error al traducir el texto seleccionado.');
    } finally {
      setIsTranslatingParagraph(false);
      // Mantener la selección activa cuando se muestra la traducción
      // No reseteamos la selección aquí para mantener el texto resaltado
    }
  }, [selectedParagraph, translateParagraph]);

  // Cerrar la traducción de párrafo
  const closeParaTranslation = () => {
    setIsParagraphTranslationOpen(false);
    setTranslatedParagraph('');
    // Resetear la selección solo al cerrar el popup
    resetParagraphSelection();
  };

  // Obtener el mensaje de instrucción según el modo de selección
  const getSelectionInstructionMessage = () => {
    switch (selectionMode) {
      case 'selectingStart':
        return 'Selecciona la palabra donde comienza el texto a traducir';
      case 'selectingEnd':
        return 'Ahora selecciona la palabra donde termina el texto';
      case 'selected':
        return 'Texto seleccionado. Pulsa "Traducir" para continuar';
      default:
        return '';
    }
  };

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

  // Determinar la clase de estilo para una palabra basada en la selección
  const getWordClass = (paraIdx: number, wordIdx: number) => {
    let baseClass = "word inline-block cursor-pointer px-1.5 py-0.5 rounded transition-colors border border-gray-200/40 dark:border-gray-700/40 mx-0.5";
    
    // Si no estamos en modo selección, estilo normal
    if (selectionMode === 'inactive') {
      return `${baseClass} hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white bg-gray-50/30 dark:bg-gray-800/30`;
    }
    
    // Si estamos seleccionando, resaltar las palabras adecuadas
    if (selectionMode === 'selectingStart') {
      return `${baseClass} hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-900 dark:text-white bg-gray-50/30 dark:bg-gray-800/30`;
    }
    
    // Si ya tenemos punto de inicio
    if (selectionMode === 'selectingEnd' || selectionMode === 'selected') {
      // Si es el punto de inicio
      if (startWordIndex && paraIdx === startWordIndex.paraIdx && wordIdx === startWordIndex.wordIdx) {
        return `${baseClass} bg-green-200 dark:bg-green-800 text-gray-900 dark:text-white border-green-400 dark:border-green-700`;
      }
      
      // Si está seleccionado entre inicio y fin
      if (selectionMode === 'selected' && startWordIndex && endWordIndex) {
        const isAfterStart = paraIdx > startWordIndex.paraIdx || 
                            (paraIdx === startWordIndex.paraIdx && wordIdx >= startWordIndex.wordIdx);
                            
        const isBeforeEnd = paraIdx < endWordIndex.paraIdx || 
                           (paraIdx === endWordIndex.paraIdx && wordIdx <= endWordIndex.wordIdx);
                           
        if (isAfterStart && isBeforeEnd) {
          return `${baseClass} bg-blue-100 dark:bg-blue-900/50 text-gray-900 dark:text-white border-blue-300 dark:border-blue-700`;
        }
      }
      
      // Si es el punto final
      if (endWordIndex && paraIdx === endWordIndex.paraIdx && wordIdx === endWordIndex.wordIdx) {
        return `${baseClass} bg-green-200 dark:bg-green-800 text-gray-900 dark:text-white border-green-400 dark:border-green-700`;
      }
    }
    
    // Estilo por defecto
    return `${baseClass} hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white bg-gray-50/30 dark:bg-gray-800/30`;
  };

  // Componente para mostrar las palabras del texto
  const renderWord = (word: Word, paraIdx: number, wordIdx: number) => (
    <span
      key={`${word.text}-${wordIdx}-${paraIdx}`}
      className={getWordClass(paraIdx, wordIdx)}
      onClick={(e) => handleWordClick(paraIdx, wordIdx, word, e)}
      data-para-idx={paraIdx}
      data-word-idx={wordIdx}
    >
      {word.text}
    </span>
  );

  if (!book) {
    return null;
  }
  
  // Componente Header para reutilizar en ambos modos
  const ReaderHeader = () => (
    <header className={`flex items-center justify-between ${isFullScreen ? 'py-2 sticky top-0' : 'py-3'} px-2 border-b border-gray-300 dark:border-gray-700 sticky top-0 z-20 bg-gradient-to-r from-blue-50/95 to-indigo-50/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-sm shadow-sm`}>
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between px-3">
        {/* Sección de inicio */}
        <div className="flex items-center">
          <button
            onClick={isFullScreen ? onExitFullScreen : () => { setBook(null); }}
            className="p-2 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={isFullScreen ? "Volver a modo normal" : "Volver al inicio"}
            title={isFullScreen ? "Volver a modo normal" : "Volver al inicio"}
          >
            {isFullScreen ? <ArrowLeft size={18} /> : <Home size={18} />}
          </button>
        </div>
        
        {/* Separador */}
        <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-3 hidden sm:block"></div>
        
        {/* Título y página */}
        <div className="text-center flex-grow mx-2">
          <div className="flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {book.currentPage} / {book.totalPages}
            </span>
          </div>
        </div>
        
        {/* Separador */}
        <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-3 hidden sm:block"></div>
        
        {/* Controles de tema y pantalla */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button
            onClick={isFullScreen ? onExitFullScreen : onFullScreenMode}
            className="p-2 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullScreen ? <XCircle size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </header>
  );

  // Componente de barra inferior
  const BottomControlBar = () => (
    <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50/95 to-indigo-50/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-sm border-t border-gray-300 dark:border-gray-700 ${isIOS ? 'ios-safe-bottom' : ''} z-30 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_5px_rgba(0,0,0,0.2)]`} style={{
      paddingBottom: isIOS ? 'env(safe-area-inset-bottom, 16px)' : undefined,
      height: isIOS ? '80px' : isMobileView ? '70px' : '60px'
    }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between px-3 h-full">
        {/* Sección de marcador y selección de párrafos */}
        <div className="flex items-center justify-center space-x-2 flex-1">
          <button
            onClick={saveReadingPosition}
            className={`p-2 rounded-md text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center`}
            title="Guardar marcador"
          >
            {hasBookmark ? (
              <BookmarkCheck size={20} className="flex-shrink-0" />
            ) : (
              <Bookmark size={20} className="flex-shrink-0" />
            )}
          </button>
          
          {/* Botón traducir párrafo */}
          {selectionMode === 'inactive' ? (
            <button
              onClick={startParagraphSelection}
              className="p-2 rounded-md text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-center gap-1"
              title="Traducir párrafo"
            >
              <Languages size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium hidden sm:inline">Traducir</span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {selectionMode === 'selected' ? (
                <>
                  <button
                    onClick={translateSelectedParagraph}
                    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-1"
                    title="Traducir selección"
                  >
                    <Check size={18} className="flex-shrink-0" />
                    <span className="text-sm font-medium">Traducir</span>
                  </button>
                  <button
                    onClick={cancelParagraphSelection}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
                    title="Cancelar selección"
                  >
                    <X size={18} className="flex-shrink-0" />
                  </button>
                </>
              ) : (
                <button
                  onClick={cancelParagraphSelection}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-1"
                  title="Cancelar selección"
                >
                  <X size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium">Cancelar</span>
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Separador vertical */}
        <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-1"></div>
        
        {/* Sección de navegación */}
        <div className="flex items-center justify-center flex-1">
          <button
            onClick={handlePreviousPage}
            disabled={book.currentPage <= 1}
            className={`p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center`}
          >
            <ArrowLeft size={20} className="flex-shrink-0" />
          </button>
          
          <span className={`mx-2 text-sm font-medium text-gray-700 dark:text-gray-300 inline-flex items-center justify-center`}>
            {book.currentPage}/{book.totalPages}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={book.currentPage >= book.totalPages}
            className={`p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center`}
          >
            <ArrowRight size={20} className="flex-shrink-0" />
          </button>
        </div>
        
        {/* Separador vertical */}
        <div className="h-8 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-1"></div>
        
        {/* Sección de zoom */}
        <div className="flex items-center justify-center flex-1">
          <button
            onClick={decreaseFontSize}
            disabled={fontSize <= 12}
            className={`p-2 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700`}
            aria-label="Reducir tamaño de fuente"
          >
            <Minus size={16} className="flex-shrink-0" />
          </button>
          
          <span className="mx-2 text-sm font-medium text-gray-700 dark:text-gray-300 inline-flex items-center justify-center">{fontSize}</span>
          
          <button
            onClick={increaseFontSize}
            disabled={fontSize >= 24}
            className={`p-2 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700`}
            aria-label="Aumentar tamaño de fuente"
          >
            <Plus size={16} className="flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full ${isFullScreen ? 'max-w-full' : 'max-w-4xl mx-auto'}`}>
      {/* Usar el header personalizado en ambos modos */}
      <ReaderHeader />
      
      {showApiKeyWarning && !isFullScreen && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-2 text-xs">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="text-xs text-yellow-700">
                API key no configurada. Usando traducciones simuladas.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensaje de confirmación de guardado */}
      {saveConfirmation && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-md shadow-md z-50 animate-fade-in text-xs">
          <div className="flex items-center">
            <BookmarkCheck size={14} className="mr-1" />
            <span>Posición guardada</span>
          </div>
        </div>
      )}
      
      {/* Instrucciones de selección de párrafo */}
      {showParaSelectionInstructions && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-md shadow-md z-50 animate-fade-in text-xs">
          <div className="flex items-center">
            <Languages size={14} className="mr-1" />
            <span>{getSelectionInstructionMessage()}</span>
          </div>
        </div>
      )}
      
      {/* Panel de traducción de párrafo */}
      {isParagraphTranslationOpen && (
        <div
          ref={paragraphTranslationRef}
          className={`fixed z-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col ${
            isMobileView 
              ? 'w-[90%] animate-fade-in max-h-[60vh]' 
              : 'w-[90%] max-w-[500px] md:max-w-[450px] animate-fade-in-up max-h-[250px]'
          }`}
          style={
            isMobileView
              ? {
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }
              : {
                  top: translationCoords.top !== undefined ? `${translationCoords.top}px` : 'auto',
                  bottom: translationCoords.bottom !== undefined ? `${translationCoords.bottom}px` : 'auto',
                  left: translationCoords.left !== undefined ? `${translationCoords.left}px` : '50%',
                  transform: 'translateX(-50%)'
                }
          }
        >
          <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center">
              <Languages size={16} className="mr-2 text-blue-500" />
              <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Traducción</h3>
            </div>
            <button
              onClick={closeParaTranslation}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 px-3 py-2 flex-grow">
            {isTranslatingParagraph ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-pulse text-gray-500 dark:text-gray-400 flex items-center">
                  <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs">Traduciendo...</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {translatedParagraph}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div 
        ref={readerContainerRef}
        className={`reader-container relative overflow-hidden bg-white dark:bg-gray-900 ${isFullScreen ? '' : 'shadow-lg mx-auto rounded-lg border border-gray-200 dark:border-gray-800 mt-1'}`}
      >      
        {/* Book content */}
        <div 
          ref={contentRef}
          className={`reader-content px-4 py-2 mx-auto relative ${isIOS ? 'mb-16' : isMobileView ? 'mb-12' : 'mb-4'}`}
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
            minHeight: isFullScreen 
              ? 'calc(100vh - 120px)' 
              : isIOS 
                ? 'calc((var(--vh, 1vh) * 100) - 200px)' 
                : isMobileView 
                  ? 'calc(100vh - 190px)' 
                  : 'calc(100vh - 160px)',
            maxHeight: isFullScreen 
              ? 'calc(100vh - 120px)' 
              : isIOS 
                ? 'calc((var(--vh, 1vh) * 100) - 200px)' 
                : isMobileView 
                  ? 'calc(100vh - 190px)' 
                  : 'calc(100vh - 160px)',
            overflowY: 'auto',
            userSelect: 'text',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.4) transparent',
            paddingBottom: (isIOS || mobileBottomPadding) ? `${isIOS ? 30 : mobileBottomPadding}px` : undefined
          }}
        >
          <div className="text-justify max-w-3xl mx-auto">
            {paragraphs.map((paragraph, paraIdx) => (
              <div key={`para-${paraIdx}`} className="mb-3">
                {paragraph.words.map((word, idx) => (
                  <React.Fragment key={`${word.text}-${idx}-${paraIdx}`}>
                    {renderWord(word, paraIdx, idx)}
                {' '}
              </React.Fragment>
                ))}
              </div>
            ))}
          </div>

          {/* Estilos para la barra de desplazamiento */}
          <style jsx>{`
            /* Estilos de la barra de desplazamiento en WebKit */
            .reader-content::-webkit-scrollbar,
            .overflow-y-auto::-webkit-scrollbar {
              width: 6px;
            }
            
            .reader-content::-webkit-scrollbar-track,
            .overflow-y-auto::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 10px;
            }
            
            .reader-content::-webkit-scrollbar-thumb,
            .overflow-y-auto::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.4);
              border-radius: 10px;
              border: 1px solid transparent;
              background-clip: padding-box;
            }
            
            .reader-content::-webkit-scrollbar-thumb:hover,
            .overflow-y-auto::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 0.5);
              border: 1px solid transparent;
              background-clip: padding-box;
            }
            
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            .animate-fade-in {
              animation: fadeIn 0.3s ease-in-out;
            }
            
            @keyframes fadeInUp {
              from { 
                opacity: 0;
                transform: translateY(10px) translateX(-50%);
              }
              to { 
                opacity: 1;
                transform: translateY(0) translateX(-50%);
              }
            }
            
            .animate-fade-in-up {
              animation: fadeInUp 0.2s ease-out forwards;
            }
          `}</style>
        </div>
        
        {/* Usar el componente de barra inferior en ambos modos */}
        <BottomControlBar />
        
        <WordTooltip
          word={selectedWord}
          isOpen={isTooltipOpen}
          onClose={closeTooltip}
          referenceElement={tooltipAnchor}
        />
      </div>
    </div>
  );
};

export default Reader;