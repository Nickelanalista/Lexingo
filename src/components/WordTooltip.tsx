import React, { useState, useRef, useEffect } from 'react';
import { useFloating, offset, flip, shift, arrow, autoUpdate } from '@floating-ui/react';
import { useTranslator } from '../hooks/useTranslator';
import { TranslationResult, WordTooltipProps } from '../types';
import { Loader2, X, Volume2, VolumeX } from 'lucide-react';
import TTSService from '../services/tts';

const WordTooltip: React.FC<WordTooltipProps> = ({ 
  word, 
  isOpen, 
  onClose,
  referenceElement,
  showBothLanguages = true
}) => {
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { translateWord, simulateTranslation, isTranslating, error } = useTranslator();
  const [isPlayingAudio, setIsPlayingAudio] = useState<'en' | 'es' | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  
  // Ocultar el tooltip hasta que se determine la posición final
  const [shouldRender, setShouldRender] = useState(false);
  
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    elements: {
      reference: referenceElement
    },
    placement: 'bottom',
    middleware: [
      offset(8),
      flip(),
      shift(),
      arrow({ element: arrowRef })
    ],
    whileElementsMounted: autoUpdate
  });

  // Conectar la referencia del tooltip con la referencia del floating-ui
  const setFloating = (node: HTMLDivElement | null) => {
    refs.setFloating(node);
    if (node) tooltipRef.current = node;
  };

  // Cuando se abre el tooltip, calculamos primero la posición y luego lo mostramos
  useEffect(() => {
    if (isOpen) {
      // Resetear estado
      setIsPositioned(false);
      setShouldRender(false);
      
      // Pequeño retraso para permitir que floating-ui calcule la posición final
      const timer = setTimeout(() => {
        setIsPositioned(true);
        setShouldRender(true);
      }, 10);
      
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isOpen]);

  // Manejar clic fuera del tooltip
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // No cerrar si hace clic en la palabra de referencia
      if (referenceElement && referenceElement.contains(event.target as Node)) {
        return;
      }
      
      // Cerrar si hace clic fuera del tooltip
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Agregar event listener con un pequeño retraso para evitar que se cierre inmediatamente al abrir
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, referenceElement]);

  useEffect(() => {
    if (isOpen && word) {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (apiKey) {
        translateWord(word).then(result => {
          if (result) setTranslation(result);
        });
      } else {
        simulateTranslation(word).then(result => {
          setTranslation(result);
        });
      }
    } else {
      setTranslation(null);
    }
  }, [isOpen, word, translateWord, simulateTranslation]);

  const handlePlayAudio = async (text: string, language: 'en' | 'es') => {
    try {
      setIsPlayingAudio(language);
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (apiKey) {
        await TTSService.speakText(text, language);
      } else {
        TTSService.speakTextUsingWebSpeech(text, language);
      }
    } catch (error) {
      console.error('Error al reproducir audio:', error);
    } finally {
      setIsPlayingAudio(null);
    }
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(null);
    }
  };

  if (!isOpen || !shouldRender) return null;

  // Determinar si es una sola palabra o un texto más largo (párrafo)
  const isParagraph = word.split(/\s+/).length > 5;

  // Ajustar la posición de la flecha según el placement actual
  const isTop = context.placement === 'top';
  const arrowStyles = isTop
    ? {
        top: 'auto',
        bottom: '-6px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        borderTop: 'none',
        borderLeft: 'none'
      }
    : {
        bottom: 'auto',
        top: '-6px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        borderBottom: 'none',
        borderRight: 'none'
      };

  return (
    <div
      ref={setFloating}
      style={{
        ...floatingStyles,
        opacity: isPositioned ? 1 : 0, // Solo mostrar cuando la posición es final
        transition: 'opacity 150ms ease-in-out'
      }}
      className="z-[9999] shadow-xl bg-gray-900 dark:bg-gray-800 text-white rounded-lg min-w-48 max-w-lg w-auto"
    >
      {/* Encabezado */}
      <div className="flex justify-between items-center bg-gradient-to-r from-purple-900 to-blue-900 px-4 py-2 rounded-t-lg">
        {showBothLanguages && (
          <div className="text-sm text-gray-100 font-medium">Inglés</div>
        )}
        <button 
          onClick={onClose}
          className="text-gray-300 hover:text-white focus:outline-none ml-auto"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
      
      <div 
        ref={arrowRef}
        className="absolute w-3 h-3 bg-gray-900 dark:bg-gray-800 transform border border-gray-700"
        style={arrowStyles}
      />
      
      <div className="px-4 py-3">
        {showBothLanguages && (
          <div className="font-bold text-white mb-4 text-center">
            {word}
          </div>
        )}
        
        <div className="text-sm font-medium text-gray-300 mb-1">
          Español
        </div>
        
        {isTranslating ? (
          <div className="flex justify-center my-2">
            <Loader2 className="animate-spin w-5 h-5 text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-xs text-red-500 mt-1 mb-2">
            Error al traducir. Inténtalo de nuevo.
          </div>
        ) : (
          <div className="relative">
            <div className={`font-bold text-blue-400 ${isParagraph ? 'text-base text-left' : 'text-lg text-center'} mb-2`}>
              {translation?.translated || '...'}
            </div>
            
            {translation?.translated && (
              <div className="flex justify-center space-x-4 mt-3 mb-1">
                <button
                  onClick={() => isPlayingAudio === 'en' ? stopAudio() : handlePlayAudio(word, 'en')}
                  className="flex items-center text-xs px-2 py-1 bg-blue-900/50 hover:bg-blue-800/50 rounded text-gray-200 transition-colors"
                  disabled={isPlayingAudio === 'es' || isParagraph}
                >
                  {isPlayingAudio === 'en' ? (
                    <>
                      <VolumeX size={14} className="mr-1 text-red-500" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="mr-1 text-blue-400" />
                      <span>Inglés</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => isPlayingAudio === 'es' ? stopAudio() : handlePlayAudio(translation.translated, 'es')}
                  className="flex items-center text-xs px-2 py-1 bg-blue-900/50 hover:bg-blue-800/50 rounded text-gray-200 transition-colors"
                  disabled={isPlayingAudio === 'en' || isParagraph}
                >
                  {isPlayingAudio === 'es' ? (
                    <>
                      <VolumeX size={14} className="mr-1 text-red-500" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="mr-1 text-blue-400" />
                      <span>Español</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordTooltip;