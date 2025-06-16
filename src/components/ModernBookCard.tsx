import React from 'react';
import { Book, Clock, Bookmark, Star } from 'lucide-react';

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
  className = ''
}) => {
  return (
    <div 
      className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <div className="relative">
        {/* Portada del libro */}
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Overlay de hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badge de reciente mini */}
          {isRecent && (
            <div className="absolute top-1 right-1 bg-blue-500/90 backdrop-blur-sm rounded-full p-1">
              <Clock className="w-2 h-2 text-white" />
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
          
          {/* Progreso de lectura compacto */}
          {progress > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(progress)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernBookCard; 