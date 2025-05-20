import React, { useState, useRef, useEffect } from 'react';
import { useFloating, offset, flip, shift, arrow, autoUpdate } from '@floating-ui/react';
import { useTranslator } from '../hooks/useTranslator';
import { TranslationResult } from '../types';
import { Loader2, X, Volume2, VolumeX } from 'lucide-react';
import TTSService from '../services/tts';

interface WordTooltipProps {
  word: string;
  sourceLanguage: string;
  sourceLanguageName: string;
  targetLanguage: string;
  targetLanguageName?: string;
  isOpen: boolean;
  onClose: () => void;
  referenceElement: HTMLElement | null;
  showBothLanguages?: boolean;
}

const WordTooltip: React.FC<WordTooltipProps> = ({ 
  word, 
  sourceLanguage, 
  sourceLanguageName,
  targetLanguage, 
  targetLanguageName = 'Español',
  isOpen, 
  onClose,
  referenceElement,
  showBothLanguages = true
}) => {
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { translateWord, isTranslating, error } = useTranslator();
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  
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

  const setFloating = (node: HTMLDivElement | null) => {
    refs.setFloating(node);
    if (node) tooltipRef.current = node;
  };

  useEffect(() => {
    if (isOpen) {
      setIsPositioned(false);
      setShouldRender(false);
      const timer = setTimeout(() => {
        setIsPositioned(true);
        setShouldRender(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (referenceElement && referenceElement.contains(event.target as Node)) return;
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, referenceElement]);

  useEffect(() => {
    if (isOpen && word && sourceLanguage && targetLanguage) {
      setTranslation(null);
      translateWord(word, sourceLanguage, targetLanguage)
        .then(result => { if (result) setTranslation(result); })
        .catch(err => {
          console.error("Error in WordTooltip translation:", err);
          setTranslation({ original: word, translated: "Error al traducir", timestamp: Date.now() }); 
        });
    } else if (!isOpen) {
      setTranslation(null); 
    }
  }, [isOpen, word, sourceLanguage, targetLanguage, translateWord]);

  const handlePlayAudio = async (text: string, languageCode: string) => {
    if (!text) return;
    try {
      setIsPlayingAudio(languageCode);
      await TTSService.speakText(text, languageCode as 'en'|'es'|'fr'|'it'|'ja'|'de'|'pt');
    } catch (error) {
      console.error('Error al reproducir audio:', error);
    } finally {
      setIsPlayingAudio(null);
    }
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlayingAudio(null);
  };

  if (!isOpen || !shouldRender) return null;

  const isParagraph = word.split(/\s+/).length > 5;
  const isTop = context.placement === 'top';
  const arrowStyles = isTop
    ? { top: 'auto', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', borderTop: 'none', borderLeft: 'none' }
    : { bottom: 'auto', top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', borderBottom: 'none', borderRight: 'none' };

  return (
    <div
      ref={setFloating}
      style={{ ...floatingStyles, opacity: isPositioned ? 1 : 0, transition: 'opacity 150ms ease-in-out' }}
      className="z-[9999] shadow-xl bg-gray-900 dark:bg-gray-800 text-white rounded-lg min-w-48 max-w-lg w-auto"
    >
      <div className="flex justify-between items-center bg-gradient-to-r from-purple-900 to-blue-900 px-4 py-2 rounded-t-lg">
        {showBothLanguages && (
          <div className="text-sm text-gray-100 font-medium capitalize">{sourceLanguageName}</div>
        )}
        <button onClick={onClose} className="text-gray-300 hover:text-white focus:outline-none ml-auto" aria-label="Cerrar">
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
          {targetLanguageName}
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
                  onClick={() => isPlayingAudio === sourceLanguage ? stopAudio() : handlePlayAudio(word, sourceLanguage)}
                  className="flex items-center text-xs px-2 py-1 bg-blue-900/50 hover:bg-blue-800/50 rounded text-gray-200 transition-colors"
                  disabled={isPlayingAudio === targetLanguage || isParagraph}
                >
                  {isPlayingAudio === sourceLanguage ? (
                    <>
                      <VolumeX size={14} className="mr-1 text-red-500" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="mr-1 text-blue-400" />
                      <span className="capitalize">{sourceLanguageName}</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => isPlayingAudio === targetLanguage ? stopAudio() : handlePlayAudio(translation.translated, targetLanguage)}
                  className="flex items-center text-xs px-2 py-1 bg-blue-900/50 hover:bg-blue-800/50 rounded text-gray-200 transition-colors"
                  disabled={isPlayingAudio === sourceLanguage || isParagraph}
                >
                  {isPlayingAudio === targetLanguage ? (
                    <>
                      <VolumeX size={14} className="mr-1 text-red-500" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="mr-1 text-blue-400" />
                      <span className="capitalize">{targetLanguageName}</span>
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