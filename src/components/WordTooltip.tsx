import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, offset, flip, shift, arrow, autoUpdate } from '@floating-ui/react';
import { useTranslator } from '../hooks/useTranslator';
import { TranslationResult } from '../types';
import { Loader2, X, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { AudiobookService } from '../services/audiobookService';
import AIChatModal from './AIChatModal';

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
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
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
      setIsAIChatOpen(false);
    }
  }, [isOpen, word, sourceLanguage, targetLanguage, translateWord]);

  const handlePlayAudio = async (text: string, languageCode: string) => {
    if (!text) return;
    try {
      setIsPlayingAudio(languageCode);
      const blob = await AudiobookService.generateSpeech(text, languageCode, 'nova');
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
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
    <>
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
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-white text-center flex-1">
                {word}
              </div>
              {/* Botón de audio pequeño para palabra original */}
              <button
                onClick={() => isPlayingAudio === sourceLanguage ? stopAudio() : handlePlayAudio(word, sourceLanguage)}
                className="w-5 h-5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 flex items-center justify-center transition-all duration-200 hover:scale-110 ml-2"
                disabled={isPlayingAudio === targetLanguage}
                title={`Escuchar en ${sourceLanguageName}`}
              >
                {isPlayingAudio === sourceLanguage ? (
                  <VolumeX size={10} className="text-red-400" />
                ) : (
                  <Volume2 size={10} className="text-blue-400" />
                )}
              </button>
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
              <div className="flex items-start justify-between mb-3">
                <div className={`font-bold text-blue-400 ${isParagraph ? 'text-base text-left flex-1' : 'text-lg text-center flex-1'}`}>
                  {translation?.translated || '...'}
                </div>
                {/* Botón de audio pequeño para traducción */}
                {translation?.translated && (
                  <button
                    onClick={() => isPlayingAudio === targetLanguage ? stopAudio() : handlePlayAudio(translation.translated, targetLanguage)}
                    className="w-5 h-5 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 flex items-center justify-center transition-all duration-200 hover:scale-110 ml-2 flex-shrink-0"
                    disabled={isPlayingAudio === sourceLanguage}
                    title={`Escuchar en ${targetLanguageName}`}
                  >
                    {isPlayingAudio === targetLanguage ? (
                      <VolumeX size={10} className="text-red-400" />
                    ) : (
                      <Volume2 size={10} className="text-green-400" />
                    )}
                  </button>
                )}
              </div>
              
              {/* Botón de consulta IA centrado y más pequeño */}
              {translation?.translated && (
                <div className="mt-3">
                  {/* Separador */}
                  <div className="border-t border-gray-600/50 my-2"></div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={() => setIsAIChatOpen(true)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 rounded-full text-xs text-purple-300 hover:text-purple-200 transition-all duration-200 hover:scale-105"
                    >
                      <Sparkles size={10} />
                      <span>Consultar IA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de IA renderizado en el body usando portal */}
      {isAIChatOpen && createPortal(
        <AIChatModal
          isOpen={isAIChatOpen}
          onClose={() => {
            setIsAIChatOpen(false);
            // Asegurar que el tooltip permanezca abierto después de cerrar el modal
          }}
          initialText={`Palabra: "${word}" - Traducción: "${translation?.translated || ''}"`}
        />,
        document.body
      )}
    </>
  );
};

export default WordTooltip;
