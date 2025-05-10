import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookContext } from '../context/BookContext';
import { useThemeContext } from '../context/ThemeContext';
import { useTranslator } from '../hooks/useTranslator';
import { Word } from '../types';
import WordTooltip from './WordTooltip';
import { XCircle, Maximize, Sun, Moon, Plus, Minus, Home, Bookmark, BookmarkCheck, ArrowLeft, ArrowRight, Languages, TextSelect, X, Type, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReaderProps {
  onFullScreenMode?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paragraphTranslationRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    setShowApiKeyWarning(!apiKey);
  }, []);

  useEffect(() => {
    const checkIOS = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      setIsIOS(isIOS);
    };
    
    checkIOS();
  }, []);

  useEffect(() => {
    if (!isIOS) return;
    
    const adjustIOSHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    adjustIOSHeight();
    window.addEventListener('resize', adjustIOSHeight);
    window.addEventListener('orientationchange', adjustIOSHeight);
    
    return () => {
      window.removeEventListener('resize', adjustIOSHeight);
      window.removeEventListener('orientationchange', adjustIOSHeight);
    };
  }, [isIOS]);

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

  useEffect(() => {
    closeParaTranslation();
    resetParagraphSelection();
  }, [book?.currentPage]);

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

  useEffect(() => {
    const loadBookmarkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !book) return;

        const { data, error } = await supabase
          .from('books')
          .select('bookmarked, bookmark_page')
          .eq('user_id', user.id)
          .eq('title', book.title)
          .single();

        if (error) throw error;
        
        if (data) {
          setIsBookmarked(data.bookmarked);
          if (data.bookmarked && book.currentPage === 1) {
            goToPage(data.bookmark_page);
          }
        }
      } catch (error) {
        console.error('Error loading bookmark status:', error);
      }
    };

    loadBookmarkStatus();
  }, [book]);

  const saveBookmark = async () => {
    try {
      setBookmarkSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !book) return;

      const { error } = await supabase
        .from('books')
        .update({
          bookmarked: !isBookmarked,
          bookmark_page: book.currentPage,
          bookmark_position: contentRef.current?.scrollTop || 0,
          bookmark_updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('title', book.title);

      if (error) throw error;

      setIsBookmarked(!isBookmarked);
      setSaveConfirmation(true);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        setSaveConfirmation(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving bookmark:', error);
    } finally {
      setBookmarkSaving(false);
    }
  };

  const updateCurrentPage = async (pageNumber: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !book) return;

      await supabase
        .from('books')
        .update({
          current_page: pageNumber,
          last_read: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('title', book.title);
    } catch (error) {
      console.error('Error updating current page:', error);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    goToPage(pageNumber);
    updateCurrentPage(pageNumber);
  };

  const BottomControlBar = () => (
    <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50/95 to-indigo-50/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-sm border-t border-gray-300 dark:border-gray-700 ${isIOS ? 'ios-safe-bottom' : ''} z-30 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_5px_rgba(0,0,0,0.2)]`} style={{
      paddingBottom: isIOS ? 'env(safe-area-inset-bottom, 16px)' : undefined,
      height: isIOS ? '80px' : isMobileView ? '70px' : '60px'
    }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between px-3 h-full">
        <div className="flex items-center justify-center space-x-2 flex-1">
          <button
            onClick={saveBookmark}
            disabled={bookmarkSaving}
            className={`p-2 rounded-md ${
              isBookmarked 
                ? 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors`}
            title={isBookmarked ? "Eliminar marcador" : "Guardar marcador"}
          >
            {bookmarkSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent" />
            ) : isBookmarked ? (
              <BookmarkCheck size={20} className="flex-shrink-0" />
            ) : (
              <Bookmark size={20} className="flex-shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reader;