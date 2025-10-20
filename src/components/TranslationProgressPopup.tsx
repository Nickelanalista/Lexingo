import React, { useState } from 'react';
import { X, Minimize2, Maximize2, Languages, Loader2 } from 'lucide-react';
import Flag from 'react-world-flags';

// Mapeo de códigos de idioma a códigos de país para las banderas
const languageToCountryCode: {[key: string]: string} = {
  en: 'US',
  es: 'ES',
  it: 'IT',
  fr: 'FR',
  ja: 'JP',
  de: 'DE',
  pt: 'PT',
  ru: 'RU',
  zh: 'CN',
  ar: 'SA',
  hi: 'IN',
  ko: 'KR',
  nl: 'NL',
  sv: 'SE',
  tr: 'TR',
};

interface TranslationProgressPopupProps {
  progress: number;
  total: number;
  fromLanguage: string;
  toLanguage: string;
  onCancel: () => void;
  isCancelling: boolean;
  isVisible: boolean;
}

export const TranslationProgressPopup: React.FC<TranslationProgressPopupProps> = ({
  progress,
  total,
  fromLanguage,
  toLanguage,
  onCancel,
  isCancelling,
  isVisible
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  const percentage = Math.round((progress / total) * 100);

  const handleMinimize = () => {
    setIsMinimized(true);
    setUserHasInteracted(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
    setUserHasInteracted(true);
  };

  // Auto-minimize only initially and if user hasn't interacted
  React.useEffect(() => {
    if (!userHasInteracted && isVisible) {
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 4000); // Auto-minimize after 4 seconds initially
      return () => clearTimeout(timer);
    }
  }, [userHasInteracted, isVisible]);

  if (!isVisible) return null;

  if (isMinimized) {
    // Circular indicator in bottom right (but slightly left of OCR popup)
    return (
      <div className="fixed bottom-16 right-8 z-[100]">
        <div
          onClick={handleExpand}
          className="relative w-16 h-16 bg-gradient-to-br from-purple-500/70 to-purple-600/70 rounded-full shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
        >
          {/* Progress ring */}
          <div className="absolute inset-0">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / total)}`}
                className="transition-all duration-300"
              />
            </svg>
          </div>
          
          {/* Content */}
          <div className="text-white text-center">
            {isCancelling ? (
              <X className="w-6 h-6" />
            ) : (
              <>
                <Languages className="w-5 h-5 mb-0.5" />
                <div className="text-xs font-medium">{percentage}%</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expanded popup
  return (
    <div className="fixed bottom-28 right-6 z-[100] max-w-sm">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Languages className={`w-5 h-5 ${isCancelling ? 'opacity-50' : 'animate-pulse'}`} />
              {!isCancelling && (
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              )}
            </div>
            <h3 className="font-semibold text-sm">
              {isCancelling ? 'Cancelando...' : 'Traduciendo'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMinimize}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Minimizar"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress content */}
        <div className="p-4 space-y-4">
          {/* Language indicators */}
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <Flag code={languageToCountryCode[fromLanguage] || 'US'} className="w-6 h-4" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {fromLanguage.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex items-center space-x-2">
              <Flag code={languageToCountryCode[toLanguage] || 'US'} className="w-6 h-4" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {toLanguage.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progreso:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {percentage}% ({progress}/{total} páginas)
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 rounded-full relative"
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            
            {/* Status text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {isCancelling 
                ? 'Deteniendo...'
                : 'Mejorando tu experiencia de lectura.'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            {!isCancelling && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationProgressPopup;