import axios from 'axios';

/**
 * Servicio para la síntesis de voz utilizando OpenAI
 */
export const TTSService = {
  /**
   * Convierte texto a voz y reproduce el audio
   * @param text - Texto a convertir en voz
   * @param language - Idioma del texto ('en' para inglés, 'es' para español)
   */
  async speakText(text: string, language: 'en' | 'es'): Promise<void> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }

      // Seleccionar la voz según el idioma
      // Para inglés usamos 'nova', para español 'alloy' que funciona bien con acentos
      const voice = language === 'en' ? 'nova' : 'alloy';
      
      // Instrucciones específicas según el idioma
      const instructions = language === 'en' 
        ? 'Speak in a clear English accent with natural intonation.' 
        : 'Habla con un acento español claro y natural.';
      
      // Hacer la solicitud a la API de OpenAI
      const response = await axios({
        method: 'post',
        url: 'https://api.openai.com/v1/audio/speech',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'gpt-4o-mini-tts',
          input: text,
          voice: voice,
          instructions: instructions,
          response_format: 'mp3'
        },
        responseType: 'arraybuffer'
      });
      
      // Convertir la respuesta a un Blob
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Reproducir el audio
      const audio = new Audio(audioUrl);
      audio.play();
      
      // Liberar el URL cuando el audio termine
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
    } catch (error) {
      console.error('Error al sintetizar voz:', error);
      throw error;
    }
  },

  /**
   * Alternativa usando la API Web Speech (no requiere API key)
   * Útil como fallback o para desarrollo
   */
  speakTextUsingWebSpeech(text: string, language: 'en' | 'es'): void {
    if ('speechSynthesis' in window) {
      // Detener cualquier síntesis de voz en curso
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'en' ? 'en-US' : 'es-ES';
      utterance.rate = 0.9; // Velocidad ligeramente más lenta para mejor comprensión
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('La API Web Speech no está disponible en este navegador');
    }
  }
};

export default TTSService; 