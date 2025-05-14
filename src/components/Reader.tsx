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
  const { book, setBook, goToPage, pagesSkipped, loadBookAndSkipEmptyPages, updateReadingProgress } = useBookContext();
  const { fontSize, increaseFontSize, decreaseFontSize, theme, toggleTheme } = useThemeContext();
  const { translateParagraph } = useTranslator();
  
  // Estado para mostrar el mensaje de páginas omitidas
  const [showSkippedMessage, setShowSkippedMessage] = useState(false);
  
  // Cargar el último libro leído si no hay un libro seleccionado
  useEffect(() => {
    const fetchLastReadBook = async () => {
      if (!book) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', user.id)
            .order('last_read', { ascending: false })
            .limit(1)
            .single();
            
          if (error || !data) {
            console.log('No se encontró un libro reciente o error:', error);
            return;
          }
          
          // Cargar el libro encontrado
          const bookData = {
            id: data.id,
            title: data.title,
            pages: JSON.parse(data.content),
            currentPage: data.current_page || 1,
            totalPages: data.total_pages,
            coverUrl: data.cover_url,
            lastRead: data.last_read,
            bookmarked: data.bookmarked,
            bookmark_page: data.bookmark_page,
            bookmark_position: data.bookmark_position,
            bookmark_updated_at: data.bookmark_updated_at
          };
          
          loadBookAndSkipEmptyPages(bookData);
          console.log('Libro reciente cargado automáticamente:', data.title);
        } catch (error) {
          console.error('Error al cargar el último libro leído:', error);
        }
      }
    };
    
    fetchLastReadBook();
  }, [book, loadBookAndSkipEmptyPages, setBook]);
  
  // Preservar la página actual cuando se actualiza el libro por OCR
  const prevBookRef = useRef<Book | null>(null);
  
  useEffect(() => {
    // Si el libro se está actualizando durante el OCR, preservar la página actual
    if (book && prevBookRef.current && 
        book.id === prevBookRef.current.id && 
        book.ocrInProgress && 
        prevBookRef.current.currentPage !== book.currentPage) {
      
      // Solo actualizar si la página actual ha cambiado a 1 (reinicio no deseado)
      if (book.currentPage === 1 && prevBookRef.current.currentPage > 1) {
        console.log(`Restaurando página actual: ${prevBookRef.current.currentPage} (evitando reinicio por OCR)`);
        
        // Restaurar la página actual previa
        setBook({
          ...book,
          currentPage: prevBookRef.current.currentPage
        });
      }
    }
    
    // Guardar referencia del libro actual para la próxima actualización
    prevBookRef.current = book;
  }, [book, setBook]);
  
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
  }, [book, pagesSkipped]); // Solo se ejecuta cuando el libro cambia, no en cada render o cambio de página
  
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
  const selectionMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Agregar un nuevo estado para rastrear el índice de la palabra seleccionada
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [showSelectionMessage, setShowSelectionMessage] = useState(true);

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
      
      // Actualizar el progreso de lectura en la base de datos cuando cambia la página
      if (book.id) {
        updateReadingProgress(book.id, book.currentPage);
      }
    }
  }, [book, book?.currentPage]);

  // Guardar la última página leída al desmontar el componente
  useEffect(() => {
    return () => {
      if (book && book.id) {
        updateReadingProgress(book.id, book.currentPage);
        console.log('Guardando progreso al salir del lector:', book.currentPage);
      }
    };
  }, [book]);

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
        
        // Activar automáticamente la traducción
        translateTextSelection(selectedRange);
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

  // Función para traducir el texto seleccionado automáticamente
  const translateTextSelection = async (text: string) => {
    if (!text) return;
    
    setIsTranslating(true);
    
    try {
      const result = await translateParagraph(text);
      if (result && typeof result === 'object' && 'translated' in result) {
        setTranslatedText(result.translated);
        setShowTranslation(true);
      
        // Mostrar el mensaje de "Texto seleccionado" solo por 1.5 segundos
        if (selectionMessageTimeoutRef.current) {
          clearTimeout(selectionMessageTimeoutRef.current);
        }
        
        setShowSelectionMessage(true);
        selectionMessageTimeoutRef.current = setTimeout(() => {
          setShowSelectionMessage(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error translating text:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Iniciar el modo de selección de texto
  const startTextSelection = () => {
    setIsSelectingTextRange(true);
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedText('');
    setShowSelectionMessage(true);
  };

  // Cancelar la selección de texto
  const cancelTextSelection = () => {
    setIsSelectingTextRange(false);
    setStartWordIndex(null);
    setEndWordIndex(null);
    setSelectedText('');
    
    // Limpiar el timeout del mensaje de selección
    if (selectionMessageTimeoutRef.current) {
      clearTimeout(selectionMessageTimeoutRef.current);
    }
    
    // Restablecer el estado del mensaje
    setShowSelectionMessage(true);
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
    // Usar nuestro propio modo "pantalla completa" en lugar del nativo
    setIsFullScreen(!isFullScreen);
    if (onFullScreenChange) {
      onFullScreenChange(!isFullScreen);
    }
      
    // Mostrar/ocultar las barras de navegación según corresponda
    const mobileNav = document.querySelector('.md\\:hidden.fixed.bottom-0');
    if (mobileNav) {
      !isFullScreen ? mobileNav.classList.add('hidden') : mobileNav.classList.remove('hidden');
    }
  };
  
  // Salir del modo pantalla completa personalizado
  const exitFullScreen = () => {
      setIsFullScreen(false);
    if (onFullScreenChange) {
      onFullScreenChange(false);
    }
    
    // Mostrar nuevamente la barra de navegación móvil
    const mobileNav = document.querySelector('.md\\:hidden.fixed.bottom-0');
    if (mobileNav) {
      mobileNav.classList.remove('hidden');
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

  // Agregar un indicador visual de OCR en la parte superior del lector
  const OcrIndicator = ({ isVisible }: { isVisible: boolean }) => {
    if (!isVisible) return null;
    
    return (
      <div className="bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-500 p-2 mb-4 text-sm text-purple-700 dark:text-purple-300 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Este documento ha sido procesado con OCR para mejorar la legibilidad.
      </div>
    );
  };

  // Agregar un nuevo estado para controlar si el indicador de OCR está minimizado
  const [ocrIndicatorMinimized, setOcrIndicatorMinimized] = useState(false);
  // Agregar estado para controlar la visibilidad del indicador de OCR procesado
  const [showOcrProcessedMessage, setShowOcrProcessedMessage] = useState(false);

  // Efecto para mostrar temporalmente el mensaje de OCR procesado
  useEffect(() => {
    if (book?.processedWithOcr && !book.ocrInProgress) {
      // Verificar si ya mostramos el mensaje en esta sesión
      const ocrMessageShown = sessionStorage.getItem(`ocr_message_shown_${book.id || book.title}`);
      
      if (!ocrMessageShown) {
        // Mostrar el mensaje
        setShowOcrProcessedMessage(true);
        
        // Guardar que ya mostramos el mensaje en esta sesión
        sessionStorage.setItem(`ocr_message_shown_${book.id || book.title}`, 'true');
        
        // Ocultar el mensaje después de 2 segundos
        const timer = setTimeout(() => {
          setShowOcrProcessedMessage(false);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [book]);

  // Agregar efecto para minimizar automáticamente el popup de OCR después de 2 segundos
  useEffect(() => {
    if (book?.ocrInProgress && !ocrIndicatorMinimized) {
      const autoMinimizeTimer = setTimeout(() => {
        setOcrIndicatorMinimized(true);
      }, 2000);
      
      return () => clearTimeout(autoMinimizeTimer);
    }
  }, [book?.ocrInProgress, ocrIndicatorMinimized]);

  // Modificar el componente OcrProgressIndicator para incluir un botón para minimizar
  const OcrProgressIndicator = ({ book }: { book: Book }) => {
    // Si el libro no está en proceso de OCR, no mostrar nada
    if (!book?.ocrInProgress) return null;
    
    // Calcular el porcentaje de progreso
    const progressPercent = book.ocrTotal ? Math.round((book.ocrProgress / book.ocrTotal) * 100) : 0;
    
    if (ocrIndicatorMinimized) {
      // Versión minimizada - mover a la parte inferior central pero más arriba
      return (
        <div 
          onClick={() => setOcrIndicatorMinimized(false)}
          className="fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-3 py-2 rounded-lg shadow-lg flex items-center z-[200] cursor-pointer hover:bg-blue-700 transition-all"
        >
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          <span className="text-xs font-medium">OCR: {progressPercent}%</span>
        </div>
      );
    }
    
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-[90%] sm:w-[320px] overflow-hidden">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white flex items-center">
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            OCR en progreso
          </h3>
          <button
            onClick={() => setOcrIndicatorMinimized(true)}
            className="text-white/80 hover:text-white p-1 rounded flex items-center justify-center"
            title="Minimizar"
          >
            <span className="font-bold text-lg leading-none">-</span>
          </button>
        </div>
        
        {/* Contenido */}
        <div className="p-4">
          {/* Información */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Páginas procesadas:
            </span>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {book.ocrProgress} de {book.ocrTotal}
            </span>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          {/* Mensaje */}
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1">
            Puedes continuar leyendo mientras se completa el OCR.
            <br/>Las páginas se actualizarán automáticamente.
          </p>
        </div>
      </div>
    );
  };

  // Antes del return principal del componente Reader
  // Agregar un indicador del progreso de OCR en el título
  useEffect(() => {
    // Actualizar el título del documento para mostrar el progreso del OCR
    if (book?.ocrInProgress && book.ocrTotal > 0) {
      const percent = Math.round((book.ocrProgress / book.ocrTotal) * 100);
      document.title = `OCR ${percent}% - ${book.title} | Lexingo`;
    } else if (book) {
      document.title = `${book.title} | Lexingo`;
    } else {
      document.title = 'Lexingo';
    }
    
    return () => {
      document.title = 'Lexingo';
    };
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
      className={`min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col ${isFullScreen ? 'reader-fullscreen' : ''}`}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Header principal - Solo visible cuando NO estamos en modo pantalla completa */}
      {!isFullScreen && <div className="h-16"></div>}
      
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
      
      {/* Barra de navegación de lectura */}
      <div className={`fixed ${!isFullScreen ? 'md:top-16 top-16' : 'top-0'} left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b-2 border-purple-500 dark:border-purple-700 shadow-md`}>
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Botón izquierdo: volver o salir */}
          <div className="w-1/3 flex justify-start">
            {isFullScreen ? (
              <button
                onClick={exitFullScreen}
                className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Salir de pantalla completa"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <button
                onClick={() => navigate('/books')}
                className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Volver a la biblioteca"
              >
                <Home size={18} />
              </button>
            )}
          </div>
          
          {/* Línea divisoria vertical */}
          <div className="hidden sm:block h-6 w-px bg-gray-300/60 dark:bg-gray-700/60 mx-2"></div>
          
          {/* Información central del libro */}
          <div className="w-1/3 flex justify-center items-center">
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {book.currentPage} / {book.totalPages}
              </span>
            </div>
          </div>

          {/* Línea divisoria vertical */}
          <div className="hidden sm:block h-6 w-px bg-gray-300/60 dark:bg-gray-700/60 mx-2"></div>

          {/* Controles de tema y pantalla completa */}
          <div className="w-1/3 flex justify-end items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={toggleFullScreen}
              className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={isFullScreen ? 'Salir de modo inmersivo' : 'Modo inmersivo'}
            >
              {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Línea divisoria */}
      <div className={`fixed ${!isFullScreen ? 'md:top-[4.5rem] top-[4.5rem]' : 'top-12'} left-0 right-0 h-[1px] bg-gray-300/80 dark:bg-gray-600/80 z-[39]`}></div>

      {/* Indicador de modo selección */}
      {isSelectingTextRange && showSelectionMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[500] animate-fadeIn">
          <div className="bg-purple-600/90 text-white py-2 px-5 rounded-full shadow-lg flex items-center space-x-2 max-w-[250px] text-center">
            {startWordIndex === null ? (
              <>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white animate-pulse"></div>
                <span className="text-sm font-medium">Selecciona la palabra inicial</span>
              </>
            ) : endWordIndex === null ? (
              <>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white animate-pulse"></div>
                <span className="text-sm font-medium">Ahora selecciona la palabra final</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium">Texto seleccionado</span>
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

      {/* OCR Indicator */}
      <OcrIndicator isVisible={showOcrProcessedMessage && !!book?.processedWithOcr && !book?.ocrInProgress} />
      <OcrProgressIndicator book={book} />

      {/* Contenido principal */}
      <div 
        className={`flex-grow overflow-y-auto p-4 ${
          !isFullScreen 
            ? 'pt-6 pb-32 md:pt-4 md:pb-36' // Reducir el padding superior para tener menos espacio
            : 'pt-4 pb-16'
        }`} 
        ref={contentRef}
      >
        <div 
          className="max-w-3xl mx-auto text-justify px-2"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        >
          {book && book.pages[book.currentPage - 1]?.content.includes('[Contenido de la página') || 
           book.pages[book.currentPage - 1]?.content.includes('[Procesando OCR para página') ? (
            // Si está en proceso de OCR, no mostrar el contenido de fondo, solo un área vacía
            book.ocrInProgress ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                {/* No mostramos nada aquí, ya que el popup de OCR será suficiente */}
              </div>
            ) : (
              // Si no está en proceso de OCR pero tiene el marcador, mostrar el contenido original
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {book.pages[book.currentPage - 1]?.content.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>
                    <p className={`${idx === 0 ? 'font-medium text-lg text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'} mb-2`}>
                      {line}
                    </p>
                    {line === '' && <br />}
                  </React.Fragment>
                ))}
              </div>
            )
          ) : (
            // Contenido normal
            allWords.map((word, idx) => (
              <React.Fragment key={`${word}-${idx}`}>
                <span
                  className={`
                    word inline-block cursor-pointer px-1 py-0.5 rounded transition-colors 
                    border mx-[2px] 
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
            ))
          )}
        </div>
      </div>

      {/* Barra de control inferior fija */}
      <div className="reader-controls fixed bottom-[56px] sm:bottom-16 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-2 z-[100] transition-opacity duration-300 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-1">
          {/* Botones de utilidad */}
          <div className="flex items-center">
            {/* Botón de marcador - unificado para guardar/ir al marcador */}
            <button
              onClick={hasBookmark ? goToBookmark : saveBookmark}
              className="p-1.5 rounded-md text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              title={hasBookmark ? "Ir al marcador guardado" : "Guardar marcador"}
            >
              {hasBookmark ? (
                <BookmarkCheck size={18} />
              ) : (
                <Bookmark size={18} />
              )}
            </button>
            
            {/* Línea divisoria vertical */}
            <div className="h-5 w-px bg-gray-300/60 dark:bg-gray-700/60 mx-2"></div>
            
            {/* Mensaje de confirmación de guardado */}
            {saveConfirmation && (
              <div className="absolute -top-10 left-0 bg-green-600 text-white py-1 px-3 rounded-md text-sm animate-fade-in">
                Marcador guardado
              </div>
            )}
            
            {/* Botón de traducción de texto */}
            <button
              onClick={isSelectingTextRange ? cancelTextSelection : startTextSelection}
              className={`p-1.5 rounded-md ${isSelectingTextRange 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                : 'text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300'} flex items-center`}
              title={isSelectingTextRange ? "Cancelar selección" : "Seleccionar texto para traducir"}
            >
              <Languages size={18} />
            </button>
          </div>
          
          {/* Línea divisoria vertical */}
          <div className="h-6 w-px bg-gray-300/60 dark:bg-gray-700/60 mx-2"></div>
          
          {/* Sección de navegación */}
          <div className="flex items-center">
          <button
            onClick={handlePreviousPage}
            disabled={book.currentPage <= 1}
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
              <ArrowLeft size={18} />
            </button>
            <span className="mx-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
              {book.currentPage} / {book.totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={book.currentPage >= book.totalPages}
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <ArrowRight size={18} />
          </button>
          </div>
          
          {/* Línea divisoria vertical */}
          <div className="h-6 w-px bg-gray-300/60 dark:bg-gray-700/60 mx-2"></div>

          {/* Sección de zoom */}
          <div className="flex items-center">
            <button
              onClick={decreaseFontSize}
              disabled={fontSize <= 12}
              className="p-1.5 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Reducir tamaño de fuente"
            >
              <Minus size={16} />
            </button>
            <span className="mx-2 text-sm font-medium text-gray-700 dark:text-gray-300">{fontSize}</span>
            <button
              onClick={increaseFontSize}
              disabled={fontSize >= 24}
              className="p-1.5 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
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
            margin: 0,
            zIndex: 9999
          }}
          className="z-[9999] shadow-xl bg-gray-900 dark:bg-gray-800 text-white rounded-lg max-w-md w-[90vw] sm:w-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Encabezado */}
          <div className="flex justify-between items-center bg-gradient-to-r from-purple-900 to-blue-900 px-4 py-3 rounded-t-lg">
            <div className="text-sm text-gray-100 font-medium">Texto original</div>
          <button 
              onClick={closeTranslation}
              className="text-gray-300 hover:text-white focus:outline-none"
              aria-label="Cerrar"
          >
            <X size={16} />
          </button>
          </div>
          
          {/* Contenido */}
          <div className="p-4">
            {/* Texto original */}
            <div className="mb-4">
              <p className="font-medium mb-1 text-gray-200 text-sm">
                {selectedText}
              </p>
            </div>
            
            {/* Separador */}
            <div className="border-t border-gray-700 my-3"></div>
            
            {/* Texto traducido */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-300 font-medium">Traducción</div>
                {isTranslating && (
                  <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
                )}
              </div>
              
              <p className="font-medium text-blue-300">
                {translatedText}
              </p>
              
              {/* Botones de audio */}
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={isPlayingAudio === 'en' ? stopAudio : () => playTranslationAudio('en')}
                  className={`flex items-center space-x-1 px-3 py-1.5 ${isPlayingAudio === 'en' ? 'bg-red-900/50 hover:bg-red-800' : 'bg-gray-700 hover:bg-gray-600'} rounded text-xs`}
                >
                  <span>{isPlayingAudio === 'en' ? "Detener" : "Inglés"}</span>
                  {isPlayingAudio === 'en' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                
                <button
                  onClick={isPlayingAudio === 'es' ? stopAudio : () => playTranslationAudio('es')}
                  className={`flex items-center space-x-1 px-3 py-1.5 ${isPlayingAudio === 'es' ? 'bg-red-900/50 hover:bg-red-800' : 'bg-blue-900/50 hover:bg-blue-800'} rounded text-xs`}
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

      {/* Dentro del contenido del retorno principal, después de la barra de navegación */}
      {/* Agregar una notificación si el procesamiento OCR está en progreso */}
      {book?.ocrInProgress && (
        <div className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-[150] animate-pulse">
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          <span className="text-xs font-medium">
            OCR: {Math.round((book.ocrProgress / book.ocrTotal) * 100)}%
          </span>
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
        .reader-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
        }
        /* Asegurar que la barra de controles esté por encima de la navegación */
        .reader-controls {
          bottom: 56px !important;
          width: 100% !important;
          left: 0 !important;
          right: 0 !important;
        }
        /* Ajustes para pantallas más grandes */
        @media screen and (min-width: 640px) {
          .reader-controls {
            bottom: 0 !important;
            padding-bottom: 16px !important;
          }
        }
        /* Para pantallas pequeñas */
        @media screen and (max-height: 500px) {
          .reader-controls {
            padding-bottom: 0;
          }
        }
        /* Ajuste para el modo pantalla completa */
        .reader-fullscreen .reader-controls {
          bottom: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default Reader;