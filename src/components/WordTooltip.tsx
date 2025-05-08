import React, { useState, useRef, useEffect } from 'react';
import { useFloating, offset, flip, shift, arrow, autoUpdate } from '@floating-ui/react';
import { useTranslator } from '../hooks/useTranslator';
import { TranslationResult } from '../types';
import { Loader2, X, Volume2, VolumeX } from 'lucide-react';
import TTSService from '../services/tts';

interface WordTooltipProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
  referenceElement: HTMLElement | null;
  showBothLanguages?: boolean;
}

const WordTooltip: React.FC<WordTooltipProps> = ({ 
  word, 
  isOpen, 
  onClose,
  referenceElement,
  showBothLanguages = true
}) => {
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const { translateWord, simulateTranslation, isTranslating, error } = useTranslator();
  const [isPlayingAudio, setIsPlayingAudio] = useState<'en' | 'es' | null>(null);
  
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    elements: {
      reference: referenceElement
    },
    placement: 'top',
    middleware: [
      offset(8),
      flip(),
      shift(),
      arrow({ element: arrowRef })
    ],
    whileElementsMounted: autoUpdate
  });

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

  if (!isOpen) return null;

  // Determinar si es una sola palabra o un texto más largo (párrafo)
  const isParagraph = word.split(/\s+/).length > 5;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 px-3 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-auto min-w-48 max-w-lg animate-fadeIn"
    >
      <div className="absolute top-2 right-2">
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
      
      <div 
        ref={arrowRef}
        className="absolute w-3 h-3 bg-white dark:bg-gray-800 transform rotate-45 border-b border-r border-gray-200 dark:border-gray-700"
        style={{
          top: 'auto',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        }}
      />
      
      <div className="text-center pt-2">
        {showBothLanguages && (
          <>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
              Inglés
            </div>
            <div className="font-bold text-gray-900 dark:text-white mb-4">
              {word}
            </div>
          </>
        )}
        
        <div className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
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
            <div className={`font-bold text-blue-600 dark:text-blue-400 ${isParagraph ? 'text-base text-left' : 'text-lg text-center'} mb-2`}>
              {translation?.translated || '...'}
            </div>
            
            {translation?.translated && (
              <div className="flex justify-center space-x-4 mt-3 mb-1">
                <button
                  onClick={() => isPlayingAudio === 'en' ? stopAudio() : handlePlayAudio(word, 'en')}
                  className="flex items-center text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={isPlayingAudio === 'es' || isParagraph}
                >
                  {isPlayingAudio === 'en' ? (
                    <>
                      <VolumeX size={14} className="mr-1 text-red-500" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="mr-1 text-gray-600 dark:text-gray-300" />
                      <span>Inglés</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => isPlayingAudio === 'es' ? stopAudio() : handlePlayAudio(translation.translated, 'es')}
                  className="flex items-center text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                  disabled={isPlayingAudio === 'en' || isParagraph}
                >
                  {isPlayingAudio === 'es' ? (
                    <>
                      <VolumeX size={14} className="mr-1 text-red-500" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="mr-1 text-blue-600 dark:text-blue-400" />
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