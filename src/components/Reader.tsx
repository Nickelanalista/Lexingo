import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { useTranslator } from '../hooks/useTranslator';
import { getLanguageName, OpenAIService } from '../services/openai';
import { Word, TranslationResult, Book } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Minimize, Sun, Moon, Plus, Minus, HelpCircle, X, ArrowLeft, ArrowRight, Home, Languages, Volume2, VolumeX, Loader2, Sparkles, Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFloating, offset, flip, shift, autoUpdate, useClick, useDismiss, useRole, useInteractions, FloatingFocusManager } from '@floating-ui/react';
import TTSService from '../services/tts';
import { supabase } from '../lib/supabase';
import AIChatModal from './AIChatModal';
import Flag from 'react-world-flags';

// Mapeo de códigos de idioma a códigos de país para las banderas
const languageToCountryCode: {[key: string]: string} = {
  en: 'US',  // Inglés -> Estados Unidos
  es: 'ES',  // Español -> España
  it: 'IT',  // Italiano -> Italia
  fr: 'FR',  // Francés -> Francia
  ja: 'JP',  // Japonés -> Japón
  de: 'DE',  // Alemán -> Alemania
  pt: 'PT',  // Portugués -> Portugal
  ru: 'RU',  // Ruso -> Rusia
  zh: 'CN',  // Chino -> China
  ar: 'SA',  // Árabe -> Arabia Saudita
  hi: 'IN',  // Hindi -> India
  ko: 'KR',  // Coreano -> Corea del Sur
  nl: 'NL',  // Holandés -> Países Bajos
  sv: 'SE',  // Sueco -> Suecia
  tr: 'TR',  // Turco -> Turquía
};

interface ReaderProps {
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

const Reader: React.FC<ReaderProps> = ({ onFullScreenChange }) => {
  const navigate = useNavigate();
  const { book, setBook, goToPage, pagesSkipped, loadBookAndSkipEmptyPages, updateReadingProgress, isLoading } = useBookContext();
  const { fontSize, increaseFontSize, decreaseFontSize, theme, toggleTheme } = useThemeContext();
  const { translateParagraph, translateWord, translatePageText, isTranslating: isTranslatorLoading } = useTranslator();
  
  // Estado para mostrar el mensaje de páginas omitidas
  const [showSkippedMessage, setShowSkippedMessage] = useState(false);
  
  // Estado para el idioma de lectura actual del libro
  const [currentBookLanguage, setCurrentBookLanguage] = useState<string>('en');
  const [sourceBookLanguage, setSourceBookLanguage] = useState<string>('en');
  const [translatedPageContent, setTranslatedPageContent] = useState<string | null>(null);
  const [isPageTranslating, setIsPageTranslating] = useState(false);
  const [nextPageTranslatedContent, setNextPageTranslatedContent] = useState<string | null>(null);
  const [isTranslatingNextPage, setIsTranslatingNextPage] = useState(false);
  
  const [currentPageContentForDisplay, setCurrentPageContentForDisplay] = useState<string | null>(null);
  const [isCurrentPageTranslating, setIsCurrentPageTranslating] = useState(false);
  
  const [proactivelyTranslatedNextPageContent, setProactivelyTranslatedNextPageContent] = useState<string | null>(null);
  const [proactivelyTranslatedForPageNumber, setProactivelyTranslatedForPageNumber] = useState<number | null>(null);
  const [isProactivelyTranslatingNextPage, setIsProactivelyTranslatingNextPage] = useState(false);

  const prevBookPageRef = useRef<number | null>(null);
  const lastDisplayedPageAndLangRef = useRef({ page: 0, lang: '' });
  
  // Cargar el último libro leído si no hay un libro seleccionado
  useEffect(() => {
    const fetchLastReadBook = async () => {
      if (!book) {
        try {
          console.log('[CARGA] Iniciando búsqueda de último libro leído');
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
            console.log('[CARGA] No se encontró un libro reciente o error:', error);
            return;
          }
          
          // Cargar el libro encontrado
          console.log('[CARGA] Libro encontrado en Supabase: ', data.title);
          const bookContent = JSON.parse(data.content);
          console.log(`[CARGA] El libro tiene ${bookContent.length} páginas. Página actual: ${data.current_page || 1}`);
          
          const bookData = {
            id: data.id,
            title: data.title,
            pages: bookContent,
            currentPage: data.current_page || 1,
            totalPages: data.total_pages,
            coverUrl: data.cover_url,
            lastRead: data.last_read,
            bookmarked: data.bookmarked,
            bookmark_page: data.bookmark_page,
            bookmark_position: data.bookmark_position,
            bookmark_updated_at: data.bookmark_updated_at
          };
          
          // Asegurar que se procesen las páginas vacías al cargar
          console.log('[CARGA] Llamando a loadBookAndSkipEmptyPages para omitir páginas vacías');
          loadBookAndSkipEmptyPages(bookData);
          console.log('[CARGA] Libro reciente cargado automáticamente:', data.title);
        } catch (error) {
          console.error('[CARGA] Error al cargar el último libro leído:', error);
        }
      }
    };
    
    fetchLastReadBook();
  }, [book, loadBookAndSkipEmptyPages, setBook]);
  
  // NUEVO: Efecto para detectar y traducir inmediatamente al cargar el libro
  useEffect(() => {
    // Este efecto se ejecuta cuando el libro termina de cargarse o cuando isLoading cambia de true a false
    if (book && !isLoading) {
      console.log('[DETECCIÓN-INICIAL] Libro cargado, iniciando detección inmediata de idioma');
      
      const currentPageIndex = book.currentPage - 1;
      if (currentPageIndex < 0 || currentPageIndex >= book.pages.length) {
        console.log('[DETECCIÓN-INICIAL] Índice de página fuera de rango');
        return;
      }
      
      const pageContent = book.pages[currentPageIndex]?.content || '';
      
      // Verificar si el contenido es un mensaje de error o un placeholder
      if (!pageContent || 
          pageContent.startsWith('[Contenido de la página') || 
          pageContent.startsWith('[Procesando OCR para página') ||
          pageContent.startsWith('[Página') ||
          pageContent.startsWith('[Error')) {
        console.log('[DETECCIÓN-INICIAL] La página contiene contenido placeholder o mensaje de error, omitiendo detección');
        return;
      }
      
      // Verificar si el contenido ya está en inglés antes de asumir que está en español
      const isEnglishContent = 
        (pageContent.includes('the ') || pageContent.includes('The ')) && 
        (pageContent.includes(' of ') || pageContent.includes(' for ')) && 
        (pageContent.includes(' and ') || pageContent.includes(' or ')) &&
        !pageContent.includes('á') && !pageContent.includes('é') && 
        !pageContent.includes('í') && !pageContent.includes('ó') && 
        !pageContent.includes('ú') && !pageContent.includes('ñ');
      
      if (isEnglishContent) {
        console.log('[DETECCIÓN-INICIAL] Contenido detectado en inglés, manteniendo idioma original');
        setSourceBookLanguage('en');
        setCurrentBookLanguage('en');
        return;
      }
      
      // Detectar si el contenido está en español con alta confianza
      const isSpanishContent = 
        pageContent.includes('á') || pageContent.includes('é') || 
        pageContent.includes('í') || pageContent.includes('ó') || 
        pageContent.includes('ú') || pageContent.includes('ñ') ||
        pageContent.includes('¿') || pageContent.includes('¡') ||
        (pageContent.includes(' el ') && pageContent.includes(' la ') && 
         pageContent.includes(' en ') && pageContent.includes(' con '));
      
      if (isSpanishContent) {
        console.log('[DETECCIÓN-INICIAL] Contenido detectado en español, forzando traducción a inglés');
        // Establecer idioma fuente como español
        setSourceBookLanguage('es');
        // Establecer idioma de destino como inglés
        setCurrentBookLanguage('en');
        
        // Forzar la traducción inmediata de la página actual
        if (!currentPageContentForDisplay) {
          console.log('[DETECCIÓN-INICIAL] Iniciando traducción inmediata de la primera página');
          setIsCurrentPageTranslating(true);
          
          translatePageText(pageContent, 'en', 'es')
            .then(translated => {
              if (!book) return;
              console.log('[DETECCIÓN-INICIAL] Traducción completada exitosamente');
              setCurrentPageContentForDisplay(translated || pageContent);
              lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: 'en' };
              
              // Pre-traducir también la siguiente página para tenerla lista
              if (book.currentPage < book.totalPages) {
                const nextPageContent = book.pages[book.currentPage]?.content;
                if (nextPageContent && 
                    !nextPageContent.startsWith('[Contenido de la página') && 
                    !nextPageContent.startsWith('[Procesando OCR para página') &&
                    !nextPageContent.startsWith('[Página') &&
                    !nextPageContent.startsWith('[Error')) {
                  console.log('[DETECCIÓN-INICIAL] Pre-traduciendo siguiente página');
                  setIsProactivelyTranslatingNextPage(true);
                  
                  translatePageText(nextPageContent, 'en', 'es')
                    .then(nextTranslated => {
                      if (!book) return;
                      setProactivelyTranslatedNextPageContent(nextTranslated);
                      setProactivelyTranslatedForPageNumber(book.currentPage + 1);
                    })
                    .catch(error => {
                      console.error('[DETECCIÓN-INICIAL] Error pre-traduciendo página siguiente:', error);
                    })
                    .finally(() => {
                      setIsProactivelyTranslatingNextPage(false);
                    });
                }
              }
            })
            .catch(error => {
              console.error('[DETECCIÓN-INICIAL] Error traduciendo primera página:', error);
              setCurrentPageContentForDisplay(pageContent); // Mostrar contenido original como fallback
            })
            .finally(() => {
              setIsCurrentPageTranslating(false);
            });
        }
      } else {
        console.log('[DETECCIÓN-INICIAL] El contenido no parece estar en español, manteniendo idioma actual');
      }
    }
  }, [book, isLoading, translatePageText]);
  
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
  
  // Mostrar mensaje si se omitieron páginas, cada vez que se detecten páginas omitidas
  useEffect(() => {
    if (book && pagesSkipped > 0) {
      // Mostrar el mensaje
      setShowSkippedMessage(true);
      
      // Ocultar el mensaje después de 1.5 segundos
      const timer = setTimeout(() => {
        setShowSkippedMessage(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [book, pagesSkipped]); // Se ejecuta cuando el libro cambia o pagesSkipped cambia
  
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

  // useEffect para manejar el z-index del dropdown del perfil
  // Esto asume que dropdownRef es el elemento del menú del perfil
  // y dropdownOpen controla su visibilidad.
  useEffect(() => {
    if (dropdownRef.current) {
      if (dropdownOpen) {
        // Asegurar que el menú del perfil esté por encima de otros elementos del Reader
        dropdownRef.current.style.zIndex = '10001'; // Más alto que tooltips y modales (que usan hasta 9999)
      } else {
        // Restaurar z-index o quitarlo si ya no está abierto
        dropdownRef.current.style.zIndex = ''; 
      }
    }
  }, [dropdownOpen]); // Se ejecuta cuando dropdownOpen cambia
  
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
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  
  const [allWords, setAllWords] = useState<string[]>([]);
  const [aiChatContextText, setAiChatContextText] = useState<string>('');
  
  // Referencias DOM
  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLElement | null>(null);
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
      // setHasBookmark(book.bookmarked || false); // Eliminado ya que el botón se va
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
        // setHasBookmark(true); // Eliminado
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

  // Efecto 1: Manejar la página actual (N)
  useEffect(() => {
    console.log('[PAGE_N_EFFECT] Triggered. Current Page:', book?.currentPage, 'Lang:', currentBookLanguage, 'DisplayContent empty?', !currentPageContentForDisplay, 'ProactivePage:', proactivelyTranslatedForPageNumber, 'isTranslating:', isCurrentPageTranslating);

    if (!book || !book.pages || book.pages.length === 0 || !book.currentPage) {
      setCurrentPageContentForDisplay(null);
      setIsCurrentPageTranslating(false);
      return;
    }

    // GUARDIA: Si el contenido ya se mostró para esta página/idioma y no estamos en una carga activa para ella,
    // y esta ejecución es probablemente por un cambio en dependencias externas (como proactively... por cleanup),
    // no hacer nada para evitar retraducir o resetear el loader.
    if (
      lastDisplayedPageAndLangRef.current.page === book.currentPage &&
      lastDisplayedPageAndLangRef.current.lang === currentBookLanguage &&
      currentPageContentForDisplay !== null && // Ya hay contenido
      !isCurrentPageTranslating // Y no estamos activamente cargando ESTA página
    ) {
      console.log(`[PAGE_N_EFFECT] Content for page ${book.currentPage} (${currentBookLanguage}) already displayed. Proactive: ${proactivelyTranslatedForPageNumber}. Skipping re-processing.`);
      // Asegurarse de que el loader no se active si esta guarda actúa.
      if (isCurrentPageTranslating) setIsCurrentPageTranslating(false);
      return;
    }

    const pageIndex = book.currentPage - 1;
    const originalContent = book.pages[pageIndex]?.content;

    if (!originalContent || originalContent.startsWith('[Contenido de la página') || originalContent.startsWith('[Procesando OCR para página')) {
      console.log('[PAGE_N_EFFECT] Placeholder content, setting to original.');
      setCurrentPageContentForDisplay(originalContent || '');
      setIsCurrentPageTranslating(false);
      return;
    }

    // Intentar usar contenido pre-traducido para la página N
    if (proactivelyTranslatedNextPageContent && proactivelyTranslatedForPageNumber === book.currentPage) {
      console.log(`[PAGE_N_EFFECT] Using proactively translated content for page ${book.currentPage}`);
      setCurrentPageContentForDisplay(proactivelyTranslatedNextPageContent);
      setIsCurrentPageTranslating(false);
      lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
      // NO LIMPIAR proactivelyTranslatedNextPageContent y proactivelyTranslatedForPageNumber AQUÍ
      return; // Importante para no proceder a traducir de nuevo si se usó caché
    }

    // NUEVA LÓGICA: Detectar automáticamente el idioma del texto original si no está definido
    if (!sourceBookLanguage || sourceBookLanguage === '') {
      // Intentamos detectar el idioma del contenido original
      const detectLanguage = async () => {
        console.log('[PAGE_N_EFFECT] Detectando idioma del contenido original...');
        try {
          // Usamos el primer párrafo no vacío para la detección
          const firstNonEmptyParagraph = originalContent
            .split('\n')
            .find(p => p.trim().length > 30) || originalContent;
            
          const sample = firstNonEmptyParagraph.substring(0, 200); // Tomamos una muestra representativa
          
          // Usar primero nuestra detección local para mayor eficiencia
          const locallyDetectedLang = OpenAIService.detectLanguageLocally(sample);
          console.log(`[PAGE_N_EFFECT] Idioma detectado localmente: ${locallyDetectedLang}`);
          
          // Si la detección local está muy segura de que es español, usamos esa
          const isConfidentSpanish = locallyDetectedLang === 'es' && (
            sample.includes('á') || sample.includes('é') || sample.includes('í') || 
            sample.includes('ó') || sample.includes('ú') || sample.includes('ñ') ||
            sample.includes('¿') || sample.includes('¡')
          );
          
          if (isConfidentSpanish) {
            console.log('[PAGE_N_EFFECT] Detección local confiada: Español');
            setSourceBookLanguage('es');
            return 'es';
          }
          
          // Si no estamos totalmente seguros, consultamos la API
          const detectedLang = await translateWord(sample, 'auto', 'en')
            .then(result => {
              // Extraer el idioma detectado del resultado o usar 'en' como fallback
              const detected = result && typeof result === 'object' && 'detectedSourceLanguage' in result 
                ? result.detectedSourceLanguage as string
                : 'en';
              
              // Si detectamos texto en español, establecer explícitamente 'es'
              if (detected === 'es' || 
                  // Palabras comunes en español para verificación adicional
                  sample.includes('del') || 
                  sample.includes(' y ') || 
                  sample.includes(' a ') || 
                  sample.includes(' el ') || 
                  sample.includes(' la ') || 
                  sample.includes(' los ') || 
                  sample.includes(' las ') || 
                  sample.includes(' que ') || 
                  sample.includes(' de ') || 
                  sample.includes(' en ') || 
                  sample.includes(' con ') || 
                  sample.includes(' por ') || 
                  sample.includes(' para ')) {
                console.log('[PAGE_N_EFFECT] Texto detectado como español por palabras comunes');
                return 'es';
              }
              
              return detected;
            })
            .catch(() => {
              // Si falla la API, confiar en nuestra detección local
              console.log('[PAGE_N_EFFECT] Error en API, usando detección local');
              return locallyDetectedLang;
            });
            
          console.log(`[PAGE_N_EFFECT] Idioma detectado final: ${detectedLang}`);
          setSourceBookLanguage(detectedLang);
          return detectedLang;
        } catch (error) {
          console.error('[PAGE_N_EFFECT] Error al detectar idioma:', error);
          return 'en'; // Valor predeterminado si falla
        }
      };
      
      setIsCurrentPageTranslating(true);
      detectLanguage().then(detectedLang => {
        // Si el idioma seleccionado es el mismo que el detectado, no hacemos traducción
        if (currentBookLanguage === detectedLang) {
          console.log('[PAGE_N_EFFECT] El idioma seleccionado coincide con el detectado, mostrando contenido original');
          setCurrentPageContentForDisplay(originalContent);
          setIsCurrentPageTranslating(false);
          lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
        } else {
          // Si son diferentes, procedemos con la traducción
          handleTranslation(originalContent, detectedLang as string);
        }
      });
      return;
    }

    // LÓGICA MEJORADA: Si el idioma actual coincide con el idioma fuente, no traducir
    if (currentBookLanguage === sourceBookLanguage) {
      console.log('[PAGE_N_EFFECT] Idioma seleccionado coincide con el del documento, mostrando contenido original');
      setCurrentPageContentForDisplay(originalContent);
      setIsCurrentPageTranslating(false);
      lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
    } else {
      // Necesita traducción para la página N
      handleTranslation(originalContent, sourceBookLanguage);
    }
    
    // Función auxiliar para manejar la traducción
    function handleTranslation(content: string, sourceLang: string) {
      if (!book) return;
      
      console.log(`[PAGE_N_EFFECT] Traduciendo de ${sourceLang} a ${currentBookLanguage}. Original: ${content.substring(0,50)}...`);
      setIsCurrentPageTranslating(true); // Indicar que estamos iniciando una carga/traducción
      setCurrentPageContentForDisplay(null); // Mostrar loader mientras se traduce N
      
      translatePageText(content, currentBookLanguage, sourceLang)
        .then(translated => {
          if (!book) return;
          console.log(`[PAGE_N_EFFECT] Traducción para página ${book.currentPage} completada. Traducido: ${translated ? translated.substring(0,50) : 'null'}...`);
          setCurrentPageContentForDisplay(translated || content); // Fallback a original si la traducción falla
          lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
        })
        .catch(error => {
          if (!book) return;
          console.error(`[PAGE_N_EFFECT] Error traduciendo página ${book.currentPage}:`, error);
          setCurrentPageContentForDisplay(content); // Fallback
          lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage }; // Registrar incluso con fallback
        })
        .finally(() => {
          setIsCurrentPageTranslating(false);
        });
    }
  }, [book?.currentPage, currentBookLanguage, sourceBookLanguage, book?.pages, proactivelyTranslatedNextPageContent, proactivelyTranslatedForPageNumber, translatePageText, translateWord, currentPageContentForDisplay, isCurrentPageTranslating]);

  // Efecto 2: Traducir proactivamente la página N+1 DESPUÉS de que N esté lista
  useEffect(() => {
    if (!book || !book.pages || book.pages.length === 0 || isCurrentPageTranslating || isProactivelyTranslatingNextPage) {
      // No hacer nada si N aún se está cargando/traduciendo, o si N+1 ya está en proceso
      return;
    }

    const currentPageNum = book.currentPage; // Esta es N
    const nextPageNum = currentPageNum + 1;    // Esta es N+1

    if (nextPageNum > book.totalPages) {
      console.log('[PAGE_N+1_EFFECT] No next page to translate proactively.');
      setProactivelyTranslatedNextPageContent(null); // Limpiar si no hay más páginas
      setProactivelyTranslatedForPageNumber(null);
      return;
    }

    // Si ya tenemos una traducción para N+1 (y es la correcta), no hacer nada.
    // Esto puede suceder si el usuario va y vuelve rápidamente.
    if (proactivelyTranslatedForPageNumber === nextPageNum && proactivelyTranslatedNextPageContent) {
      console.log(`[PAGE_N+1_EFFECT] Page ${nextPageNum} already proactively translated.`);
      return;
    }

    // Si el idioma de visualización es el original, no necesitamos pre-traducir.
    if (currentBookLanguage === sourceBookLanguage) {
      console.log('[PAGE_N+1_EFFECT] Source language, no proactive translation needed.');
      setProactivelyTranslatedNextPageContent(null);
      setProactivelyTranslatedForPageNumber(null);
      return;
    }
    
    const nextPageOriginalContent = book.pages[nextPageNum - 1]?.content; // nextPageNum es 1-indexed

    if (!nextPageOriginalContent || nextPageOriginalContent.startsWith('[Contenido de la página') || nextPageOriginalContent.startsWith('[Procesando OCR para página')) {
      console.log(`[PAGE_N+1_EFFECT] Next page ${nextPageNum} has placeholder content, not translating proactively.`);
      return;
    }

    console.log(`[PAGE_N+1_EFFECT] Starting proactive translation for page ${nextPageNum} (from current ${currentPageNum}) to ${currentBookLanguage}.`);
    setIsProactivelyTranslatingNextPage(true);
    translatePageText(nextPageOriginalContent, currentBookLanguage, sourceBookLanguage)
      .then(translated => {
        console.log(`[PAGE_N+1_EFFECT] Proactive translation for page ${nextPageNum} done. Content: ${translated ? 'OK' : 'FAIL'}`);
        setProactivelyTranslatedNextPageContent(translated);
        setProactivelyTranslatedForPageNumber(nextPageNum); // Guardar para qué página N+1 es esta traducción
      })
      .catch(error => {
        console.error(`[PAGE_N+1_EFFECT] Error proactively translating page ${nextPageNum}:`, error);
        setProactivelyTranslatedNextPageContent(null); // Limpiar en caso de error
        setProactivelyTranslatedForPageNumber(null);
      })
      .finally(() => {
        setIsProactivelyTranslatingNextPage(false);
      });

  // Dependencias: cuando la página N cambia, o el contenido de N (currentPageContentForDisplay) se establece,
  // o el idioma del libro cambia. También book.pages para el contenido de N+1.
  }, [currentPageContentForDisplay, book?.currentPage, currentBookLanguage, sourceBookLanguage, book?.totalPages, book?.pages, isCurrentPageTranslating, isProactivelyTranslatingNextPage, translatePageText]);
  
  // Actualizar allWords cuando currentPageContentForDisplay cambie
  useEffect(() => {
    if (currentPageContentForDisplay) {
      setAllWords(currentPageContentForDisplay.split(/\s+/));
    } else if (book && book.pages && book.pages.length > 0 && book.currentPage <= book.totalPages && book.currentPage > 0) {
      // Fallback al contenido original si currentPageContentForDisplay es null y la página es válida
      const originalContent = book.pages[book.currentPage - 1]?.content || '';
      setAllWords(originalContent.split(/\s+/));
    }
  }, [currentPageContentForDisplay, book?.currentPage, book?.pages, book?.totalPages]);

  // Guardar la referencia de la página actual para la lógica de N+1
  useEffect(() => {
    if (book) {
      prevBookPageRef.current = book.currentPage;
    }
  }, [book?.currentPage]);

  // Limpiar traducciones proactivas si el idioma vuelve al original o el libro cambia
  useEffect(() => {
    if (currentBookLanguage === sourceBookLanguage || !book) {
      console.log('[CLEANUP_EFFECT] Clearing proactive translations (language changed to source or no book).');
      setProactivelyTranslatedNextPageContent(null);
      setProactivelyTranslatedForPageNumber(null);
    }
  }, [currentBookLanguage, sourceBookLanguage, book]);

  // Nuevo efecto para limpiar la caché proactiva de N+1 si ya no es la "siguiente" página relevante
  useEffect(() => {
    if (book && proactivelyTranslatedForPageNumber !== null) {
      const expectedProactivePage = book.currentPage + 1;
      // Limpiar si la página cacheada no es la siguiente esperada, o si la siguiente esperada excede el total de páginas
      if (proactivelyTranslatedForPageNumber !== expectedProactivePage || expectedProactivePage > book.totalPages) {
        console.log(`[PROACTIVE_CLEANUP] Clearing proactive cache for page ${proactivelyTranslatedForPageNumber}. Current page: ${book.currentPage}. Expected next: ${expectedProactivePage}. Total pages: ${book.totalPages}.`);
        setProactivelyTranslatedNextPageContent(null);
        setProactivelyTranslatedForPageNumber(null);
      }
    }
  }, [book?.currentPage, book?.totalPages, proactivelyTranslatedForPageNumber]); // Dependencia clave: book.currentPage

  // Guardar la última página leída al desmontar el componente
  useEffect(() => {
    return () => {
      if (book && book.id) {
        updateReadingProgress(book.id, book.currentPage);
        console.log('Guardando progreso al salir del lector:', book.currentPage);
      }
    };
  }, [book]);

  // NUEVO: Actualizar la base de datos cada vez que cambie la página actual
  useEffect(() => {
    // Solo actualizar si el libro está cargado y tiene ID
    if (book && book.id && book.currentPage > 0) {
      // Evitar actualizaciones durante la carga inicial
      if (!isLoading) {
        console.log(`[PROGRESO] Actualizando página actual en DB: ${book.currentPage}`);
        updateReadingProgress(book.id, book.currentPage);
      }
    }
  }, [book?.currentPage, book?.id, isLoading, updateReadingProgress]);

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
  const setFloating = useMemo(() => (node: HTMLDivElement | null) => {
    refs.setFloating(node);
    // Utilizamos useEffect para actualizar la referencia de manera segura
  }, [refs]);
  
  // Actualizar la referencia translationRef cuando cambie el nodo floating
  useEffect(() => {
    const currentFloating = refs.floating.current;
    if (currentFloating && translationRef.current !== currentFloating) {
      translationRef.current = currentFloating;
    }
  }, [refs.floating]);

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
        // Aquí, sourceLanguageCode es currentBookLanguage y targetLanguageCode es 'es'
        translateTextSelection(selectedRange, currentBookLanguage, 'es');
      }
    } else {
      // Modo normal de traducción de palabra individual
    if (word.text.trim() === '') return;
    
    // Para el tooltip de palabra individual, traducimos del currentBookLanguage al español
    // La palabra que se muestra en el tooltip (selectedWord) es la del texto (que podría estar ya traducido)
    setSelectedWord(word.text); 
    setSelectedWordIndex(index); 
    setTooltipAnchor(event.currentTarget);
    setIsTooltipOpen(true);
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    }
  }, [isSelectingTextRange, startWordIndex, endWordIndex, allWords, translateWord, currentBookLanguage]); // Añadir currentBookLanguage y translateWord

  // Función para traducir el texto seleccionado automáticamente
  const translateTextSelection = async (text: string, sourceLang: string, targetLang: string) => {
    if (!text) return;
    
    setShowAIChatModal(false); // Asegurarse de que el chat esté cerrado
    setIsTranslating(true);
    
    try {
      // Usamos translateParagraph del hook, que ahora toma source y target
      const result = await translateParagraph(text, sourceLang, targetLang);
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
  const playTranslationAudio = async (language: 'en' | 'es' | string, textToPlay?: string) => {
    const textForAudio = textToPlay || (language === currentBookLanguage ? selectedText : translatedText);
    if (!textForAudio) return;

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      setIsPlayingAudio(language);
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const langCodeForTTS = language === 'es' ? 'es' : currentBookLanguage;

      if (apiKey) {
        await TTSService.speakText(textForAudio, langCodeForTTS as 'en' | 'es'); 
      } else {
        TTSService.speakTextUsingWebSpeech(textForAudio, langCodeForTTS as 'en' | 'es');
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
    if (book && book.bookmarked && contentRef.current && book.bookmark_position !== undefined) {
      // Usar un pequeño timeout para asegurar que el contenido ya está renderizado
      setTimeout(() => {
        if (contentRef.current && book.bookmark_position !== undefined) {
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
    
    // Calcular el porcentaje de progreso con verificación de null/undefined
    const ocrProgress = book.ocrProgress || 0;
    const ocrTotal = book.ocrTotal || 1; // Evitar dividir por cero
    const progressPercent = Math.round((ocrProgress / ocrTotal) * 100);
    
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
    if (book?.ocrInProgress && book.ocrTotal && book.ocrTotal > 0) {
      const ocrProgress = book.ocrProgress || 0;
      const ocrTotal = book.ocrTotal;
      const percent = Math.round((ocrProgress / ocrTotal) * 100);
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

  // State for AI Chat Modal
  const [showAIChatModal, setShowAIChatModal] = useState(false);

  // Estados para el popover de selección de idioma
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false);
  const languageButtonRef = useRef<HTMLButtonElement>(null);

  const languageOptions = useMemo(() => [
    { code: "en", name: getLanguageName("en") },
    { code: "it", name: getLanguageName("it") },
    { code: "fr", name: getLanguageName("fr") },
    { code: "ja", name: getLanguageName("ja") },
    { code: "de", name: getLanguageName("de") },
    { code: "pt", name: getLanguageName("pt") },
    { code: "ru", name: getLanguageName("ru") },
    { code: "zh", name: getLanguageName("zh") },
    { code: "ar", name: getLanguageName("ar") },
    { code: "hi", name: getLanguageName("hi") },
    { code: "ko", name: getLanguageName("ko") },
    { code: "nl", name: getLanguageName("nl") },
    { code: "sv", name: getLanguageName("sv") },
    { code: "tr", name: getLanguageName("tr") },
  ], []);

  const { refs: langPopoverRefs, floatingStyles: langPopoverFloatingStyles, context: langPopoverContext } = useFloating({
    open: isLanguagePopoverOpen,
    onOpenChange: setIsLanguagePopoverOpen,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  const langClick = useClick(langPopoverContext);
  const langDismiss = useDismiss(langPopoverContext);
  const langRole = useRole(langPopoverContext, { role: 'listbox' });

  const { getReferenceProps: getLangReferenceProps, getFloatingProps: getLangFloatingProps } = useInteractions([
    langClick,
    langDismiss,
    langRole,
  ]);

  // Efecto para cargar el idioma de visualización predeterminado (inglés) una vez al cargar
  useEffect(() => {
    // Inicializar inglés como idioma de visualización por defecto
    setCurrentBookLanguage('en');
  }, []); // Ejecutar solo una vez al montar

  // Nuevo efecto para cargar el idioma preferido del usuario, usando tanto localStorage como Supabase
  useEffect(() => {
    const loadPreferredLanguage = async () => {
      // OMITIMOS CARGAR DESDE LOCALSTORAGE inicialmente para asegurar visualización en inglés
      /*
      const savedLanguage = localStorage.getItem('preferred_language');
      if (savedLanguage) {
        console.log('Idioma cargado desde localStorage:', savedLanguage);
        setCurrentBookLanguage(savedLanguage);
      }
      */
      
      try {
        // Luego verificamos si hay una preferencia guardada en Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Consultar el perfil del usuario para buscar preferencia de idioma
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!error && data) {
            // Si el perfil tiene la propiedad, usarla SOLO si no es para visualizar español
            if (data.preferred_language && data.preferred_language !== 'es') {
              console.log('Idioma cargado desde Supabase:', data.preferred_language);
              setCurrentBookLanguage(data.preferred_language);
            } else {
              // Si es español, forzamos a inglés
              setCurrentBookLanguage('en');
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar la preferencia de idioma:', error);
        // En caso de error, usar inglés como predeterminado
        setCurrentBookLanguage('en');
      }
    };
    
    loadPreferredLanguage();
  }, []);
  
  // Función mejorada para guardar el idioma preferido en ambos lugares
  const savePreferredLanguage = async (languageCode: string) => {
    // Siempre guardar en localStorage para acceso rápido
    localStorage.setItem('preferred_language', languageCode);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Intentar actualizar la preferencia en Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: languageCode })
          .eq('id', user.id);
          
        if (error) {
          console.error('Error al guardar idioma en Supabase:', error);
          // Si el error es porque la columna no existe, podríamos
          // crear la columna o usar un enfoque alternativo
        } else {
          console.log('Idioma guardado en Supabase:', languageCode);
        }
      }
    } catch (error) {
      console.error('Error al acceder a Supabase:', error);
    }
  };

  // Nuevo efecto que verifica si la página actual está vacía después de cargar el libro
  useEffect(() => {
    // Solo ejecutar una vez cuando el libro se ha cargado inicialmente
    if (book && !isLoading) {
      console.log('[VERIFICACIÓN] Comprobando si la página actual está vacía');
      
      const currentPageIndex = book.currentPage - 1;
      if (currentPageIndex < 0 || currentPageIndex >= book.pages.length) {
        console.log('[VERIFICACIÓN] Índice de página actual fuera de rango:', currentPageIndex);
        return;
      }
      
      const currentPageContent = book.pages[currentPageIndex]?.content;
      if (!currentPageContent || currentPageContent.trim().length === 0) {
        console.log('[VERIFICACIÓN] La página actual está vacía, buscando la primera página con contenido');
        
        // Buscar la primera página no vacía después de la actual
        let nextValidPage = book.currentPage + 1;
        while (nextValidPage <= book.totalPages) {
          const nextPageContent = book.pages[nextValidPage - 1]?.content;
          if (nextPageContent && nextPageContent.trim().length > 0) {
            console.log(`[VERIFICACIÓN] Encontrada página válida: ${nextValidPage}`);
            goToPage(nextValidPage);
            break;
          }
          nextValidPage++;
        }
        
        if (nextValidPage > book.totalPages) {
          console.log('[VERIFICACIÓN] No se encontraron páginas válidas después de la actual');
          
          // Alternativamente, buscar hacia atrás
          let prevValidPage = book.currentPage - 1;
          while (prevValidPage >= 1) {
            const prevPageContent = book.pages[prevValidPage - 1]?.content;
            if (prevPageContent && prevPageContent.trim().length > 0) {
              console.log(`[VERIFICACIÓN] Encontrada página válida anterior: ${prevValidPage}`);
              goToPage(prevValidPage);
              break;
            }
            prevValidPage--;
          }
        }
      } else {
        console.log('[VERIFICACIÓN] La página actual tiene contenido válido');
      }
    }
  }, [book, isLoading, goToPage]);

  // Modificar el efecto que detecta español
  useEffect(() => {
    if (book && book.pages && book.pages.length > 0) {
      // Tomar una muestra representativa del libro para análisis de idioma
      const pageIndex = book.currentPage - 1;
      const pageContent = book.pages[pageIndex]?.content || '';
      
      // Ignorar mensajes de error o placeholders
      if (!pageContent || 
          pageContent.startsWith('[Contenido de la página') || 
          pageContent.startsWith('[Procesando OCR para página') ||
          pageContent.startsWith('[Página') ||
          pageContent.startsWith('[Error')) {
        console.log('[DETECCIÓN-ESPAÑOL] Ignorando contenido de marcador de posición o error');
        return;
      }
      
      // Verificar si el contenido ya está en inglés
      const isEnglishContent = 
        (pageContent.includes('the ') || pageContent.includes('The ')) && 
        (pageContent.includes(' of ') || pageContent.includes(' for ')) && 
        (pageContent.includes(' and ') || pageContent.includes(' or ')) &&
        !pageContent.includes('á') && !pageContent.includes('é') && 
        !pageContent.includes('í') && !pageContent.includes('ó') && 
        !pageContent.includes('ú') && !pageContent.includes('ñ');
      
      if (isEnglishContent) {
        console.log('[DETECCIÓN-ESPAÑOL] Contenido detectado en inglés, manteniendo idioma original');
        setSourceBookLanguage('en');
        return;
      }
      
      // Si el contenido tiene caracteres españoles, establecer idioma fuente como español
      const isSpanishContent = 
        pageContent.includes('á') || pageContent.includes('é') || 
        pageContent.includes('í') || pageContent.includes('ó') || 
        pageContent.includes('ú') || pageContent.includes('ñ') ||
        pageContent.includes('¿') || pageContent.includes('¡') ||
        (pageContent.includes(' el ') && pageContent.includes(' la ') && 
         pageContent.includes(' en ') && pageContent.includes(' con '));
      
      if (isSpanishContent) {
        console.log('[DETECCIÓN-ESPAÑOL] Contenido detectado en español, configurando para traducción ES→EN');
        setSourceBookLanguage('es');
        // Forzar idioma de visualización a inglés independientemente de localStorage
        setCurrentBookLanguage('en');
        
        // NUEVO: Forzar la traducción inmediata para la primera página si aún no hay contenido traducido
        if (!currentPageContentForDisplay) {
          // Asegurarnos de que la página actual tiene contenido válido
          if (pageContent && 
              !pageContent.startsWith('[Contenido de la página') && 
              !pageContent.startsWith('[Procesando OCR para página') &&
              !pageContent.startsWith('[Página') &&
              !pageContent.startsWith('[Error')) {
            console.log('[DETECCIÓN-ESPAÑOL] Forzando traducción inmediata de primera página');
            // Usar la función auxiliar handleTranslation que está definida en el efecto principal
            // Para asegurar que esto funcione, definimos la función fuera del efecto principal
            setIsCurrentPageTranslating(true);
            translatePageText(pageContent, 'en', 'es')
              .then(translated => {
                if (!book) return;
                console.log(`[TRADUCCIÓN-INMEDIATA] Traducción para página ${book.currentPage} completada.`);
                setCurrentPageContentForDisplay(translated || pageContent);
                lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: 'en' };
              })
              .catch(error => {
                console.error('[TRADUCCIÓN-INMEDIATA] Error traduciendo:', error);
                setCurrentPageContentForDisplay(pageContent); // Fallback al original
              })
              .finally(() => {
                setIsCurrentPageTranslating(false);
              });
          }
        }
      }
    }
  }, [book, book?.currentPage, book?.pages, currentPageContentForDisplay, translatePageText]);

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
  
  // Mostrar el indicador de carga si el libro está en proceso de carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <BookLoadingIndicator />
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
      <div className={`fixed ${!isFullScreen ? 'md:top-16 top-16' : 'top-0'} left-0 right-0 z-[999] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b-2 border-purple-500 dark:border-purple-700 shadow-md`}>
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center space-x-2 sm:space-x-3">
          {/* Botón izquierdo: volver o salir */}
          {isFullScreen ? (
            <button
              onClick={exitFullScreen}
              className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
              aria-label="Salir de pantalla completa"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/books')}
              className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
              aria-label="Volver a la biblioteca"
            >
              <Home size={18} />
            </button>
          )}

          {/* Separador Añadido */}
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 opacity-50 flex-shrink-0"></div>

          {/* Botón Selector de Idioma Circular */}
          <div className="relative flex-shrink-0">
            <button
              ref={langPopoverRefs.setReference}
              {...getLangReferenceProps()}
              type="button"
              className="w-auto min-w-[36px] h-9 px-2 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-xs font-semibold border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={`Idioma actual: ${getLanguageName(currentBookLanguage)}`}
            >
              <Flag code={languageToCountryCode[currentBookLanguage] || 'US'} className="w-5 h-4" />
              <ChevronDown size={14} className="ml-1 opacity-75" />
            </button>
            {isLanguagePopoverOpen && (
              <FloatingFocusManager context={langPopoverContext} modal={false}>
                <div
                  ref={langPopoverRefs.setFloating}
                  style={{...langPopoverFloatingStyles, zIndex: 9999}}
                  {...getLangFloatingProps()}
                  className="z-[9999] bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden py-1 max-h-60 overflow-y-auto focus:outline-none"
                  aria-orientation="vertical"
                >
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      role="option"
                      aria-selected={currentBookLanguage === lang.code}
                      onClick={() => {
                        setCurrentBookLanguage(lang.code);
                        savePreferredLanguage(lang.code); // Guardar la preferencia
                        setIsLanguagePopoverOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium flex items-center justify-between
                        ${currentBookLanguage === lang.code 
                          ? 'bg-purple-100 dark:bg-purple-700 text-purple-700 dark:text-purple-100' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      <span className="flex items-center">
                        <Flag code={languageToCountryCode[lang.code] || 'US'} className="w-5 h-4 mr-2" />
                        {lang.name}
                      </span>
                      {currentBookLanguage === lang.code && <Check size={16} className="text-purple-600 dark:text-purple-200" />}
                    </button>
                  ))}
                </div>
              </FloatingFocusManager>
            )}
          </div>
          
          {/* Separador */}
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 opacity-50 flex-shrink-0"></div>
          
          {/* Información central: Título del Libro */}
          <div className="flex-grow text-center overflow-hidden px-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={book.title}>
              {book.title}
            </span>
          </div>

          {/* Separador */}
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 opacity-50 flex-shrink-0"></div>

          {/* Controles de tema y pantalla completa */}
          <div className="flex items-center space-x-2 flex-shrink-0">
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

      {/* Contenido principal Refactorizado */}
      <div 
        className={`flex-grow overflow-y-auto p-4 ${
          !isFullScreen 
            ? 'pt-6 pb-32 md:pt-4 md:pb-36' // Reducir el padding superior para tener menos espacio
            : 'pt-14 pb-16' // Aumentado de pt-4 a pt-14
        }`} 
        ref={contentRef}
      >
        <div 
          className="max-w-3xl mx-auto text-justify px-2"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        >
          {isCurrentPageTranslating ? (
            <PageLoadingIndicator languageName={getLanguageName(currentBookLanguage)} />
          ) : book.pages[book.currentPage - 1]?.content.startsWith('[Contenido de la página') || book.pages[book.currentPage - 1]?.content.startsWith('[Procesando OCR para página') ? (
            book.ocrInProgress ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                {/* Popup de OCR es suficiente */}
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
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
          ) : currentPageContentForDisplay ? (
            allWords.map((word, idx) => (
              <React.Fragment key={`${word}-${idx}`}>
                <span
                  className={`
                    word inline-block cursor-pointer px-1 py-0.5 rounded transition-colors 
                    border mx-[2px] my-[1px]
                    ${isSelectingTextRange 
                      ? startWordIndex === idx 
                        ? 'bg-purple-600 text-white border-purple-700'
                        : startWordIndex !== null && endWordIndex !== null && idx >= startWordIndex && idx <= endWordIndex
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-gray-800 dark:text-white border-purple-200 dark:border-purple-800'
                          : 'bg-gray-50 dark:bg-gray-800/30 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                      : idx === selectedWordIndex && isTooltipOpen
                        ? 'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 ring-opacity-50 dark:ring-blue-400 dark:ring-opacity-50' 
                        : 'bg-gray-50 dark:bg-gray-800/30 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    }
                  `}
                  onClick={(e) => handleWordClick({ text: word, index: idx }, e, idx)}
                  title={!isSelectingTextRange ? `Traducir "${word}" del ${getLanguageName(currentBookLanguage)} al español` : startWordIndex === null ? "Selecciona como inicio" : "Selecciona como fin"}
                >
                  {word}
                </span>
                {' '}
              </React.Fragment>
            ))
          ) : (
            // Si no hay contenido para mostrar, verificar el estado de carga o si la página está vacía
            isLoading ? (
              <BookLoadingIndicator />
            ) : book && book.pages && book.currentPage <= book.pages.length ? (
              // Verificar si la página actual está realmente vacía
              (() => {
                const currentPageContent = book.pages[book.currentPage - 1]?.content || '';
                const isEmpty = !currentPageContent || currentPageContent.trim().length === 0;
                
                console.log(`[RENDERIZADO] Verificando contenido de página ${book.currentPage}. Vacía: ${isEmpty}. Longitud: ${currentPageContent.length}`);
                
                if (isEmpty) {
                  // Si la página está vacía, mover automáticamente a la siguiente con contenido
                  console.log('[RENDERIZADO] Página actual vacía, mostrando indicador de carga mientras se busca una página con contenido');
                  
                  // Usar setTimeout para que no bloquee el renderizado
                  setTimeout(() => {
                    let nextPageToTry = book.currentPage + 1;
                    while (nextPageToTry <= book.totalPages) {
                      const nextContent = book.pages[nextPageToTry - 1]?.content || '';
                      if (nextContent && nextContent.trim().length > 0) {
                        console.log(`[RENDERIZADO] Navegando automáticamente a página ${nextPageToTry} con contenido`);
                        goToPage(nextPageToTry);
                        break;
                      }
                      nextPageToTry++;
                    }
                    
                    // Si no se encontró ninguna página con contenido, mostrar mensaje
                    if (nextPageToTry > book.totalPages) {
                      console.log('[RENDERIZADO] No se encontraron páginas con contenido');
                    }
                  }, 0);
                  
                  return <BookLoadingIndicator />;
                } else {
                  return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No se pudo cargar el contenido en esta página.</div>;
                }
              })()
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">No hay contenido disponible en esta página.</div>
            )
          )}
        </div>
      </div>

      {/* Barra de control inferior fija */}
      <div className="reader-controls fixed bottom-[56px] sm:bottom-16 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-2 z-[100] transition-opacity duration-300 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-1">
          {/* Botones de utilidad */}
          <div className="flex items-center space-x-2">
            {/* Botón de traducción de texto MODIFICADO */}
            <button
              onClick={isSelectingTextRange ? cancelTextSelection : startTextSelection}
              className={`p-1.5 rounded-full border-2 flex items-center transition-colors duration-150 focus:outline-none
                ${isSelectingTextRange 
                  ? 'border-teal-400 text-teal-500 bg-teal-50 dark:bg-teal-900/30' 
                  : 'border-gray-400 text-gray-500 hover:border-gray-500 hover:text-gray-600 dark:border-gray-500 dark:text-gray-400'
                }`}
              title={isSelectingTextRange ? "Cancelar selección de párrafo" : "Seleccionar párrafo para traducir"}
            >
              <Languages size={18} />
            </button>
            
            {/* Línea divisoria vertical */}
            <div className="h-5 w-px bg-gray-300/60 dark:bg-gray-700/60"></div>
            
            {/* Botón de Lexingo AI NUEVO */}
            <button
              onClick={() => {
                const currentPageContent = book?.pages[book.currentPage - 1]?.content || '';
                setAiChatContextText(currentPageContent);
                setShowAIChatModal(true); 
              }}
              className="p-0.5 rounded-full border-2 border-teal-400 hover:opacity-80 flex items-center focus:outline-none"
              title="Consultar con Lexingo AI sobre esta página"
            >
              <img src="/img/icono_lexingo.png" alt="Lexingo AI" className="w-5 h-5 rounded-full" />
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
            <span className="mx-3 text-sm text-gray-700 dark:text-gray-300 font-medium tabular-nums">
              {book.currentPage}
              <span className="px-1">/</span>
              {book.totalPages}
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
        sourceLanguage={currentBookLanguage}
        sourceLanguageName={getLanguageName(currentBookLanguage)}
        targetLanguage="es"
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
            <div className="text-sm text-gray-100 font-medium capitalize">Texto en {getLanguageName(currentBookLanguage)}</div>
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
                  onClick={() => {
                    if (selectedText) {
                      setAiChatContextText(selectedText);
                      setShowAIChatModal(true);
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded text-xs text-white"
                  title="Consultar con IA sobre este texto"
                >
                  <Sparkles size={14} />
                  <span>Consultar IA</span>
                </button>
                <button
                  onClick={isPlayingAudio === currentBookLanguage ? stopAudio : () => playTranslationAudio(currentBookLanguage, selectedText)}
                  className={`flex items-center space-x-1 px-3 py-1.5 ${isPlayingAudio === currentBookLanguage ? 'bg-red-900/50 hover:bg-red-800' : 'bg-gray-700 hover:bg-gray-600'} rounded text-xs`}
                  disabled={isPlayingAudio === 'es' || !['en', 'es', 'it', 'fr', 'ja', 'de', 'pt'].includes(currentBookLanguage) }
                >
                  <span className="capitalize">{isPlayingAudio === currentBookLanguage ? "Detener" : getLanguageName(currentBookLanguage)}</span>
                  {isPlayingAudio === currentBookLanguage ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                
                <button
                  onClick={isPlayingAudio === 'es' ? stopAudio : () => playTranslationAudio('es', translatedText)}
                  className={`flex items-center space-x-1 px-3 py-1.5 ${isPlayingAudio === 'es' ? 'bg-red-900/50 hover:bg-red-800' : 'bg-blue-900/50 hover:bg-blue-800'} rounded text-xs`}
                  disabled={isPlayingAudio === 'en'}
                >
                  <span>Español</span>
                  {isPlayingAudio === 'es' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showAIChatModal && aiChatContextText && (
        <AIChatModal 
          isOpen={showAIChatModal}
          onClose={() => {
            setShowAIChatModal(false);
            setAiChatContextText(''); // Limpiar contexto al cerrar
          }}
          initialText={aiChatContextText}
        />
      )}

      {/* Estilos de scrollbar y animaciones */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite ease-in-out;
        }
        
        /* Estilo mejorado para scrollbar - Modo claro */
        .reader-fullscreen::-webkit-scrollbar,
        div::-webkit-scrollbar {
          width: 10px;
        }
        
        .reader-fullscreen::-webkit-scrollbar-track,
        div::-webkit-scrollbar-track {
          background: rgba(243, 244, 246, 0.8);
          border-radius: 10px;
        }
        
        .reader-fullscreen::-webkit-scrollbar-thumb,
        div::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
          border-radius: 10px;
          border: 2px solid rgba(243, 244, 246, 0.8);
          transition: all 0.3s ease;
        }
        
        .reader-fullscreen::-webkit-scrollbar-thumb:hover,
        div::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #9333ea 0%, #6b21a8 100%);
        }
        
        /* Estilo de scrollbar para modo oscuro */
        .dark .reader-fullscreen::-webkit-scrollbar-track,
        .dark div::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.8);
          border-radius: 10px;
        }
        
        .dark .reader-fullscreen::-webkit-scrollbar-thumb,
        .dark div::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #9333ea 0%, #6b21a8 100%);
          border: 2px solid rgba(31, 41, 55, 0.8);
        }
        
        .dark .reader-fullscreen::-webkit-scrollbar-thumb:hover,
        .dark div::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
        }
        
        .reader-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
        }

        /* Asegurar que el header esté por encima */
        header, .navbar, nav {
          z-index: 999 !important;
        }
        
        /* Asegurar que el menú desplegable esté por encima */
        .dropdown-menu, .popover, .floating-ui {
          z-index: 9999 !important;
        }
        
        /* Asegurar que la barra de controles esté por encima de la navegación */
        .reader-controls {
          bottom: 56px !important;
          width: 100% !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 50 !important;
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
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

const PageLoadingIndicator: React.FC<{ languageName: string }> = ({ languageName }) => (
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] text-center p-4">
    <div className="flex items-center justify-center space-x-3 mb-5">
      <img
        src="/img/icono_lexingo.png" // Asegúrate que esta ruta es correcta
        alt="Lexingo AI"
        className="w-10 h-10" // Icono más pequeño
      />
      <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
    </div>
    <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">
      Lexingo AI está traduciendo a {languageName}...
    </h2>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Un momento, por favor.
    </p>
  </div>
);

// Componente de carga para cuando el libro está vacío o procesándose
const BookLoadingIndicator: React.FC = () => {
  // Añadir las nuevas animaciones en el estilo CSS
  useEffect(() => {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .simple-spin {
          animation: spin 1.5s linear infinite;
        }
      </style>`
    );
    
    return () => {
      // Este código limpiaría los estilos al desmontar
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] text-center p-4">
      <div className="mb-6 relative">
        {/* Logo Lexingo con spinner simple */}
        <div className="relative flex items-center justify-center">
          <img
            src="/img/icono_lexingo.png"
            alt="Lexingo AI"
            className="w-16 h-16 z-10"
          />
          <div className="absolute inset-0 border-2 border-transparent border-t-purple-500 border-r-blue-500 rounded-full simple-spin" style={{ width: '68px', height: '68px' }}></div>
        </div>
      </div>
      
      {/* Texto simple */}
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">
        Lexingo AI está procesando el documento
      </h2>
      
      {/* Indicador de carga simple */}
      <div className="flex items-center justify-center space-x-2 mb-5">
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        Preparando tu experiencia de lectura con tecnología de IA
      </p>
    </div>
  );
};

const ExportedReader = Reader;
export default ExportedReader;