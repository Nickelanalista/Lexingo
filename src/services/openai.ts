import axios from 'axios';
import { OpenAIResponse } from '../types';

/**
 * Servicio para interactuar con la API de OpenAI
 */
export const OpenAIService = {
  /**
   * Traduce una palabra del inglés al español usando OpenAI
   * @param word - Palabra en inglés a traducir
   * @returns La palabra traducida al español
   */
  async translateWord(word: string): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }
      
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Eres un traductor especializado del inglés al español. Traduce la palabra proporcionada de forma precisa. Responde únicamente con la palabra traducida, sin información adicional.'
            },
            {
              role: 'user',
              content: `Traduce la siguiente palabra del inglés al español: "${word}"`
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
      console.error('Error al llamar a la API de OpenAI:', error);
      throw error;
    }
  },

  /**
   * Traduce un párrafo o texto más largo del inglés al español usando OpenAI
   * @param text - Texto en inglés a traducir
   * @returns El texto traducido al español
   */
  async translateParagraph(text: string): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }
      
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Eres un traductor especializado del inglés al español. Traduce el texto proporcionado de forma precisa y natural.'
            },
            {
              role: 'user',
              content: `Traduce el siguiente texto del inglés al español: "${text}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
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
      console.error('Error al llamar a la API de OpenAI para traducir párrafo:', error);
      throw error;
    }
  },

  /**
   * Obtiene una respuesta de chat de OpenAI usando un historial de mensajes.
   * @param messages - Array de mensajes que componen la conversación.
   * @returns La respuesta del asistente de IA.
   */
  async getAIChatResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }
      
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1', // Usando el modelo especificado
          messages: messages,
          temperature: 0.7, // Temperatura típica para chat
          max_tokens: 1000 // Permitir respuestas más largas
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
      console.error('Error al llamar a la API de OpenAI para chat:', error);
      throw error;
    }
  }
};

export default OpenAIService; 