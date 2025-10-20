import React, { useState } from 'react';

interface BookCoverProps {
  src?: string;
  title: string;
  className?: string;
  alt?: string;
}

const BookCover: React.FC<BookCoverProps> = ({ 
  src, 
  title, 
  className = "w-full h-full object-cover",
  alt 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Obtener la primera letra del título
  const getFirstLetter = (text: string) => {
    return text.charAt(0).toUpperCase() || 'L';
  };

  // Generar un color basado en el título para consistencia
  const getBookColor = (text: string) => {
    const colors = [
      'bg-gradient-to-br from-purple-500 to-blue-500',
      'bg-gradient-to-br from-pink-500 to-rose-500', 
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-orange-500 to-amber-500',
      'bg-gradient-to-br from-indigo-500 to-purple-500',
      'bg-gradient-to-br from-teal-500 to-cyan-500',
      'bg-gradient-to-br from-red-500 to-pink-500',
      'bg-gradient-to-br from-blue-500 to-indigo-500'
    ];
    
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Si no hay src o si la imagen falló, mostrar avatar con letra
  if (!src || imageError) {
    return (
      <div className={`${className} ${getBookColor(title)} flex items-center justify-center relative overflow-hidden`}>
        <span className="text-white font-bold text-2xl drop-shadow-lg">
          {getFirstLetter(title)}
        </span>
        {/* Efecto de brillo sutil */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt || title}
        className={`${className} ${!imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="lazy"
      />
      
      {/* Placeholder mientras carga */}
      {!imageLoaded && (
        <div className={`absolute inset-0 ${getBookColor(title)} flex items-center justify-center animate-pulse`}>
          <span className="text-white font-bold text-2xl drop-shadow-lg">
            {getFirstLetter(title)}
          </span>
        </div>
      )}
    </>
  );
};

export default BookCover;