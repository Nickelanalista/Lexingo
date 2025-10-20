import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { useTranslator } from '../hooks/useTranslator';
import { useAudiobook } from '../hooks/useAudiobook';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { getLanguageName, OpenAIService } from '../services/openai';
import { Word, TranslationResult, Book } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Minimize, Sun, Moon, Plus, Minus, HelpCircle, X, ArrowLeft, ArrowRight, Home, Languages, Volume2, VolumeX, Loader2, Sparkles, Check, ChevronDown, Play, Pause, Square, SkipForward, SkipBack, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFloating, offset, flip, shift, autoUpdate, useClick, useDismiss, useRole, useInteractions, FloatingFocusManager } from '@floating-ui/react';
import { AudiobookService } from '../services/audiobookService';
import { supabase } from '../lib/supabase';
import AIChatModal from './AIChatModal';
import AudiobookControls from './AudiobookControls';
import KaraokeText from './KaraokeText';
import SyncedLyricsDisplay from './SyncedLyricsDisplay';
import AudiobookDebugInfo from './AudiobookDebugInfo';
import OCRProgressPopup from './OCRProgressPopup';
import TranslationProgressPopup from './TranslationProgressPopup';
import MinimalLoadingIndicator from './MinimalLoadingIndicator';
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
  const { 
    translateParagraph, 
    translateWord, 
    translatePageText, 
    translateBookPages, 
    cancelTranslation,
    resetTranslationState,
    isTranslating: isTranslatorLoading,
    isTranslatingBulk,
    translationProgress,
    translationTotal,
    isCancellingTranslation,
    currentFromLanguage,
    currentToLanguage
  } = useTranslator();
  const { cancelOCR, isProcessingBackground, ocrProgress, ocrTotal, isCancelling } = useFileProcessor();
  
  // Estado para el avatar del usuario
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>('U');
  
  // Hook del audiolibro
  const [audiobookState, audiobookControls] = useAudiobook();
  
  // Cargar perfil del usuario para el header
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          // Obtener iniciales del nombre
          const name = data.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
          const initials = name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
          
          setUserInitials(initials);
          
          // Si tiene avatar, usarlo
          if (data.avatar_url) {
            setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  // Agregar estilos para la línea divisoria brillante
  useEffect(() => {
    const styleId = 'reader-header-divider-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes shimmerLine {
          0% {
            background-position: -300% 50%;
          }
          100% {
            background-position: 300% 50%;
          }
        }
        
        .header-divider {
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 30%,
            rgba(147, 51, 234, 0.1) 40%,
            rgba(147, 51, 234, 0.3) 45%,
            rgba(147, 51, 234, 0.6) 48%,
            rgba(147, 51, 234, 0.8) 50%,
            rgba(147, 51, 234, 0.6) 52%,
            rgba(147, 51, 234, 0.3) 55%,
            rgba(147, 51, 234, 0.1) 60%,
            transparent 70%,
            transparent 100%
          );
          background-size: 600% 100%;
          animation: shimmerLine 20s linear infinite;
        }
        
        .simple-divider {
          background: #d1d5db;
        }
        
        .dark .simple-divider {
          background: #4b5563;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  
  // Estado para mostrar el mensaje de páginas omitidas
  const [showSkippedMessage, setShowSkippedMessage] = useState(false);
  
  // Estado para el idioma de lectura actual del libro - inicializar con idioma preferido
  const [currentBookLanguage, setCurrentBookLanguage] = useState<string>(() => {
    return localStorage.getItem('preferred_language') || 'en';
  });
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
  
  // Flag para evitar bucle infinito en la verificación de páginas
  const [hasCheckedPages, setHasCheckedPages] = useState(false);
  
  // Flag para indicar que estamos navegando manualmente (evitar interferencia)
  const [isManuallyNavigating, setIsManuallyNavigating] = useState(false);

  const prevBookPageRef = useRef<number | null>(null);
  const lastDisplayedPageAndLangRef = useRef({ page: 0, lang: '' });
  
  // NUEVO: Estado para rastrear si ya se detectó el idioma del libro para evitar re-detecciones
  const [bookLanguageDetected, setBookLanguageDetected] = useState(false);
  
  // Cargar el último libro leído si no hay un libro seleccionado
  useEffect(() => {
    const fetchLastReadBook = async () => {
      if (!book) {
        try {
          // Cargar último libro leído
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
            // No hay libro reciente disponible
            return;
          }
          
          // Cargar el libro encontrado
          const bookContent = JSON.parse(data.content);
          
          // Verificar si el libro tiene contenido válido
          if (!bookContent || bookContent.length === 0) {
            return;
          }
          
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
          loadBookAndSkipEmptyPages(bookData);
          
          // Resetear flags para el nuevo libro
          setBookLanguageDetected(false);
          setHasCheckedPages(false);
        } catch (error) {
          console.error('Error al cargar el último libro leído:', error);
        }
      }
    };
    
    fetchLastReadBook();
  }, [book, loadBookAndSkipEmptyPages, setBook]);
  
  // MEJORADO: Efecto único para detectar el idioma del libro solo una vez al cargarse
  useEffect(() => {
    if (book && !isLoading && !bookLanguageDetected) {
      // Detectar idioma del libro
      
      // Buscar una página con contenido válido para la detección
      let pageWithContent = null;
      let pageContentForDetection = '';
      
      for (let i = 0; i < Math.min(book.pages.length, 5); i++) { // Revisar máximo 5 páginas
        const pageContent = book.pages[i]?.content || '';
        if (pageContent && 
            !pageContent.startsWith('[Contenido de la página') && 
            !pageContent.startsWith('[Procesando OCR para página') &&
            !pageContent.startsWith('[Página') &&
            !pageContent.startsWith('[Error') &&
            pageContent.trim().length > 50) { // Contenido mínimo para detección confiable
          pageWithContent = i + 1;
          pageContentForDetection = pageContent;
          break;
        }
      }
      
      if (!pageWithContent) {
        // No hay contenido para detectar idioma, usar inglés por defecto
        setSourceBookLanguage('en');
        setBookLanguageDetected(true);
        return;
      }
      
      // Detectar idioma del contenido encontrado
      
      // Detectar idioma basado en características del texto
      const detectBookLanguage = (content: string): string => {
        // Verificar indicadores fuertes de español
        const spanishIndicators = ['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'];
        const hasSpanishChars = spanishIndicators.some(char => content.includes(char));
        
        // Palabras comunes en español
        const spanishWords = [' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' de ', ' en ', ' con ', ' por ', ' para ', ' que ', ' y ', ' o '];
        const spanishWordCount = spanishWords.filter(word => content.toLowerCase().includes(word)).length;
        
        // Verificar indicadores de inglés
        const englishWords = [' the ', ' of ', ' and ', ' to ', ' a ', ' in ', ' for ', ' is ', ' on ', ' that ', ' by ', ' this ', ' with ', ' i ', ' you ', ' it ', ' not ', ' or ', ' be ', ' are '];
        const englishWordCount = englishWords.filter(word => content.toLowerCase().includes(word)).length;
        
        // Terminaciones típicas
        const spanishEndings = content.match(/\w+(ción|dad|mente|aba|aban|ado|ido|amos|emos|imos)\b/gi) || [];
        const englishEndings = content.match(/\w+(ing|ly|ed|tion|ness)\b/gi) || [];
        
        
        // Decidir el idioma
        const spanishScore = spanishWordCount + spanishEndings.length + (hasSpanishChars ? 10 : 0);
        const englishScore = englishWordCount + englishEndings.length;
        
        if (spanishScore > englishScore + 5) {
          return 'es';
        } else {
          return 'en';
        }
      };
      
      const detectedLanguage = detectBookLanguage(pageContentForDetection);
      
      setSourceBookLanguage(detectedLanguage);
      setBookLanguageDetected(true);
      
      // NUEVA LÓGICA: Verificar si necesitamos traducir automáticamente
      const checkAndAutoTranslate = async () => {
        console.log('🔥 [checkAndAutoTranslate] FUNCIÓN EJECUTÁNDOSE!');
        console.log('🔥 [checkAndAutoTranslate] - Book ID:', book.id);
        console.log('🔥 [checkAndAutoTranslate] - Book pages:', book.pages?.length);
        
        try {
          // Obtener configuración del libro desde Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return;
          }

          // Obtener tanto el idioma preferido como la configuración del libro
          const [profileResult, bookResult] = await Promise.all([
            supabase.from('profiles').select('preferred_language').eq('id', user.id).single(),
            book.id ? supabase.from('books').select('source_language, display_language').eq('id', book.id).single() : null
          ]);

          // Priorizar localStorage sobre base de datos para idioma preferido
          const localStorageLanguage = localStorage.getItem('preferred_language');
          const userPreferredLanguage = localStorageLanguage || profileResult.data?.preferred_language || 'en';
          const bookSourceLang = bookResult?.data?.source_language || detectedLanguage;
          const bookDisplayLang = bookResult?.data?.display_language || userPreferredLanguage;


          // NUEVA LÓGICA: Usar el display_language específico del libro, fallback a preferencia del usuario
          console.log(`[AUTO-TRADUCIR] Idioma detectado del libro: ${detectedLanguage}`);
          console.log(`[AUTO-TRADUCIR] Idioma preferido del usuario: ${userPreferredLanguage}`);
          console.log(`[AUTO-TRADUCIR] Display language del libro: ${bookDisplayLang}`);
          
          setCurrentBookLanguage(bookDisplayLang);

          // Si el display language es igual al idioma fuente del libro, mostrar original
          if (detectedLanguage === bookDisplayLang) {
            console.log('[AUTO-TRADUCIR] Idiomas iguales, mostrando contenido original');
            // Resetear cualquier estado de traducción que pueda estar activo
            resetTranslationState();
            // No necesita traducción, mostrar contenido original
            setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
            
            // También establecer la página siguiente para navegación rápida
            const nextPageNum = book.currentPage + 1;
            if (nextPageNum <= book.totalPages) {
              const nextPageContent = book.pages[nextPageNum - 1]?.content;
              if (nextPageContent) {
                setProactivelyTranslatedNextPageContent(nextPageContent);
                setProactivelyTranslatedForPageNumber(nextPageNum);
              }
            }
            return;
          }

          // Verificar si el libro ya tiene traducciones cached
          const { data: bookData } = await supabase
            .from('books')
            .select('translation_cached')
            .eq('id', book.id)
            .single();

          // Verificar si ya hay traducciones para este idioma en el cache
          const translationCache = bookData?.translation_cached || {};
          const hasTranslationsForLanguage = translationCache[bookDisplayLang] && 
            Object.keys(translationCache[bookDisplayLang]).length > 0;

          if (hasTranslationsForLanguage) {
            console.log('[AUTO-TRADUCIR] Libro ya tiene traducciones cached, no se ejecutará traducción masiva');
            // Resetear cualquier estado de traducción que pueda estar activo
            resetTranslationState();
            // Mostrar contenido original y salir
            setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
            return;
          }
          
          console.log(`[AUTO-TRADUCIR] Iniciando configuración automática: ${detectedLanguage} → ${bookDisplayLang}`);

          // LÓGICA: Si los idiomas son iguales, mostrar original. Si no, traducir con progreso
          
          // TRADUCCIÓN MASIVA CON POPUP DE PROGRESO
          // Preparar páginas para traducir (primeras 10 páginas para empezar)
          const maxPagesToTranslate = Math.min(15, book.totalPages);
          const pagesData = [];
          
          for (let i = 0; i < maxPagesToTranslate; i++) {
            const pageContent = book.pages[i]?.content;
            if (pageContent && 
                !pageContent.startsWith('[Contenido de la página') && 
                !pageContent.startsWith('[Procesando OCR para página') &&
                pageContent.trim().length > 20) {
              pagesData.push({
                pageNumber: i + 1,
                content: pageContent
              });
            }
          }
          
          console.log(`[AUTO-TRADUCIR] Preparando traducción masiva de ${pagesData.length} páginas`);
          
          if (pagesData.length > 0) {
            try {
              // Mostrar contenido original inicialmente
              setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
              
              // Iniciar traducción masiva con popup de progreso
              console.log(`[AUTO-TRADUCIR] Iniciando traducción masiva con popup visible`);
              
              const translatedPages = await translateBookPages(
                pagesData,
                bookDisplayLang, // idioma destino (display language del libro)
                detectedLanguage, // idioma origen
                (progress, total) => {
                  console.log(`[AUTO-TRADUCIR] Progreso visible: ${progress}/${total} páginas`);
                }
              );
              
              console.log(`[AUTO-TRADUCIR] ✅ Traducción masiva completada: ${translatedPages.length} páginas procesadas`);
              
              // Actualizar página actual con traducción
              const currentPageTranslated = translatedPages.find(p => p.pageNumber === book.currentPage);
              if (currentPageTranslated) {
                setCurrentPageContentForDisplay(currentPageTranslated.translated);
                // Actualizar la referencia con la configuración correcta
                lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: bookDisplayLang };
                console.log(`[AUTO-TRADUCIR] ✅ Página actual ${book.currentPage} actualizada con contenido traducido`);
              }
              
              // Pre-cargar página siguiente
              const nextPageNum = book.currentPage + 1;
              const nextPageTranslated = translatedPages.find(p => p.pageNumber === nextPageNum);
              if (nextPageTranslated) {
                setProactivelyTranslatedNextPageContent(nextPageTranslated.translated);
                setProactivelyTranslatedForPageNumber(nextPageNum);
                console.log(`[AUTO-TRADUCIR] ✅ Página siguiente ${nextPageNum} pre-cargada`);
              }
              
              // TODO: Guardar traducciones en caché o base de datos para futuras navegaciones
              
            } catch (error) {
              console.error('[AUTO-TRADUCIR] ❌ Error en traducción masiva:', error);
              // Fallback: mostrar contenido original
              setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
            }
          } else {
            console.log('[AUTO-TRADUCIR] ⚠️ No hay páginas válidas para traducir');
            // Mostrar contenido original si no hay nada que traducir
            setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
          }
        } catch (error) {
          // Fallback: usar idioma preferido pero sin traducir
          const localStorageLanguage = localStorage.getItem('preferred_language');
          const preferredLang = localStorageLanguage || 'en';
          setCurrentBookLanguage(preferredLang);
          setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
        }
      };

      // Solo ejecutar auto-traducción si es realmente la primera vez que se abre el libro
      // Verificamos si ya existen traducciones como indicador de que ya se procesó
      const shouldCheckAutoTranslate = async () => {
        if (!book.id) return false;
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return false;
          
          // Obtener tanto el idioma preferido como la configuración específica del libro
          const localStorageLanguage = localStorage.getItem('preferred_language');
          const [profileData, bookData] = await Promise.all([
            supabase.from('profiles').select('preferred_language').eq('id', user.id).single(),
            supabase.from('books').select('display_language, translation_cached').eq('id', book.id).single()
          ]);
          
          const userPreferredLanguage = localStorageLanguage || profileData?.data?.preferred_language || 'en';
          const bookDisplayLanguage = bookData?.data?.display_language || userPreferredLanguage;

          const translationCache = bookData?.data?.translation_cached || {};
          const hasTranslationsForLanguage = translationCache[bookDisplayLanguage] && 
            Object.keys(translationCache[bookDisplayLanguage]).length > 0;
          
          // Si NO hay traducciones cached, entonces es la primera vez
          return !hasTranslationsForLanguage;
        } catch (error) {
          console.error('Error checking auto-translate conditions:', error);
          return false;
        }
      };
      
      // Deshabilitar checkAndAutoTranslate - los useEffect normales se encargan de la traducción
      console.log('⚠️ [AUTO-TRANSLATE] Función checkAndAutoTranslate deshabilitada - usando useEffect para traducción normal');
      
      // Solo establecer el idioma fuente detectado para que los useEffect funcionen
      setSourceBookLanguage(detectedLanguage);
      
      // Mostrar contenido original inicialmente, los useEffect se encargarán de traducir si es necesario
      setCurrentPageContentForDisplay(book.pages[book.currentPage - 1]?.content || '');
    }
  }, [book, isLoading, bookLanguageDetected, translatePageText]);
  
  // Preservar la página actual cuando se actualiza el libro por OCR
  const prevBookRef = useRef<Book | null>(null);
  
  // Efecto para cargar la configuración de idioma específica del libro cuando cambie el libro
  useEffect(() => {
    const loadBookLanguageConfig = async () => {
      if (!book?.id) return;
      
      console.log(`[LOAD-BOOK-CONFIG] Cargando configuración de idioma para libro: ${book.id}`);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const localStorageLanguage = localStorage.getItem('preferred_language');
        const [profileData, bookData] = await Promise.all([
          supabase.from('profiles').select('preferred_language').eq('id', user.id).single(),
          supabase.from('books').select('display_language').eq('id', book.id).single()
        ]);
        
        const userPreferredLanguage = localStorageLanguage || profileData?.data?.preferred_language || 'en';
        const bookDisplayLanguage = bookData?.data?.display_language || userPreferredLanguage;
        
        console.log(`[LOAD-BOOK-CONFIG] Display language del libro: ${bookDisplayLanguage}`);
        
        // Actualizar currentBookLanguage con la configuración específica del libro
        if (currentBookLanguage !== bookDisplayLanguage) {
          console.log(`[LOAD-BOOK-CONFIG] Actualizando idioma de ${currentBookLanguage} a ${bookDisplayLanguage}`);
          // Limpiar la referencia de página/idioma para forzar re-traducción
          console.log('[LOAD-BOOK-CONFIG] 🧹 Limpiando lastDisplayedPageAndLangRef por cambio de idioma');
          lastDisplayedPageAndLangRef.current = null;
          setCurrentBookLanguage(bookDisplayLanguage);

          // Forzar re-traducción inmediata si hay contenido y los idiomas son diferentes
          if (book && book.pages && book.currentPage && sourceBookLanguage &&
              bookDisplayLanguage !== sourceBookLanguage && bookLanguageDetected) {
            const originalContent = book.pages[book.currentPage - 1]?.content;
            if (originalContent && !originalContent.startsWith('[Contenido de la página') &&
                !originalContent.startsWith('[Procesando OCR para página')) {
              console.log(`[LOAD-BOOK-CONFIG] 🌐 Forzando traducción inmediata de ${sourceBookLanguage} a ${bookDisplayLanguage}`);
              setIsCurrentPageTranslating(true);
              setCurrentPageContentForDisplay(null);

              translatePageText(originalContent, bookDisplayLanguage, sourceBookLanguage)
                .then(translated => {
                  if (!book) return;
                  console.log(`[LOAD-BOOK-CONFIG] ✅ Traducción forzada completada`);
                  setCurrentPageContentForDisplay(translated || originalContent);
                  lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: bookDisplayLanguage };
                })
                .catch(error => {
                  if (!book) return;
                  console.log(`[LOAD-BOOK-CONFIG] ❌ Error en traducción forzada:`, error);
                  setCurrentPageContentForDisplay(originalContent);
                  lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: bookDisplayLanguage };
                })
                .finally(() => {
                  setIsCurrentPageTranslating(false);
                });
            }
          }
        }
      } catch (error) {
        console.error('[LOAD-BOOK-CONFIG] Error cargando configuración:', error);
      }
    };
    
    loadBookLanguageConfig();
  }, [book?.id, sourceBookLanguage, bookLanguageDetected, translatePageText]); // Incluir dependencias necesarias
  
  // Limpiar referencia cuando cambie el libro para forzar re-evaluación
  useEffect(() => {
    if (book?.id) {
      console.log(`[CLEAN-REF] 🧹 Limpiando referencia para libro: ${book.id}`);
      lastDisplayedPageAndLangRef.current = null;
    }
  }, [book?.id]);
  
  // Removed hasAutoTranslatedRef - now using database check instead
  
  useEffect(() => {
    // No interferir durante navegación manual
    if (isManuallyNavigating) {
      prevBookRef.current = book;
      return;
    }
    
    // Si el libro se está actualizando durante el OCR, preservar la página actual
    if (book && prevBookRef.current && 
        book.id === prevBookRef.current.id && 
        book.ocrInProgress && 
        prevBookRef.current.currentPage !== book.currentPage) {
      
      // Solo actualizar si la página actual ha cambiado a 1 (reinicio no deseado)
      if (book.currentPage === 1 && prevBookRef.current.currentPage > 1) {
        // Restaurar la página actual previa
        setBook({
          ...book,
          currentPage: prevBookRef.current.currentPage
        });
      }
    }
    
    // Guardar referencia del libro actual para la próxima actualización
    prevBookRef.current = book;
  }, [book, setBook, isManuallyNavigating]);
  
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
  const [showAudioDebug, setShowAudioDebug] = useState(false);
  
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

  // Efecto 1: Manejar la página actual (N) - MEJORADO para evitar traducciones innecesarias
  useEffect(() => {
    console.log(`[EFECTO-PÁGINA] 🔄 Ejecutándose - Página: ${book?.currentPage}, Idioma: ${currentBookLanguage}, Fuente: ${sourceBookLanguage}, Detectado: ${bookLanguageDetected}`);

    if (!book || !book.pages || book.pages.length === 0 || !book.currentPage) {
      console.log('[EFECTO-PÁGINA] ❌ Saliendo - libro inválido');
      setCurrentPageContentForDisplay(null);
      setIsCurrentPageTranslating(false);
      return;
    }

    const pageIndex = book.currentPage - 1;
    const originalContent = book.pages[pageIndex]?.content;

    // GUARDIA: Solo salir si el contenido YA ESTÁ TRADUCIDO al idioma correcto
    const isContentTranslated = currentPageContentForDisplay && 
                               currentPageContentForDisplay !== originalContent &&
                               currentBookLanguage !== sourceBookLanguage;
                               
    if (
      lastDisplayedPageAndLangRef.current?.page === book.currentPage && 
      lastDisplayedPageAndLangRef.current?.lang === currentBookLanguage && 
      isContentTranslated
    ) {
      console.log(`[EFECTO-PÁGINA] ✅ Ya hay contenido traducido para página ${book.currentPage} en ${currentBookLanguage}`);
      return;
    }
    
    // Si hay contenido pero es original y necesita traducirse, continuar
    if (currentPageContentForDisplay === originalContent && currentBookLanguage !== sourceBookLanguage) {
      console.log(`[EFECTO-PÁGINA] 🔄 Contenido es original, necesita traducirse de ${sourceBookLanguage} a ${currentBookLanguage}`);
    }

    if (!originalContent || originalContent.startsWith('[Contenido de la página') || originalContent.startsWith('[Procesando OCR para página')) {
      setCurrentPageContentForDisplay(originalContent || '');
      setIsCurrentPageTranslating(false);
      return;
    }

    // Intentar usar contenido pre-traducido para la página N
    if (proactivelyTranslatedNextPageContent && proactivelyTranslatedForPageNumber === book.currentPage) {
      console.log(`[EFECTO-PÁGINA] ✅ Usando contenido pre-traducido para página ${book.currentPage}`);
      setCurrentPageContentForDisplay(proactivelyTranslatedNextPageContent);
      setIsCurrentPageTranslating(false);
      lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
      return;
    }

    // Si no hemos detectado el idioma aún, mostrar contenido original mientras tanto
    if (!bookLanguageDetected) {
      setCurrentPageContentForDisplay(originalContent);
      setIsCurrentPageTranslating(false);
      lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
      return;
    }

    // LÓGICA PRINCIPAL: Si el idioma seleccionado coincide con el idioma del libro, mostrar original
    if (currentBookLanguage === sourceBookLanguage) {
      console.log(`[EFECTO-PÁGINA] ✅ Mostrando original - idiomas iguales (${currentBookLanguage})`);
      setCurrentPageContentForDisplay(originalContent);
      setIsCurrentPageTranslating(false);
      lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
    } else {
      // Necesita traducción
      console.log(`[EFECTO-PÁGINA] 🌐 Traduciendo de ${sourceBookLanguage} a ${currentBookLanguage}`);
      setIsCurrentPageTranslating(true);
      setCurrentPageContentForDisplay(null);
      
      translatePageText(originalContent, currentBookLanguage, sourceBookLanguage)
        .then(translated => {
          if (!book) return;
          console.log(`[EFECTO-PÁGINA] ✅ Traducción completada para página ${book.currentPage}`);
          setCurrentPageContentForDisplay(translated || originalContent);
          lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
        })
        .catch(error => {
          if (!book) return;
          console.log(`[EFECTO-PÁGINA] ❌ Error en traducción:`, error);
          setCurrentPageContentForDisplay(originalContent);
          lastDisplayedPageAndLangRef.current = { page: book.currentPage, lang: currentBookLanguage };
        })
        .finally(() => {
          setIsCurrentPageTranslating(false);
        });
    }
  }, [book?.currentPage, currentBookLanguage, sourceBookLanguage, book?.pages, proactivelyTranslatedNextPageContent, proactivelyTranslatedForPageNumber, translatePageText, bookLanguageDetected]);

  // Efecto 2: Traducir proactivamente la página N+1 - MEJORADO
  useEffect(() => {
    console.log(`[EFECTO-N+1] 🔄 Ejecutándose - Página actual: ${book?.currentPage}, Total: ${book?.totalPages}, Idiomas: ${sourceBookLanguage} → ${currentBookLanguage}`);
    
    if (!book || !book.pages || book.pages.length === 0 || isCurrentPageTranslating || isProactivelyTranslatingNextPage) {
      console.log('[EFECTO-N+1] ❌ Saliendo - condiciones no cumplidas');
      return;
    }

    const currentPageNum = book.currentPage;
    const nextPageNum = currentPageNum + 1;

    if (nextPageNum > book.totalPages) {
      setProactivelyTranslatedNextPageContent(null);
      setProactivelyTranslatedForPageNumber(null);
      return;
    }

    if (proactivelyTranslatedForPageNumber === nextPageNum && proactivelyTranslatedNextPageContent) {
      return;
    }

    // Si el idioma de visualización es el original o no hemos detectado aún, no necesitamos pre-traducir
    if (!bookLanguageDetected || currentBookLanguage === sourceBookLanguage) {
      console.log('[EFECTO-N+1] ⏩ Saliendo - mismos idiomas o no detectado');
      setProactivelyTranslatedNextPageContent(null);
      setProactivelyTranslatedForPageNumber(null);
      return;
    }
    
    const nextPageOriginalContent = book.pages[nextPageNum - 1]?.content;

    if (!nextPageOriginalContent || nextPageOriginalContent.startsWith('[Contenido de la página') || nextPageOriginalContent.startsWith('[Procesando OCR para página')) {
      return;
    }

    console.log(`[EFECTO-N+1] 🌐 Traduciendo página ${nextPageNum} de ${sourceBookLanguage} a ${currentBookLanguage}`);
    setIsProactivelyTranslatingNextPage(true);
    translatePageText(nextPageOriginalContent, currentBookLanguage, sourceBookLanguage)
      .then(translated => {
        console.log(`[EFECTO-N+1] ✅ Página ${nextPageNum} traducida proactivamente`);
        setProactivelyTranslatedNextPageContent(translated);
        setProactivelyTranslatedForPageNumber(nextPageNum);
      })
      .catch(error => {
        console.log('[EFECTO-N+1] ❌ Error traduciendo próxima página:', error);
        setProactivelyTranslatedNextPageContent(null);
        setProactivelyTranslatedForPageNumber(null);
      })
      .finally(() => {
        setIsProactivelyTranslatingNextPage(false);
      });

  }, [book?.currentPage, currentBookLanguage, sourceBookLanguage, book?.totalPages, book?.pages, translatePageText, bookLanguageDetected]);
  
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
    if ((bookLanguageDetected && currentBookLanguage === sourceBookLanguage) || !book) {
      // Limpiar traducciones proactivas
      setProactivelyTranslatedNextPageContent(null);
      setProactivelyTranslatedForPageNumber(null);
    }
  }, [currentBookLanguage, sourceBookLanguage, book, bookLanguageDetected]);

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
      }
    };
  }, [book]);

  // NUEVO: Actualizar la base de datos cada vez que cambie la página actual
  useEffect(() => {
    // Solo actualizar si el libro está cargado y tiene ID
    if (book && book.id && book.currentPage > 0) {
      // Evitar actualizaciones durante la carga inicial
      if (!isLoading) {
        // Guardando progreso en DB
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
  }, [isSelectingTextRange, startWordIndex, endWordIndex, allWords, translateTextSelection, currentBookLanguage]);

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

  // Reproducir audio de la traducción usando Supabase TTS
  const playTranslationAudio = async (language: 'en' | 'es' | string, textToPlay?: string) => {
    const textForAudio = textToPlay || (language === currentBookLanguage ? selectedText : translatedText);
    if (!textForAudio) return;

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      setIsPlayingAudio(language);
      const langCodeForTTS = language === 'es' ? 'es' : currentBookLanguage;
      const blob = await AudiobookService.generateSpeech(textForAudio, langCodeForTTS, 'nova');
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
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
      setIsManuallyNavigating(true);
      goToPage(book.currentPage - 1);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      // Reset navigation flag after a short delay
      setTimeout(() => setIsManuallyNavigating(false), 500);
    }
  };

  const handleNextPage = () => {
    if (book && book.currentPage < book.totalPages) {
      setIsManuallyNavigating(true);
      goToPage(book.currentPage + 1);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      // Reset navigation flag after a short delay
      setTimeout(() => setIsManuallyNavigating(false), 500);
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



  // Antes del return principal del componente Reader
  // Agregar un indicador del progreso de OCR en el título
  useEffect(() => {
    // Actualizar el título del documento para mostrar el progreso del OCR
    if (book?.ocrInProgress && book.ocrTotal && book.ocrTotal > 0) {
      const ocrProgress = book.ocrProgress || 0;
      const ocrTotal = book.ocrTotal;
      const percent = Math.round((ocrProgress / ocrTotal) * 100);
      document.title = 'Lexingo AI';
    } else if (book) {
      document.title = 'Lexingo AI';
    } else {
      document.title = 'Lexingo AI';
    }
    
    return () => {
      document.title = 'Lexingo AI';
    };
  }, [book]);

  // State for AI Chat Modal
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  
  // Estado para mostrar panel de configuración del lector
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  

  // Estados para el popover de selección de idioma
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  
  // Estados para el popover de menú de usuario
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const languageOptions = useMemo(() => [
    { code: "es", name: getLanguageName("es") }, // Agregado español al inicio
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

  // Configuración de floating UI para menú de usuario
  const { refs: userMenuRefs, floatingStyles: userMenuFloatingStyles, context: userMenuContext } = useFloating({
    open: isUserMenuOpen,
    onOpenChange: setIsUserMenuOpen,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
  });

  const userMenuClick = useClick(userMenuContext);
  const userMenuDismiss = useDismiss(userMenuContext);
  const userMenuRole = useRole(userMenuContext, { role: 'menu' });

  const { getReferenceProps: getUserMenuReferenceProps, getFloatingProps: getUserMenuFloatingProps } = useInteractions([
    userMenuClick,
    userMenuDismiss,
    userMenuRole,
  ]);

  // ELIMINADO: Ya no forzamos inglés como predeterminado
  // El idioma se inicializa automáticamente desde localStorage en el useState

  // Cargar idioma preferido del usuario al montar el componente
  useEffect(() => {
    const loadPreferredLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', user.id)
            .single();
            
          if (!error && data && data.preferred_language) {
            // TEMPORAL: Guardar idioma preferido sin cambiar el display hasta que se procese
            // No cambiar currentBookLanguage aquí - se maneja en checkAndAutoTranslate
          }
        }
      } catch (error) {
        console.error('Error al cargar la preferencia de idioma:', error);
      }
    };
    
    // Solo cargar si no hay libro o si el libro no ha sido procesado aún
    if (!book || !bookLanguageDetected) {
      loadPreferredLanguage();
    }
  }, [book, bookLanguageDetected]);
  
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

  // Verificar páginas vacías solo una vez por libro
  useEffect(() => {
    if (book && !isLoading && !hasCheckedPages) {
      // Marcar como verificado inmediatamente para evitar bucle
      setHasCheckedPages(true);
      
      // Verificar si el libro tiene páginas válidas
      if (!book.pages || book.pages.length === 0) {
        return;
      }

      const currentPageIndex = book.currentPage - 1;
      const actualTotalPages = book.pages.length;
      
      if (currentPageIndex < 0 || currentPageIndex >= actualTotalPages) {
        // Buscar primera página válida
        const firstValidPage = book.pages.findIndex(page => page?.content && page.content.trim().length > 0);
        if (firstValidPage >= 0) {
          goToPage(firstValidPage + 1);
        }
        return;
      }
      
      const currentPageContent = book.pages[currentPageIndex]?.content;
      if (!currentPageContent || currentPageContent.trim().length === 0) {
        // Buscar página válida hacia adelante
        let nextValidPage = currentPageIndex + 1;
        while (nextValidPage < actualTotalPages) {
          const nextPageContent = book.pages[nextValidPage]?.content;
          if (nextPageContent && nextPageContent.trim().length > 0) {
            goToPage(nextValidPage + 1);
            return;
          }
          nextValidPage++;
        }
        
        // Buscar hacia atrás
        let prevValidPage = currentPageIndex - 1;
        while (prevValidPage >= 0) {
          const prevPageContent = book.pages[prevValidPage]?.content;
          if (prevPageContent && prevPageContent.trim().length > 0) {
            goToPage(prevValidPage + 1);
            return;
          }
          prevValidPage--;
        }
      }
    }
  }, [book?.id, isLoading, hasCheckedPages]); // Usar book.id en lugar de book completo

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-4">
            No hay libro seleccionado
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Volver atrás
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
      className={`h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col overflow-hidden reader-main-container ${isFullScreen ? 'reader-fullscreen' : ''}`}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Header con logo y perfil solo cuando NO está en pantalla completa */}
      {!isFullScreen && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo - centrado */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
              <img 
                src={theme === 'dark' ? '/img/lexingo_white.png' : '/img/lexingo_black.png'} 
                alt="Lexingo" 
                className="h-11 hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => navigate('/')}
              />
            </div>

            {/* Perfil de usuario - siempre a la derecha */}
            <div className="ml-auto flex items-center relative z-[999999]">
              <button 
                ref={userMenuRefs.setReference}
                {...getUserMenuReferenceProps()}
                className="focus:outline-none hover:opacity-80 transition-opacity"
              >
                {avatarUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                    <img
                      src={avatarUrl}
                      alt="Usuario"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white font-medium">
                    {userInitials}
                  </div>
                )}
              </button>
              
            </div>
          </div>
        </div>
      )}
      
      {/* Línea divisoria morada con efecto brillante - debajo del header principal */}
      {!isFullScreen && (
        <div className="fixed top-16 left-0 right-0 z-[59] header-divider h-0.5 w-full"></div>
      )}
      
      {/* Barra de navegación de lectura - FIJO */}
      <div className={`reader-navigation-bar fixed ${
        !isFullScreen ? 'top-[4.125rem]' : 'top-0'
      } left-0 right-0 z-[50] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-300 dark:border-gray-600 shadow-md`}>
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
              onClick={() => navigate(-1)}
              className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
              aria-label="Volver atrás"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {/* Separador Añadido */}
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 opacity-50 flex-shrink-0"></div>
          {/* Imagen circular del libro */}
          <div className="flex-shrink-0">
            {book.coverUrl ? (
              <img 
                src={book.coverUrl} 
                alt={`Portada de ${book.title}`}
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                onError={(e) => {
                  // Fallback si la imagen no carga
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                <span className="text-white text-xs font-bold">
                  {book.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Información central: Título del Libro */}
          <div className="flex-grow text-center overflow-hidden px-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={book.title}>
              {book.title}
            </span>
          </div>

          {/* Separador */}
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
                      onClick={async () => {
                        console.log(`[CAMBIO-IDIOMA] Usuario cambió idioma a: ${lang.code}`);
                        console.log(`[CAMBIO-IDIOMA] Idioma fuente del libro: ${sourceBookLanguage}`);
                        
                        // Cerrar el popover inmediatamente
                        setIsLanguagePopoverOpen(false);
                        
                        // Guardar la nueva preferencia
                        await savePreferredLanguage(lang.code);
                        
                        // IMPORTANTE: Actualizar display_language en la base de datos
                        if (book?.id) {
                          try {
                            const { error } = await supabase
                              .from('books')
                              .update({ display_language: lang.code })
                              .eq('id', book.id);
                              
                            if (error) {
                              console.error('[CAMBIO-IDIOMA] Error al actualizar display_language:', error);
                            } else {
                              console.log(`[CAMBIO-IDIOMA] ✅ display_language actualizado a ${lang.code} en BD`);
                            }
                          } catch (error) {
                            console.error('[CAMBIO-IDIOMA] Error en actualización BD:', error);
                          }
                        }
                        
                        // Limpiar cache y referencia para forzar nueva traducción
                        console.log('[CAMBIO-IDIOMA] 🧹 Limpiando cache por cambio de idioma');
                        setCurrentPageContentForDisplay(null);
                        setProactivelyTranslatedNextPageContent(null);
                        setProactivelyTranslatedForPageNumber(null);
                        lastDisplayedPageAndLangRef.current = { page: 0, lang: '' };
                        
                        // Cambiar idioma (esto activará los efectos de traducción)
                        console.log(`[CAMBIO-IDIOMA] Actualizando currentBookLanguage de ${currentBookLanguage} a ${lang.code}`);
                        setCurrentBookLanguage(lang.code);
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
          
          {/* Control de pantalla completa */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={toggleFullScreen}
              className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={isFullScreen ? 'Salir de modo inmersivo' : 'Modo inmersivo'}
            >
              {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
        {/* Línea divisoria gris simple */}
        <div className="h-0.5 simple-divider w-full"></div>
      </div>

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

      {/* Contenido principal con scroll independiente */}
      <div 
        className="flex-1 overflow-y-auto reader-content-area"
        ref={contentRef}
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(65px + env(safe-area-inset-bottom, 0px))' // Espacio para la barra de controles más alta
        }}
      >
        <div 
          className={`max-w-3xl mx-auto text-justify px-6 reader-content-inner ${
            !isFullScreen 
              ? 'pt-32 pb-24 md:pt-36 md:pb-36' // Padding normal para header + navegación
              : 'pt-24 pb-20' // Padding en fullscreen
          }`}
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
            <div className="relative">
              {/* Renderizado con seguimiento karaoke durante reproducción */}
              {audiobookState.isPlaying && audiobookState.currentText === currentPageContentForDisplay ? (
                <div className="relative z-10">
                  <KaraokeText
                    text={currentPageContentForDisplay}
                    currentWordIndex={audiobookState.currentWordIndex}
                    isPlaying={audiobookState.isPlaying}
                    className="leading-relaxed"
                    onWordClick={(wordIndex) => {
                      audiobookControls.jumpToWord(wordIndex);
                    }}
                  />
                </div>
              ) : null}
              
              {/* Renderizado normal para selección de palabras */}
              <div className={`${audiobookState.isPlaying && audiobookState.currentText === currentPageContentForDisplay ? 'invisible absolute inset-0' : ''}`}>
                {allWords.map((word, idx) => (
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
                ))}
              </div>
            </div>
          ) : (
            // Si no hay contenido para mostrar, verificar el estado de carga o si la página está vacía
            isLoading ? (
              <BookLoadingIndicator />
            ) : book && book.pages && book.pages.length > 0 && book.currentPage <= book.pages.length ? (
              // Verificar si la página actual está realmente vacía
              (() => {
                const currentPageContent = book.pages[book.currentPage - 1]?.content || '';
                const isEmpty = !currentPageContent || currentPageContent.trim().length === 0;
                
                // Verificar si página está vacía
                
                if (isEmpty) {
                  // Si la página está vacía, mover automáticamente a la siguiente con contenido
                  
                  // Usar setTimeout para que no bloquee el renderizado
                  setTimeout(() => {
                    let nextPageToTry = book.currentPage + 1;
                    while (nextPageToTry <= book.totalPages) {
                      const nextContent = book.pages[nextPageToTry - 1]?.content || '';
                      if (nextContent && nextContent.trim().length > 0) {
                        // Navegar a página con contenido
                        goToPage(nextPageToTry);
                        break;
                      }
                      nextPageToTry++;
                    }
                    
                    // Si no se encontró ninguna página con contenido
                    if (nextPageToTry > book.totalPages) {
                      // No hay páginas válidas
                    }
                  }, 0);
                  
                  return <BookLoadingIndicator />;
                } else {
                  return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No se pudo cargar el contenido en esta página.</div>;
                }
              })()
            ) : book && book.pages && book.pages.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="mb-4">
                  <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Libro sin contenido</h3>
                  <p className="text-sm">Este libro no tiene contenido válido. Es posible que haya ocurrido un error durante la carga.</p>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver atrás
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">No hay contenido disponible en esta página.</div>
            )
          )}
        </div>
      </div>

      {/* Barra de control inferior fija - completamente abajo */}
      <div 
        className="reader-controls fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 z-[100] transition-opacity duration-300 shadow-md"
        style={{ 
          paddingTop: '8px',
          paddingLeft: '4px', 
          paddingRight: '4px',
          paddingBottom: '8px',
          marginBottom: '0px',
          bottom: '0px'
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-2">
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
            
            {/* Botón de Lexingo AI - Chat general */}
            <button
              onClick={() => {
                // NO pasar contexto para chat general
                setAiChatContextText('');
                setShowAIChatModal(true); 
              }}
              className="p-0.5 rounded-full border-2 border-teal-400 hover:opacity-80 flex items-center focus:outline-none"
              title="Chat general con Lexingo AI"
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

          {/* Sección de configuración */}
          <div className="flex items-center space-x-2">
            {/* Botón de configuración */}
            <button
              onClick={() => setShowReaderSettings(!showReaderSettings)}
              className="p-1.5 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Configuración del lector"
            >
              <Settings size={16} />
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
            {/* Texto original con botón de audio al lado */}
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-2">
                  <KaraokeText
                    text={selectedText}
                    currentWordIndex={audiobookState.currentText === selectedText ? audiobookState.currentWordIndex : -1}
                    isPlaying={audiobookState.isPlaying && audiobookState.currentText === selectedText}
                    className="font-medium text-gray-200 text-sm"
                    onWordClick={(wordIndex) => {
                      if (audiobookState.currentText === selectedText) {
                        audiobookControls.jumpToWord(wordIndex);
                      }
                    }}
                  />
                </div>
                <button
                  onClick={isPlayingAudio === currentBookLanguage ? stopAudio : () => playTranslationAudio(currentBookLanguage, selectedText)}
                  className="w-5 h-5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
                  disabled={isPlayingAudio === 'es' || !['en', 'es', 'it', 'fr', 'ja', 'de', 'pt'].includes(currentBookLanguage)}
                  title={`Escuchar en ${getLanguageName(currentBookLanguage)}`}
                >
                  {isPlayingAudio === currentBookLanguage ? (
                    <VolumeX size={10} className="text-red-400" />
                  ) : (
                    <Volume2 size={10} className="text-blue-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Separador */}
            <div className="border-t border-gray-700 my-3"></div>
            
            {/* Texto traducido con botón de audio al lado */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-300 font-medium">Traducción</div>
                {isTranslating && (
                  <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
                )}
              </div>
              
              <div className="flex items-start justify-between mb-3">
                <p className="font-medium text-blue-300 flex-1 mr-2">
                  {translatedText}
                </p>
                <button
                  onClick={isPlayingAudio === 'es' ? stopAudio : () => playTranslationAudio('es', translatedText)}
                  className="w-5 h-5 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
                  disabled={isPlayingAudio === currentBookLanguage}
                  title="Escuchar en Español"
                >
                  {isPlayingAudio === 'es' ? (
                    <VolumeX size={10} className="text-red-400" />
                  ) : (
                    <Volume2 size={10} className="text-green-400" />
                  )}
                </button>
              </div>
              
              {/* Botones de acción: IA y Audiolibro */}
              <div className="flex justify-center items-center gap-3 mt-2">
                {/* Botón de consulta IA */}
                <button
                  onClick={() => {
                    if (selectedText) {
                      setAiChatContextText(selectedText);
                      setShowAIChatModal(true);
                    }
                  }}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 rounded-full text-xs text-purple-300 hover:text-purple-200 transition-all duration-200 hover:scale-105"
                  title="Consultar con IA sobre este texto"
                >
                  <Sparkles size={10} />
                  <span>Consultar IA</span>
                </button>

                {/* Controles de audiolibro */}
                <div className="flex items-center space-x-2 px-2.5 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-full">
                  <Volume2 size={10} className="text-orange-400" />
                  <AudiobookControls
                    state={audiobookState}
                    controls={audiobookControls}
                    currentText={selectedText || ''}
                    language={currentBookLanguage}
                    className="scale-90"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showAIChatModal && (
        <AIChatModal 
          isOpen={showAIChatModal}
          onClose={() => {
            setShowAIChatModal(false);
            setAiChatContextText(''); // Limpiar contexto al cerrar
          }}
          initialText={aiChatContextText || ''} // Permitir chat sin contexto
        />
      )}

      {/* Panel de configuración del lector */}
      {showReaderSettings && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[20000] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReaderSettings(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Configuración del Lector
              </h3>
              <button 
                onClick={() => setShowReaderSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Tamaño de fuente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tamaño de fuente
                </label>
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <button
                    onClick={decreaseFontSize}
                    disabled={fontSize <= 12}
                    className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Reducir tamaño de fuente"
                  >
                    <Minus size={16} />
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300 min-w-[3ch] text-center">
                      {fontSize}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">px</span>
                  </div>
                  
                  <button
                    onClick={increaseFontSize}
                    disabled={fontSize >= 24}
                    className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Aumentar tamaño de fuente"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tema
                </label>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {theme === 'light' ? 'Modo claro' : 'Modo oscuro'}
                  </span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Popover del menú de usuario - Posicionado globalmente */}
      {isUserMenuOpen && (
        <FloatingFocusManager context={userMenuContext} modal={false}>
          <div
            ref={userMenuRefs.setFloating}
            style={{...userMenuFloatingStyles, zIndex: 999999}}
            {...getUserMenuFloatingProps()}
            className="fixed z-[999999] bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden py-1 w-48 focus:outline-none"
          >
            {/* Libros */}
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                navigate('/');
              }}
              className="w-full text-left px-4 py-3 text-sm flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Home size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-gray-700 dark:text-gray-300">Libros</span>
            </button>

            {/* Mi Cuenta */}
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                navigate('/profile');
              }}
              className="w-full text-left px-4 py-3 text-sm flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-400 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{userInitials.charAt(0)}</span>
              </div>
              <span className="text-gray-700 dark:text-gray-300">Mi Cuenta</span>
            </button>

            {/* Mi Suscripción */}
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                navigate('/profile');
              }}
              className="w-full text-left px-4 py-3 text-sm flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Sparkles size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-gray-700 dark:text-gray-300">Mi Suscripción</span>
            </button>

            <div className="h-px bg-gray-200 dark:bg-gray-600 my-1"></div>

            {/* Cerrar Sesión */}
            <button
              onClick={async () => {
                setIsUserMenuOpen(false);
                try {
                  await supabase.auth.signOut();
                  navigate('/');
                } catch (error) {
                  console.error('Error cerrando sesión:', error);
                }
              }}
              className="w-full text-left px-4 py-3 text-sm flex items-center space-x-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <ArrowLeft size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400">Cerrar Sesión</span>
            </button>
          </div>
        </FloatingFocusManager>
      )}

      {/* Componente de debug de audio */}
      <AudiobookDebugInfo
        isVisible={showAudioDebug && audiobookState.isPlaying}
        currentWordIndex={audiobookState.currentWordIndex}
        totalWords={audiobookState.currentText ? audiobookState.currentText.split(/\s+/).length : 0}
        currentTime={audiobookState.currentTime}
        duration={audiobookState.duration}
        usePreciseSync={audiobookState.usePreciseSync}
        language={currentBookLanguage}
      />

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
        
        /* 💜 SCROLLBAR MORADA - Lexingo Reader */
        .reader-content-area::-webkit-scrollbar {
          width: 10px;
          background: transparent;
        }
        
        .reader-content-area::-webkit-scrollbar-track {
          background: rgba(139, 69, 193, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(139, 69, 193, 0.2);
        }
        
        .reader-content-area::-webkit-scrollbar-thumb {
          background: #8b5cf6;
          border-radius: 8px;
          border: 1px solid #7c3aed;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
        }
        
        .reader-content-area::-webkit-scrollbar-thumb:hover {
          background: #a855f7;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
          transform: scaleX(1.1);
        }
        
        .reader-content-area::-webkit-scrollbar-thumb:active {
          background: #9333ea;
          box-shadow: 0 0 20px rgba(147, 51, 234, 0.7);
        }
        
        /* 🌙 MODO OSCURO - Scrollbar morada */
        .dark .reader-content-area::-webkit-scrollbar-track {
          background: rgba(139, 69, 193, 0.15);
          border: 1px solid rgba(139, 69, 193, 0.3);
        }
        
        .dark .reader-content-area::-webkit-scrollbar-thumb {
          background: #7c3aed;
          border: 1px solid #6b21a8;
          box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
        }
        
        .dark .reader-content-area::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
          box-shadow: 0 0 18px rgba(139, 92, 246, 0.6);
          transform: scaleX(1.1);
        }
        
        .dark .reader-content-area::-webkit-scrollbar-thumb:active {
          background: #a855f7;
          box-shadow: 0 0 25px rgba(168, 85, 247, 0.8);
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
        
        /* Barra del Reader debe estar por debajo del header principal pero por encima del contenido */
        .reader-navigation-bar {
          z-index: 50 !important;
        }
        
        /* Forzar que no haya espacios en el viewport */
        body, html {
          padding-bottom: 0 !important;
          margin-bottom: 0 !important;
        }
        
        /* Asegurar que la barra de controles esté por encima de la navegación móvil pero por debajo del header */
        .reader-controls {
          position: fixed !important;
          bottom: 0 !important;
          width: 100% !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 100 !important;
          padding-bottom: 0 !important;
          margin-bottom: 0 !important;
          height: auto !important;
          min-height: auto !important;
        }
        /* Ajustes para pantallas más grandes */
        @media screen and (min-width: 640px) {
          .reader-controls {
            bottom: 0 !important;
            padding-bottom: 0 !important;
          }
        }
        /* Para pantallas pequeñas */
        @media screen and (max-height: 500px) {
          .reader-controls {
            padding-bottom: 0;
          }
        }
        
        /* MEJORAS DE SCROLLING PARA MÓVILES */
        @media screen and (max-width: 768px) {
          /* Área de contenido optimizada para móvil */
          .reader-content-area {
            -webkit-overflow-scrolling: touch;
            overflow-scrolling: touch;
            scroll-behavior: smooth;
            /* Prevent scroll chaining */
            overscroll-behavior: contain;
            /* Altura específica para móvil */
            height: calc(100vh - 0px);
          }
          
          /* Barra de navegación en móvil */
          .reader-navigation-bar {
            position: fixed !important;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            /* Asegurar que esté por encima */
            z-index: 100 !important;
          }
          
          /* Evitar que el contenido se mueva con el header */
          .reader-main-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
          }
          
          /* Padding mejorado para móviles */
          .reader-content-inner {
            padding-top: 8.5rem !important; /* Espacio arriba para header y navegación */
            padding-bottom: 4.5rem !important; /* Espacio abajo para la barra de controles más alta */
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }
        
        /* Para dispositivos muy pequeños */
        @media screen and (max-width: 480px) and (max-height: 800px) {
          .reader-content-inner {
            padding-top: 7.5rem !important; /* También más padding en pantallas pequeñas */
            padding-bottom: 3rem !important; /* Reducido para pantallas pequeñas */
          }
        }
        
        /* Scroll suave en todos los dispositivos */
        .reader-content-area {
          scroll-behavior: smooth;
          scrollbar-width: thin;
        }
        
        /* Desktop: ajustes para desktop */
        @media screen and (min-width: 768px) {
          .reader-content-inner {
            padding-top: 8.5rem !important;
            padding-bottom: 4rem !important;
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

      {/* OCR Progress Popup específicamente para Reader */}
      {isProcessingBackground && (
        <OCRProgressPopup
          progress={ocrProgress}
          total={ocrTotal}
          onCancel={cancelOCR}
          isCancelling={isCancelling}
        />
      )}

      {/* Translation Progress Popup - Moved to App.tsx as global popup */}
    </div>
  );
};

const PageLoadingIndicator: React.FC<{ languageName: string }> = ({ languageName }) => (
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] text-center p-4">
    <MinimalLoadingIndicator 
      message="Traduciendo"
      size="large"
      showMessage={true}
    />
  </div>
);

// Componente de carga para cuando el libro está vacío o procesándose
const BookLoadingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] text-center p-4">
      <MinimalLoadingIndicator 
        message="Procesando"
        size="large"
        showMessage={true}
      />
    </div>
  );
};

const ExportedReader = Reader;
export default ExportedReader;
