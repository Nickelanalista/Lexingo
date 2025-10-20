import { useState, useCallback } from 'react';
import { TranslationResult } from '../types';
import { OpenAIService } from '../services/openai';

export const useTranslator = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para progreso de traducción masiva
  const [isTranslatingBulk, setIsTranslatingBulk] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationTotal, setTranslationTotal] = useState(0);
  const [isCancellingTranslation, setIsCancellingTranslation] = useState(false);
  const [currentFromLanguage, setCurrentFromLanguage] = useState('');
  const [currentToLanguage, setCurrentToLanguage] = useState('');

  const translateWord = useCallback(async (word: string, sourceLanguageCode: string, targetLanguageCode: string): Promise<TranslationResult | null> => {
    if (!word.trim()) return null;
    
    // Si el texto es demasiado largo, usamos la función para párrafos
    if (word.split(/\s+/).length > 5) {
      return translateParagraph(word, sourceLanguageCode, targetLanguageCode);
    }
    
    setIsTranslating(true);
    setError(null);

    try {
      const translatedText = await OpenAIService.translateTextToLanguage(word, targetLanguageCode, sourceLanguageCode);
      const result: TranslationResult = {
        original: word,
        translated: translatedText,
        timestamp: Date.now(),
      };
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al traducir la palabra';
      setError(errorMessage);
      console.error('Error de traducción:', errorMessage);
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Función para traducir párrafos o frases más largas
  const translateParagraph = useCallback(async (text: string, sourceLanguageCode: string, targetLanguageCode: string): Promise<TranslationResult | null> => {
    if (!text.trim()) return null;
    
    setIsTranslating(true);
    setError(null);

    try {
      const translatedText = await OpenAIService.translateTextToLanguage(text, targetLanguageCode, sourceLanguageCode);
      const result: TranslationResult = {
        original: text,
        translated: translatedText,
        timestamp: Date.now()
      };
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al traducir el texto';
      setError(errorMessage);
      console.error('Error de traducción:', errorMessage);
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Nueva función para traducir contenido de página completo
  const translatePageText = useCallback(async (text: string, targetLanguageCode: string, sourceLanguageCode: string = 'en'): Promise<string | null> => {
    setIsTranslating(true);
    setError(null);
    try {
      const translatedText = await OpenAIService.translateTextToLanguage(text, targetLanguageCode, sourceLanguageCode);
      return translatedText;
    } catch (err) {
      setError(err as Error);
      console.error(`Error translating page content from ${sourceLanguageCode} to ${targetLanguageCode} in useTranslator:`, err);
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Simulate translation for development without API key
  const simulateTranslation = useCallback((word: string): Promise<TranslationResult> => {
    setIsTranslating(true);
    
    // Si es un texto largo, simulamos la traducción de un párrafo
    if (word.split(/\s+/).length > 5) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const result: TranslationResult = {
            original: word,
            translated: `[Traducción simulada de texto largo: "${word.substring(0, 30)}..."]`,
            timestamp: Date.now()
          };
          
          setIsTranslating(false);
          resolve(result);
        }, 1000);
      });
    }
    
    const dictionary: Record<string, string> = {
      'hello': 'hola',
      'world': 'mundo',
      'book': 'libro',
      'read': 'leer',
      'page': 'página',
      'word': 'palabra',
      'language': 'idioma',
      'translate': 'traducir',
      'english': 'inglés',
      'spanish': 'español',
      'time': 'tiempo',
      'day': 'día',
      'night': 'noche',
      'house': 'casa',
      'car': 'coche',
      'dog': 'perro',
      'cat': 'gato',
      'man': 'hombre',
      'woman': 'mujer',
      'child': 'niño',
      'food': 'comida',
      'water': 'agua',
      'while': 'mientras',
      'countries': 'países',
      'fail': 'fracasan',
      'succeed': 'tienen éxito',
      'some': 'algunos',
      'others': 'otros',
      'analysis': 'análisis',
      'question': 'pregunta',
      'determine': 'determinar',
      'economist': 'economista'
    };
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const result: TranslationResult = {
          original: word,
          translated: dictionary[word.toLowerCase()] || `[${word}]`,
          timestamp: Date.now()
        };
        
        setIsTranslating(false);
        resolve(result);
      }, 500);
    });
  }, []);

  // Nueva función para traducir múltiples páginas con progreso
  const translateBookPages = useCallback(async (
    pages: Array<{ pageNumber: number; content: string }>,
    targetLanguageCode: string, 
    sourceLanguageCode: string = 'en',
    onProgress?: (progress: number, total: number) => void
  ): Promise<Array<{ pageNumber: number; content: string; translated: string }>> => {
    setIsTranslatingBulk(true);
    setIsCancellingTranslation(false);
    setTranslationProgress(0);
    setTranslationTotal(pages.length);
    setCurrentFromLanguage(sourceLanguageCode);
    setCurrentToLanguage(targetLanguageCode);
    setError(null);

    const results: Array<{ pageNumber: number; content: string; translated: string }> = [];

    try {
      for (let i = 0; i < pages.length; i++) {
        // Check for cancellation
        if (isCancellingTranslation) {
          console.log('[TRANSLATION] Traducción cancelada por el usuario');
          break;
        }

        const page = pages[i];
        console.log(`[TRANSLATION] Traduciendo página ${page.pageNumber} (${i + 1}/${pages.length})`);

        try {
          const translatedContent = await OpenAIService.translateTextToLanguage(
            page.content, 
            targetLanguageCode, 
            sourceLanguageCode
          );

          results.push({
            pageNumber: page.pageNumber,
            content: page.content,
            translated: translatedContent || page.content
          });

          // Update progress
          setTranslationProgress(i + 1);
          onProgress?.(i + 1, pages.length);

          console.log(`[TRANSLATION] Página ${page.pageNumber} traducida exitosamente`);
        } catch (pageError) {
          console.error(`[TRANSLATION] Error traduciendo página ${page.pageNumber}:`, pageError);
          // En caso de error, mantener contenido original
          results.push({
            pageNumber: page.pageNumber,
            content: page.content,
            translated: page.content
          });
          setTranslationProgress(i + 1);
          onProgress?.(i + 1, pages.length);
        }

        // Small delay to prevent API rate limiting
        if (i < pages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return results;
    } catch (err) {
      setError(err as Error);
      console.error('Error en traducción masiva:', err);
      return results;
    } finally {
      setIsTranslatingBulk(false);
      setIsCancellingTranslation(false);
      setTranslationProgress(0);
      setTranslationTotal(0);
    }
  }, [isCancellingTranslation]);

  // Función para cancelar traducción
  const cancelTranslation = useCallback(() => {
    setIsCancellingTranslation(true);
    console.log('[TRANSLATION] Solicitando cancelación de traducción...');
  }, []);

  // Función para resetear manualmente el estado de traducción
  const resetTranslationState = useCallback(() => {
    setIsTranslatingBulk(false);
    setIsCancellingTranslation(false);
    setTranslationProgress(0);
    setTranslationTotal(0);
    setCurrentFromLanguage('');
    setCurrentToLanguage('');
    console.log('[TRANSLATION] Estado de traducción reseteado manualmente');
  }, []);

  return {
    translateWord,
    translateParagraph,
    translatePageText,
    translateBookPages,
    simulateTranslation,
    cancelTranslation,
    resetTranslationState,
    isTranslating,
    isTranslatingBulk,
    translationProgress,
    translationTotal,
    isCancellingTranslation,
    currentFromLanguage,
    currentToLanguage,
    error
  };
};
