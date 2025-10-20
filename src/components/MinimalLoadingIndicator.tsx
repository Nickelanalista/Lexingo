import React, { useEffect } from 'react';
import { useThemeContext } from '../context/ThemeContext';
import { Loader2 } from 'lucide-react';

interface MinimalLoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showMessage?: boolean;
}

const MinimalLoadingIndicator: React.FC<MinimalLoadingIndicatorProps> = ({ 
  message = "Cargando", 
  size = 'medium',
  showMessage = true 
}) => {
  const { theme } = useThemeContext();
  
  const logoSrc = '/img/icono_lexingo.png'; // Usar el ícono de la app
  
  const logoSizes = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8', 
    large: 'w-10 h-10'
  };
  
  const spinnerSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };
  
  const textClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  // Agregar animaciones tipo iOS sofisticadas
  useEffect(() => {
    const styleId = 'ios-loading-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes textPulse {
          0%, 100% { 
            opacity: 0.7;
            transform: translateY(0px);
          }
          50% { 
            opacity: 1;
            transform: translateY(-1px);
          }
        }
        
        @keyframes textShimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        
        @keyframes breatheText {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
          }
        }
        
        @keyframes subtleGlow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(147, 51, 234, 0.2);
          }
          50% {
            text-shadow: 0 0 10px rgba(147, 51, 234, 0.4);
          }
        }
        
        .ios-text-animation {
          background: linear-gradient(
            90deg,
            rgba(107, 114, 128, 0.8),
            rgba(147, 51, 234, 0.9),
            rgba(107, 114, 128, 0.8)
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: 
            textShimmer 4s ease-in-out infinite,
            breatheText 5s ease-in-out infinite,
            subtleGlow 3.5s ease-in-out infinite;
        }
        
        .dark .ios-text-animation {
          background: linear-gradient(
            90deg,
            rgba(156, 163, 175, 0.8),
            rgba(147, 51, 234, 0.9),
            rgba(156, 163, 175, 0.8)
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: 
            textShimmer 4s ease-in-out infinite,
            breatheText 5s ease-in-out infinite,
            subtleGlow 3.5s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex items-center justify-center space-x-3">
      {/* Ícono de Lexingo */}
      <img 
        src={logoSrc} 
        alt="Lexingo" 
        className={`${logoSizes[size]} opacity-90`}
      />
      
      {/* Mensaje con animación tipo iOS */}
      {showMessage && (
        <span className={`${textClasses[size]} font-medium ios-text-animation`}>
          {message}...
        </span>
      )}
      
      {/* Spinner simple */}
      <Loader2 className={`${spinnerSizes[size]} animate-spin text-purple-600 dark:text-purple-400`} />
    </div>
  );
};

export default MinimalLoadingIndicator;