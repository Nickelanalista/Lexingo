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
          model: 'gpt-4o', // Usando el modelo especificado. Actualizado a gpt-4o para consistencia.
          messages: messages,
          temperature: 0.7, // Temperatura típica para chat
          max_tokens: 1500 // Permitir respuestas más largas y complejas
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
  },

  /**
   * Transcribe un archivo de audio a texto usando OpenAI.
   * @param audioFile - El archivo de audio (File object) a transcribir.
   * @returns El texto transcrito.
   */
  async transcribeAudio(audioFile: File): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada.');
      }

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'gpt-4o-transcribe'); // Usando el modelo de transcripción avanzado
      formData.append('response_format', 'text'); // Solicitamos texto plano como respuesta

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            // 'Content-Type': 'multipart/form-data' // Axios lo establece automáticamente para FormData
          },
        }
      );
      
      // La respuesta directa para response_format: text es el texto en response.data
      if (typeof response.data === 'string') {
        return response.data.trim();
      }
      // Si por alguna razón la respuesta no es un string (aunque no debería con 'text')
      console.warn('La respuesta de transcripción no fue un string:', response.data);
      return '';

    } catch (error) {
      console.error('Error al llamar a la API de OpenAI para transcripción:', error);
      // Podrías querer manejar diferentes tipos de errores aquí, por ejemplo, si error.response existe
      if (axios.isAxiosError(error) && error.response) {
        console.error('Detalles del error de transcripción:', error.response.data);
      }
      throw error;
    }
  }
};

export default OpenAIService; 