import { OpenAIService } from './openai';
import { supabase } from '../lib/supabase';

export class AudiobookService {
  private static isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

  static async generateSpeech(text: string, language: string, voice: string): Promise<Blob> {
    if (this.isDevelopment) {
      return this.generateSpeechDirect(text, language, voice);
    } else {
      return this.generateSpeechNetlify(text, language, voice);
    }
  }

  private static async generateSpeechDirect(text: string, language: string, voice: string): Promise<Blob> {
    try {
      // Crear instrucciones basadas en el idioma
      let instructions = '';
      switch (language) {
        case 'es':
          instructions = 'Habla con un acento neutral en español, con ritmo pausado y clara pronunciación para facilitar la comprensión durante la lectura.';
          break;
        case 'en':
          instructions = 'Speak with a neutral English accent, at a moderate pace with clear pronunciation to facilitate reading comprehension.';
          break;
        case 'fr':
          instructions = 'Parlez avec un accent français neutre, à un rythme modéré et une prononciation claire pour faciliter la compréhension pendant la lecture.';
          break;
        default:
          instructions = 'Speak clearly at a moderate pace to facilitate reading comprehension.';
      }

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_OPENAI_API_KEY no está configurada');
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: voice,
          input: text,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(errorData.error?.message || errorData.error || `TTS Error: ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('[TTS] Error:', error);
      throw error;
    }
  }

  private static async generateSpeechNetlify(text: string, language: string, voice: string): Promise<Blob> {
    try {
      console.log('[TTS] Usando Supabase Edge Function text-to-speech (producción)');
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice, format: 'mp3' },
      });
      if (error) throw new Error(error.message || 'Supabase text-to-speech error');

      const base64Audio = (data as any)?.audioData as string;
      if (!base64Audio) throw new Error('Respuesta TTS inválida');
      const byteChars = atob(base64Audio);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: 'audio/mpeg' });
    } catch (error) {
      console.error('[TTS] Error en Supabase function:', error);
      throw error;
    }
  }

  static validateText(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'El texto está vacío' };
    }

    if (text.length > 4096) {
      return { valid: false, error: 'El texto es demasiado largo (máximo 4096 caracteres)' };
    }

    return { valid: true };
  }

  static getAvailableVoices(language: string): string[] {
    const voices = {
      en: ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'],
      es: ['nova', 'coral', 'ballad', 'ash', 'sage'],
      fr: ['coral', 'ballad', 'nova', 'echo'],
    };

    return voices[language as keyof typeof voices] || voices.en;
  }
}
