import axios from 'axios';
import { OpenAIResponse } from '../types';

// Helper function to get full language name in Spanish
export const getLanguageName = (code: string): string => {
  switch (code.toLowerCase()) {
    case 'en': return 'inglés';
    case 'es': return 'español';
    case 'it': return 'italiano';
    case 'fr': return 'francés';
    case 'ja': return 'japonés';
    case 'de': return 'alemán';
    case 'pt': return 'portugués';
    case 'ru': return 'ruso';
    case 'zh': return 'chino (simplificado)';
    case 'ar': return 'árabe';
    case 'hi': return 'hindi';
    case 'ko': return 'coreano';
    case 'nl': return 'neerlandés';
    case 'sv': return 'sueco';
    case 'tr': return 'turco';
    // Add more languages as needed
    default: return code; // Fallback to code if not found
  }
};

/**
 * Servicio para interactuar con la API de OpenAI
 */
export const OpenAIService = {
  /**
   * Traduce una palabra de un idioma de origen a un idioma de destino usando OpenAI
   * @param word - Palabra a traducir
   * @param sourceLanguageCode - Código del idioma de origen (ej: 'en')
   * @param targetLanguageCode - Código del idioma de destino (ej: 'es')
   * @returns La palabra traducida
   */
  async translateWord(word: string, sourceLanguageCode: string, targetLanguageCode: string): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }

      const sourceLanguageName = getLanguageName(sourceLanguageCode);
      const targetLanguageName = getLanguageName(targetLanguageCode);
      
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1-nano',
          messages: [
            {
              role: 'system',
              content: `Eres un traductor especializado. Traduce la palabra proporcionada del ${sourceLanguageName} al ${targetLanguageName} de forma precisa. Responde únicamente con la palabra traducida, sin información adicional.`
            },
            {
              role: 'user',
              content: `Traduce la siguiente palabra del ${sourceLanguageName} al ${targetLanguageName}: "${word}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 50
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      return response.data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Error al llamar a la API de OpenAI para traducir palabra:', error);
      throw error;
    }
  },

  /**
   * Traduce un párrafo o texto más largo de un idioma de origen a un idioma de destino usando OpenAI
   * @param text - Texto a traducir
   * @param sourceLanguageCode - Código del idioma de origen (ej: 'en')
   * @param targetLanguageCode - Código del idioma de destino (ej: 'es')
   * @returns El texto traducido
   */
  async translateParagraph(text: string, sourceLanguageCode: string, targetLanguageCode: string): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }

      const sourceLanguageName = getLanguageName(sourceLanguageCode);
      const targetLanguageName = getLanguageName(targetLanguageCode);
      
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1-nano', // Considerar gpt-4o para mayor calidad si el presupuesto lo permite
          messages: [
            {
              role: 'system',
              content: `Eres un traductor experto. Traduce el siguiente texto del ${sourceLanguageName} al ${targetLanguageName} de forma precisa y natural, manteniendo el formato y el significado original lo mejor posible. Si hay saltos de línea o párrafos, consérvalos.`
            },
            {
              role: 'user',
              content: `Traduce el siguiente texto del ${sourceLanguageName} al ${targetLanguageName}:\n\n"${text}"`
            }
          ],
          temperature: 0.5, // Un poco más de creatividad para traducciones de formato largo
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      return response.data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Error al llamar a la API de OpenAI para traducir texto:', error);
      throw error;
    }
  },

  // Restaurar la función translateTextToLanguage
  async translateTextToLanguage(text: string, targetLanguageCode: string, sourceLanguageCode: string = 'en'): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }

      const sourceLanguageName = getLanguageName(sourceLanguageCode);
      const targetLanguageName = getLanguageName(targetLanguageCode);

      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1-nano', 
          messages: [
            {
              role: 'system',
              content: `Eres un traductor experto. Traduce el siguiente texto del ${sourceLanguageName} al ${targetLanguageName} de forma precisa y natural, manteniendo el formato y el significado original lo mejor posible. Si hay saltos de línea o párrafos, consérvalos.`
            },
            {
              role: 'user',
              content: `Traduce el siguiente texto del ${sourceLanguageName} al ${targetLanguageName}:\n\n"${text}"`
            }
          ],
          temperature: 0.5, 
          max_tokens: 3000 // Ajustado para páginas más largas
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      return response.data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error(`Error al traducir texto completo de ${sourceLanguageCode} a ${targetLanguageCode}:`, error);
      throw error;
    }
  },

  // Aquí deberían ir también getAIChatResponse y transcribeAudio si se quieren restaurar completamente,
  // pero para el error actual, solo translateTextToLanguage es crucial.
};