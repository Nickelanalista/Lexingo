import React, { useState } from 'react';
import { X, Minimize2, Maximize2, Loader2 } from 'lucide-react';

interface OCRProgressPopupProps {
  progress: number;
  total: number;
  onCancel: () => void;
  isCancelling: boolean;
}

export const OCRProgressPopup: React.FC<OCRProgressPopupProps> = ({
  progress,
  total,
  onCancel,
  isCancelling
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isInitialShow, setIsInitialShow] = useState(true);

  const percentage = Math.round((progress / total) * 100);

  const handleMinimize = () => {
    setIsMinimized(true);
    setUserHasInteracted(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
    setUserHasInteracted(true);
  };

  // Show prominently for initial OCR, then auto-minimize after 5 seconds
  React.useEffect(() => {
    if (isInitialShow && !userHasInteracted) {
      const timer = setTimeout(() => {
        setIsMinimized(true);
        setIsInitialShow(false);
      }, 5000); // Show expanded for 5 seconds initially
      return () => clearTimeout(timer);
    }
  }, [userHasInteracted, isInitialShow]);
  
  // Auto-complete when OCR finishes
  React.useEffect(() => {
    if (progress >= total && total > 0) {
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 3000); // Auto-minimize 3 seconds after completion
      return () => clearTimeout(timer);
    }
  }, [progress, total]);

  if (isMinimized) {
    // Circular indicator in bottom right
    return (
      <div className="fixed bottom-6 right-6 z-[100]">
        <div
          onClick={handleExpand}
          className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
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
                <Loader2 className="w-5 h-5 animate-spin mb-0.5" />
                <div className="text-xs font-medium">{percentage}%</div>
              </>
            )}
          </div>
          
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />
        </div>
      </div>
    );
  }

  // Expanded popup - more prominent when first shown
  return (
    <div className={`fixed z-[100] max-w-sm transition-all duration-300 ${
      isInitialShow ? 'bottom-1/2 right-1/2 transform translate-x-1/2 translate-y-1/2' : 'bottom-6 right-6'
    }`}>
      <div className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden transition-all duration-300 ${
        isInitialShow ? 'scale-110 animate-pulse-once' : 'scale-100'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Loader2 className={`w-5 h-5 ${isCancelling ? 'opacity-50' : 'animate-spin'}`} />
              {!isCancelling && (
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              )}
            </div>
            <h3 className="font-semibold text-sm">
              {isCancelling ? 'Cancelando...' : isInitialShow ? 'Iniciando OCR...' : 'Procesando'}
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
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full relative"
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            
            {/* Status text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {isCancelling 
                ? 'Deteniendo...'
                : isInitialShow && progress === 0
                  ? 'Preparando el documento para OCR. Puedes seguir navegando...'
                  : 'Las páginas se actualizarán automáticamente.'
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

export default OCRProgressPopup;