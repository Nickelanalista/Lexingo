import React, { useState, useRef, useEffect } from 'react';
import { Book, Clock, Bookmark, Star, MoreVertical, Edit, Trash2 } from 'lucide-react';
import BookCover from './BookCover';

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover: string;
  progress?: number;
  currentPage?: number;
  totalPages?: number;
  rating?: number;
  isRecent?: boolean;
  onClick: () => void;
  className?: string;
  showOptionsMenu?: boolean;
  onEditTitle?: () => void;
  onDelete?: () => void;
}

export const ModernBookCard: React.FC<BookCardProps> = ({
  title,
  author,
  cover,
  progress = 0,
  currentPage,
  totalPages,
  rating,
  isRecent = false,
  onClick,
  className = '',
  showOptionsMenu = false,
  onEditTitle,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div 
      className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <div className="relative">
        {/* Portada del libro */}
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
          <BookCover
            src={cover}
            title={title}
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay de hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badge de reciente mini */}
          {isRecent && !showOptionsMenu && (
            <div className="absolute top-1 right-1 bg-blue-500/90 backdrop-blur-sm rounded-full p-1">
              <Clock className="w-2 h-2 text-white" />
            </div>
          )}
          
          {/* Menú de opciones de 3 puntos */}
          {showOptionsMenu && (
            <div className="absolute top-1 right-1" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-6 h-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200 group/menu"
              >
                <MoreVertical className="w-3 h-3 text-white" />
              </button>
              
              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 top-8 w-32 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/20 dark:border-gray-700/30 py-1 z-50 animate-fade-in">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEditTitle?.();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 flex items-center transition-colors"
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Editar nombre
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete?.();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 flex items-center transition-colors"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Barra de progreso compacta */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="bg-black/40 backdrop-blur-sm px-2 py-1">
                <div className="flex items-center justify-between text-white text-xs mb-0.5">
                  <span className="text-xs">{Math.round(progress)}%</span>
                  {currentPage && totalPages && (
                    <span className="text-xs">{currentPage}/{totalPages}</span>
                  )}
                </div>
                <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Información del libro compacta */}
        <div className="mt-2 space-y-0.5">
          <h3 className="font-medium text-gray-900 dark:text-white text-xs line-clamp-2 leading-tight">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-1 opacity-75">
            {author}
          </p>
          
        </div>
      </div>
    </div>
  );
};

export default ModernBookCard; 