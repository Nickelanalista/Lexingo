import { useState, useCallback } from 'react';
import { TranslationResult } from '../types';
import { OpenAIService } from '../services/openai';

export const useTranslator = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateWord = useCallback(async (word: string, sourceLanguageCode: string, targetLanguageCode: string): Promise<TranslationResult | null> => {
    if (!word.trim()) return null;
    
    // Si el texto es demasiado largo, usamos la función para párrafos
    if (word.split(/\s+/).length > 5) {
      return translateParagraph(word, sourceLanguageCode, targetLanguageCode);
    }
    
    setIsTranslating(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      
      const translatedText = await OpenAIService.translateWord(word, sourceLanguageCode, targetLanguageCode);
      
      const result: TranslationResult = {
        original: word,
        translated: translatedText,
        timestamp: Date.now()
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
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      
      const translatedText = await OpenAIService.translateParagraph(text, sourceLanguageCode, targetLanguageCode);
      
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

  return {
    translateWord,
    translateParagraph,
    translatePageText,
    simulateTranslation,
    isTranslating,
    error
  };
};