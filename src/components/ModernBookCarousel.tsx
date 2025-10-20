import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ModernBookCard } from './ModernBookCard';

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  progress?: number;
  currentPage?: number;
  totalPages?: number;
  rating?: number;
  isRecent?: boolean;
  showOptionsMenu?: boolean;
}

interface ModernBookCarouselProps {
  title: string;
  subtitle?: string;
  books: Book[];
  onBookClick: (book: Book) => void;
  className?: string;
  showProgress?: boolean;
  onEditTitle?: (bookId: string) => void;
  onDelete?: (bookId: string) => void;
}

export const ModernBookCarousel: React.FC<ModernBookCarouselProps> = ({
  title,
  subtitle,
  books,
  onBookClick,
  className = '',
  showProgress = false,
  onEditTitle,
  onDelete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollPrev(scrollLeft > 0);
      setCanScrollNext(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [books]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Ancho aproximado de 1.5 libros
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  if (!books.length) {
    return (
      <div className={`${className}`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">No hay libros disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header compacto con navegación */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white drop-shadow-lg mb-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-purple-200/80">{subtitle}</p>
          )}
        </div>
        
        {/* Botones de navegación mini */}
        <div className="flex space-x-1">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollPrev}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              canScrollPrev
                ? 'bg-white/20 backdrop-blur-sm border border-white/30 shadow-sm hover:shadow-md hover:scale-105 text-white hover:bg-white/30'
                : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white/50 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollNext}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              canScrollNext
                ? 'bg-white/20 backdrop-blur-sm border border-white/30 shadow-sm hover:shadow-md hover:scale-105 text-white hover:bg-white/30'
                : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white/50 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Carrusel de libros */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' }
        }}
      >
        {books.map((book) => (
          <ModernBookCard
            key={book.id}
            id={book.id}
            title={book.title}
            author={book.author}
            cover={book.cover}
            progress={showProgress ? book.progress : undefined}
            currentPage={book.currentPage}
            totalPages={book.totalPages}
            rating={book.rating}
            isRecent={book.isRecent}
            onClick={() => onBookClick(book)}
            className="flex-shrink-0 w-28 sm:w-32 md:w-36"
            showOptionsMenu={book.showOptionsMenu}
            onEditTitle={() => onEditTitle?.(book.id)}
            onDelete={() => onDelete?.(book.id)}
          />
        ))}
      </div>

    </div>
  );
};

export default ModernBookCarousel; 