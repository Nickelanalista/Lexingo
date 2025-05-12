import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { useTranslator } from '../hooks/useTranslator';
import { Word, TranslationResult } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Minimize, Sun, Moon, Plus, Minus, HelpCircle, X, ArrowLeft, ArrowRight, Home, Bookmark, BookmarkCheck, Save, Languages, Volume2, VolumeX, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFloating, offset, flip, shift, arrow, autoUpdate } from '@floating-ui/react';
import TTSService from '../services/tts';
import { supabase } from '../lib/supabase';

interface ReaderProps {
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

const Reader: React.FC<ReaderProps> = ({ onFullScreenChange }) => {
  const navigate = useNavigate();
  const { book, goToPage, pagesSkipped } = useBookContext();
  const { fontSize, increaseFontSize, decreaseFontSize, theme, toggleTheme } = useThemeContext();
  const { translateParagraph } = useTranslator();
  
  // Estado para mostrar el mensaje de páginas omitidas
  const [showSkippedMessage, setShowSkippedMessage] = useState(false);
  
  // Mostrar mensaje si se omitieron páginas, solo al abrir el libro inicialmente
  useEffect(() => {
    if (book && pagesSkipped > 0) {
      // Verificar si ya hemos mostrado el mensaje para este libro
      const messageShown = localStorage.getItem(`book_${book.title.replace(/\s+/g, '_').toLowerCase()}_message_shown`);
      
      if (!messageShown) {
        // Si es la primera vez, mostrar el mensaje
        setShowSkippedMessage(true);
        
        // Guardar que ya mostramos el mensaje
        localStorage.setItem(`book_${book.title.replace(/\s+/g, '_').toLowerCase()}_message_shown`, 'true');
        
        // Ocultar el mensaje después de 2 segundos
        const timer = setTimeout(() => {
          setShowSkippedMessage(false);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [book]); // Solo se ejecuta cuando el libro cambia, no en cada render o cambio de página
  
  // Nuevo estado para el menú del perfil
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Añadir manejador para cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Estados para la selección y traducción de palabras
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  
  // Estados para el modo de pantalla completa y controles
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  
  // Estados para la selección y traducción de párrafos
  const [isSelectingTextRange, setIsSelectingTextRange] = useState(false);
  const [startWordIndex, setStartWordIndex] = useState<number | null>(null);
  const [endWordIndex, setEndWordIndex] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationPosition, setTranslationPosition] = useState({ top: 0, left: 0 });
  const [isPlayingAudio, setIsPlayingAudio] = useState<'en' | 'es' | null>(null);
  
  const [allWords, setAllWords] = useState<string[]>([]);
  
  // Referencias DOM
  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const helpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectedWordRef = useRef<HTMLElement | null>(null);

  // Agregar un nuevo estado para rastrear el índice de la palabra seleccionada
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  // States for bookmark
  const [hasBookmark, setHasBookmark] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if book has a bookmark when loaded
  useEffect(() => {
    if (book) {
      // Check if we have a bookmark in Supabase (via book.bookmarked)
      setHasBookmark(book.bookmarked || false);
    }
  }, [book]);
  
  // Save bookmark to Supabase
  const saveBookmark = async () => {
    if (!book || !book.id) return;
    
    try {
      const { error } = await supabase
        .from('books')
        .update({
          bookmarked: true,
          bookmark_page: book.currentPage,
          bookmark_position: contentRef.current?.scrollTop || 0,
          bookmark_updated_at: new Date().toISOString()
        })
        .eq('id', book.id);
        
      if (error) {
        console.error('Error al guardar el marcador:', error);
      } else {
        // Show confirmation
        setHasBookmark(true);
        setSaveConfirmation(true);
        
        // Hide confirmation after 2 seconds
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
          setSaveConfirmation(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Error en el guardado del marcador:', err);
    }
  };

  // Extraer todas las palabras de la página actual
  useEffect(() => {
    if (book) {
      const currentPage = book.pages[book.currentPage - 1]?.content || '';
      setAllWords(currentPage.split(/\s+/));
      
      // Reset selection when page changes
      setStartWordIndex(null);
      setEndWordIndex(null);
      setSelectedText('');
      setTranslatedText('');
      setIsSelectingTextRange(false);
      setShowTranslation(false);
    }
  }, [book, book?.currentPage]);

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

  // Modificar el useFloating para que aparezca centrado
  const { refs, floatingStyles, context } = useFloating({
    open: showTranslation,
    elements: {
      reference: undefined // Quitamos la referencia para que aparezca centrado
    },
    placement: 'bottom',
    middleware: [
      offset(8),
      flip(),
      shift()
    ],
    strategy: 'fixed', // Usamos fixed para que esté siempre visible
    whileElementsMounted: autoUpdate
  });

  // Conectar la referencia del tooltip con la referencia de floating-ui
  const setFloating = (node: HTMLDivElement | null) => {
    refs.setFloating(node);
    if (node) translationRef.current = node;
  };

  // Cerrar el tooltip y limpiar la selección
  const closeTranslation = () => {
    setShowTranslation(false);
    setIsSelectingTextRange(false);
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedText('');
    setTranslatedText('');
  };

  // Detectar clic fuera del tooltip
  useEffect(() => {
    if (!showTranslation) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (translationRef.current && !translationRef.current.contains(event.target as Node)) {
        closeTranslation();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTranslation]);

  // Manejar el clic en una palabra (para traducción rápida o selección de rango)
  const handleWordClick = useCallback((word: Word, event: React.MouseEvent<HTMLSpanElement>, index: number) => {
    if (isSelectingTextRange) {
      // Estamos en modo selección de rango de texto
      if (startWordIndex === null) {
        // Primera palabra seleccionada (inicio del rango)
        setStartWordIndex(index);
        lastSelectedWordRef.current = event.currentTarget;
      } else if (endWordIndex === null) {
        // Segunda palabra seleccionada (fin del rango)
        // Asegurarse de que el fin sea después del inicio
        if (index < startWordIndex) {
          setEndWordIndex(startWordIndex);
          setStartWordIndex(index);
          lastSelectedWordRef.current = event.currentTarget;
        } else {
          setEndWordIndex(index);
          // Guardamos la referencia al último elemento seleccionado
          lastSelectedWordRef.current = event.currentTarget;
        }
        
        // Extraer el texto seleccionado
        const start = Math.min(startWordIndex, index);
        const end = Math.max(startWordIndex, index);
        const selectedRange = allWords.slice(start, end + 1).join(' ');
        setSelectedText(selectedRange);
      }
    } else {
      // Modo normal de traducción de palabra individual
      if (word.text.trim() === '') return;
      
      setSelectedWord(word.text);
      setSelectedWordIndex(index); // Guardar el índice de la palabra seleccionada
      setTooltipAnchor(event.currentTarget);
      setIsTooltipOpen(true);
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isSelectingTextRange, startWordIndex, endWordIndex, allWords]);

  // Iniciar el modo de selección de texto
  const startTextSelection = () => {
    setIsSelectingTextRange(true);
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedText('');
  };

  // Cancelar la selección de texto
  const cancelTextSelection = () => {
    setIsSelectingTextRange(false);
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedText('');
  };

  // Traducir el texto seleccionado
  const translateSelectedText = async () => {
    if (!selectedText) return;
    
    setIsTranslating(true);
    
    try {
      const result = await translateParagraph(selectedText);
      if (result && typeof result === 'object' && 'translated' in result) {
        setTranslatedText(result.translated);
        setShowTranslation(true);
      }
    } catch (error) {
      console.error('Error translating text:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Reproducir audio de la traducción usando TTSService
  const playTranslationAudio = async (language: 'en' | 'es') => {
    if (language === 'en' && !selectedText) return;
    if (language === 'es' && !translatedText) return;
    
    try {
      // Detener cualquier audio previo
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      setIsPlayingAudio(language);
      const textToSpeak = language === 'en' ? selectedText : translatedText;
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (apiKey) {
        await TTSService.speakText(textToSpeak, language);
      } else {
        TTSService.speakTextUsingWebSpeech(textToSpeak, language);
      }
    } catch (error) {
      console.error('Error al reproducir audio:', error);
    } finally {
      setIsPlayingAudio(null);
    }
  };

  // Detener la reproducción del audio
  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(null);
    }
  };

  // Detectar scroll y asegurar que la barra de utilidades permanezca visible
  useEffect(() => {
    const handleScroll = () => {
      setShowControls(true);
      
      // Reiniciar el temporizador si ya existe
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
    
    // Agregar event listener para el scroll
    if (contentRef.current) {
      contentRef.current.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      // Limpiar event listener
      if (contentRef.current) {
        contentRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Actualizar el estado de pantalla completa y notificar al componente padre
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen();
      setIsFullScreen(true);
      if (onFullScreenChange) {
        onFullScreenChange(true);
      }
      
      // Ocultar la barra de navegación móvil en modo pantalla completa
      const mobileNav = document.querySelector('.md\\:hidden.fixed.bottom-0');
      if (mobileNav) {
        mobileNav.classList.add('hidden');
      }
      
      // Ajustar la posición de la barra de controles en modo pantalla completa
      const controlsBar = document.querySelector('.reader-controls');
      if (controlsBar) {
        controlsBar.classList.add('fullscreen-controls');
      }
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
      if (onFullScreenChange) {
        onFullScreenChange(false);
      }
      
      // Mostrar nuevamente la barra de navegación móvil
      const mobileNav = document.querySelector('.md\\:hidden.fixed.bottom-0');
      if (mobileNav) {
        mobileNav.classList.remove('hidden');
      }
      
      // Restaurar la posición original de la barra de controles
      const controlsBar = document.querySelector('.reader-controls');
      if (controlsBar) {
        controlsBar.classList.remove('fullscreen-controls');
      }
    }
  };
  
  // Salir del modo pantalla completa y notificar al componente padre
  const exitFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullScreen(false);
    if (onFullScreenChange) {
      onFullScreenChange(false);
    }
    
    // Mostrar nuevamente la barra de navegación móvil
    const mobileNav = document.querySelector('.md\\:hidden.fixed.bottom-0');
    if (mobileNav) {
      mobileNav.classList.remove('hidden');
    }
    
    // Restaurar la posición original de la barra de controles
    const controlsBar = document.querySelector('.reader-controls');
    if (controlsBar) {
      controlsBar.classList.remove('fullscreen-controls');
    }
  };

  // Manejar cambios del navegador en pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenActive = document.fullscreenElement !== null;
      setIsFullScreen(isFullscreenActive);
      if (onFullScreenChange) {
        onFullScreenChange(isFullscreenActive);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onFullScreenChange]);

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

  // Modificar la función de cierre del tooltip para resetear la palabra seleccionada
  const closeTooltip = useCallback(() => {
    setIsTooltipOpen(false);
    setSelectedWordIndex(null);
  }, []);

  // Restaurar la posición de desplazamiento si hay un marcador
  useEffect(() => {
    if (book && book.bookmarked && contentRef.current && book.bookmark_position) {
      // Usar un pequeño timeout para asegurar que el contenido ya está renderizado
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = book.bookmark_position;
          console.log(`Restaurando posición de desplazamiento: ${book.bookmark_position}`);
        }
      }, 300);
    }
  }, [book, book?.currentPage]);

  // Función para ir directamente al marcador
  const goToBookmark = () => {
    if (book && book.bookmarked && book.bookmark_page) {
      // Si ya estamos en la página del marcador, solo hacer scroll
      if (book.currentPage === book.bookmark_page && contentRef.current && book.bookmark_position) {
        contentRef.current.scrollTop = book.bookmark_position;
      } 
      // Si no, navegar a la página del marcador
      else {
        goToPage(book.bookmark_page);
      }
    }
  };

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
      className={`min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Mensaje de ayuda */}
      {showHelp && (
        <div className="fixed bottom-24 right-8 left-8 sm:left-auto sm:w-80 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 z-50 animate-fade-in">
          <button
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-500"
          >
            <X size={16} />
          </button>
          <div className="flex items-start">
            <HelpCircle className="text-blue-500 w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Modo Lectura</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Toca cualquier palabra para ver su traducción. Para traducir un párrafo, pulsa el botón de traducción, selecciona la palabra inicial y final.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400 flex justify-between items-center">
                <span>← → para navegar</span>
                <span>ESC para salir</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de páginas omitidas */}
      {showSkippedMessage && pagesSkipped > 0 && (
        <div className="fixed top-40 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn">
          <div className="bg-green-600 text-white py-2 px-5 rounded-full shadow-lg flex items-center space-x-2 text-center max-w-[280px]">
            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white"></div>
            <span className="text-sm">Se {pagesSkipped === 1 ? 'omitió' : 'omitieron'} {pagesSkipped} {pagesSkipped === 1 ? 'página vacía' : 'páginas vacías'} al inicio</span>
          </div>
        </div>
      )}
      
      {/* Header principal - Mostrar solo en móvil, ocultar en desktop */}
      {!isFullScreen && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Logo centrado */}
              <div className="flex-1"></div>
              <div className="flex items-center justify-center flex-1">
                <img 
                  src={theme === 'dark' ? '/img/lexingo_white.png' : '/img/lexingo_black.png'} 
                  alt="Lexingo" 
                  className="h-11"
                />
              </div>
              
              {/* Perfil de usuario */}
              <div className="flex items-center space-x-4 flex-1 justify-end" ref={dropdownRef}>
                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="focus:outline-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white font-medium">
                      N
                    </div>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1">
                      <button
                        onClick={() => navigate('/')}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <LogOut size={16} className="mr-2" />
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de navegación de lectura */}
      <div className={`fixed ${!isFullScreen ? 'top-16' : 'top-0'} left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm`}>
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          {isFullScreen ? (
            <div className="flex items-center">
              {/* Botón para salir de pantalla completa */}
              <button
                onClick={exitFullScreen}
                className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mr-3"
                aria-label="Salir de pantalla completa"
              >
                <ArrowLeft size={22} />
              </button>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                {book.title} <span className="text-sm opacity-70">({book.currentPage}/{book.totalPages})</span>
              </div>
            </div>
          ) : (
            /* Botón de volver a la biblioteca */
            <button
              onClick={() => navigate('/books')}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Volver a la biblioteca"
            >
              <Home size={20} />
            </button>
          )}

          {/* Controles de tema y pantalla completa */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={toggleFullScreen}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de modo selección */}
      {isSelectingTextRange && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30 animate-fadeIn">
          <div className="bg-purple-600/90 text-white py-2 px-5 rounded-full shadow-lg flex items-center space-x-2 max-w-[250px] text-center">
            {startWordIndex === null ? (
              <>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white animate-pulse"></div>
                <span className="text-sm">Selecciona la palabra inicial</span>
              </>
            ) : endWordIndex === null ? (
              <>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white animate-pulse"></div>
                <span className="text-sm">Ahora selecciona la palabra final</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-400"></div>
                <span className="text-sm">Texto seleccionado</span>
              </>
            )}
          </div>
          
          {/* Botón para cancelar la selección */}
          <button 
            onClick={cancelTextSelection} 
            className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-lg hover:bg-gray-700"
            aria-label="Cancelar selección"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Contenido principal */}
      <div 
        className={`flex-grow overflow-y-auto p-4 ${
          !isFullScreen 
            ? 'pt-32 pb-44 md:pt-24 md:mt-16 md:pb-28' // Aumentar espacio en la parte inferior para evitar que el contenido sobrepase el menú
            : 'pt-16 pb-32'
        } mt-4`} 
        ref={contentRef}
      >
        <div 
          className="max-w-3xl mx-auto text-justify"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        >
          {allWords.map((word, idx) => (
            <React.Fragment key={`${word}-${idx}`}>
              <span
                className={`
                  word inline-block cursor-pointer px-1.5 py-0.5 rounded transition-colors 
                  border mx-0.5 
                  ${isSelectingTextRange 
                    ? startWordIndex === idx 
                      ? 'bg-purple-600 text-white border-purple-700'
                      : startWordIndex !== null && endWordIndex !== null && idx >= startWordIndex && idx <= endWordIndex
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-gray-800 dark:text-white border-purple-200 dark:border-purple-800'
                        : 'bg-gray-50 dark:bg-gray-800/30 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                    : idx === selectedWordIndex && isTooltipOpen
                      ? 'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 ring-opacity-50 dark:ring-blue-400 dark:ring-opacity-50' // Estilo para palabra seleccionada para traducción
                      : 'bg-gray-50 dark:bg-gray-800/30 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                  }
                `}
                onClick={(e) => handleWordClick({ text: word, index: idx }, e, idx)}
                title={!isSelectingTextRange ? "Pulsa para ver traducción" : startWordIndex === null ? "Selecciona como inicio" : "Selecciona como fin"}
              >
                {word}
              </span>
              {' '}
            </React.Fragment>
          ))}
        </div>
      </div>
        
      {/* Barra de control inferior fija */}
      <div className="reader-controls fixed bottom-[56px] sm:bottom-16 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-2 z-[100] transition-opacity duration-300 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4">
          {/* Botones de utilidad */}
          <div className="flex items-center">
            {/* Botón de marcador - unificado para guardar/ir al marcador */}
            <button
              onClick={hasBookmark ? goToBookmark : saveBookmark}
              className="p-2 rounded-md text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              title={hasBookmark ? "Ir al marcador guardado" : "Guardar marcador"}
            >
              {hasBookmark ? (
                <BookmarkCheck size={18} />
              ) : (
                <Bookmark size={18} />
              )}
            </button>
            
            {/* Mensaje de confirmación de guardado */}
            {saveConfirmation && (
              <div className="absolute -top-10 left-0 bg-green-600 text-white py-1 px-3 rounded-md text-sm animate-fade-in">
                Marcador guardado
              </div>
            )}
            
            {/* Botón de traducción de párrafo */}
            {isSelectingTextRange && endWordIndex !== null ? (
              <button
                onClick={translateSelectedText}
                className="ml-2 px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 flex items-center"
                title="Traducir selección"
              >
                {isTranslating ? (
                  <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Languages size={16} className="mr-2" />
                )}
                Traducir
              </button>
            ) : (
              <button
                onClick={startTextSelection}
                className={`ml-2 p-2 rounded-md text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center ${isSelectingTextRange ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}
                title="Seleccionar texto para traducir"
                disabled={isSelectingTextRange}
              >
                <Languages size={20} />
              </button>
            )}
          </div>
          
          {/* Sección de navegación */}
          <div className="flex items-center">
            <button
              onClick={handlePreviousPage}
              disabled={book.currentPage <= 1}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="mx-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
              {book.currentPage} / {book.totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={book.currentPage >= book.totalPages}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <ArrowRight size={20} />
            </button>
          </div>
          
          {/* Sección de zoom */}
          <div className="flex items-center">
            <button
              onClick={decreaseFontSize}
              disabled={fontSize <= 12}
              className="p-2 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Reducir tamaño de fuente"
            >
              <Minus size={16} />
            </button>
            <span className="mx-2 text-sm font-medium text-gray-700 dark:text-gray-300">{fontSize}</span>
            <button
              onClick={increaseFontSize}
              disabled={fontSize >= 24}
              className="p-2 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Aumentar tamaño de fuente"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* WordTooltip para mostrar traducciones de palabras individuales */}
      <WordTooltip
        word={selectedWord}
        isOpen={isTooltipOpen}
        onClose={closeTooltip}
        referenceElement={tooltipAnchor}
      />
      
      {/* Tooltip para mostrar traducciones de texto seleccionado */}
      {showTranslation && (
        <div
          ref={setFloating}
          style={{
            ...floatingStyles,
            position: 'fixed', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            margin: 0
          }}
          className="z-50 shadow-xl bg-gray-900 dark:bg-gray-800 text-white rounded-md max-w-md w-[90vw] sm:w-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Encabezado */}
          <div className="flex justify-between items-center bg-gray-800 dark:bg-gray-700 px-4 py-2 rounded-t-md">
            <div className="text-sm text-gray-300">Inglés</div>
            <button
              onClick={closeTranslation}
              className="text-gray-400 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Contenido */}
          <div className="p-4">
            {/* Texto original */}
            <div className="mb-4">
              <p className="font-medium mb-1 text-gray-300 text-sm">
                {selectedText}
              </p>
            </div>
            
            {/* Separador */}
            <div className="border-t border-gray-700 my-3"></div>
            
            {/* Texto traducido */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-300">Español</div>
                {isTranslating && (
                  <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
                )}
              </div>
              
              <p className="font-medium text-blue-400">
                {translatedText}
              </p>
              
              {/* Botones de audio */}
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={isPlayingAudio === 'en' ? stopAudio : () => playTranslationAudio('en')}
                  className={`flex items-center space-x-1 px-2 py-1 ${isPlayingAudio === 'en' ? 'bg-red-900/50 hover:bg-red-800' : 'bg-gray-700 hover:bg-gray-600'} rounded-sm text-xs`}
                >
                  <span>{isPlayingAudio === 'en' ? "Detener" : "Inglés"}</span>
                  {isPlayingAudio === 'en' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                
                <button
                  onClick={isPlayingAudio === 'es' ? stopAudio : () => playTranslationAudio('es')}
                  className={`flex items-center space-x-1 px-2 py-1 ${isPlayingAudio === 'es' ? 'bg-red-900/50 hover:bg-red-800' : 'bg-blue-900/50 hover:bg-blue-800'} rounded-sm text-xs`}
                  disabled={isPlayingAudio === 'en'}
                >
                  <span>{isPlayingAudio === 'es' ? "Detener" : "Español"}</span>
                  {isPlayingAudio === 'es' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        /* Ajuste para dispositivos móviles */
        @media screen and (max-width: 768px) {
          .reader-controls {
            bottom: 56px; /* Posiciona la barra por encima de la barra de navegación */
          }
        }
        /* Para dispositivos con pantallas más pequeñas */
        @media screen and (max-height: 500px) {
          .reader-controls {
            position: fixed;
            bottom: 56px;
            z-index: 100;
          }
        }
        /* Ajustes específicos para vista web */
        @media screen and (min-width: 768px) {
          .reader-controls {
            bottom: 0; /* En versión web, fijamos al fondo */
          }
        }
        /* Ajuste para modo pantalla completa */
        .fullscreen-controls {
          bottom: 0 !important;
        }
        :fullscreen .reader-controls {
          bottom: 0 !important;
        }
        :-webkit-full-screen .reader-controls {
          bottom: 0 !important;
        }
        :-moz-full-screen .reader-controls {
          bottom: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default Reader;