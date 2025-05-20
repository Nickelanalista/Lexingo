import axios from 'axios';
import { OpenAIResponse } from '../types';

// Definición de la interfaz Message (idealmente estaría en src/types)
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
   * Sistema interno para detectar idioma basado en características del texto
   * No requiere API y funciona offline
   */
  detectLanguageLocally(text: string): string {
    // Asegurar que tenemos texto para analizar
    if (!text || text.trim().length < 10) {
      return 'en'; // Por defecto inglés si no hay suficiente texto
    }
    
    // Verificar si es un mensaje de error o placeholder
    const lowerText = text.toLowerCase();
    if (lowerText.startsWith('[página') || 
        lowerText.startsWith('[error') || 
        lowerText.startsWith('[contenido de la página') || 
        lowerText.startsWith('[procesando ocr')) {
      console.log('[DETECTOR-IDIOMA] Texto detectado como mensaje de sistema, asumiendo inglés');
      return 'en';
    }
    
    // Limpiar el texto para análisis
    const sample = text.substring(0, 500).toLowerCase();
    
    // Verificación rápida para inglés - patrones muy específicos
    const strongEnglishIndicators = [
      'the ', ' of ', ' in ', ' for ', ' and ', ' to ', ' from ', ' with ', ' by ',
      ' is ', ' are ', ' was ', ' were ', ' this ', ' that ', ' these ', ' those '
    ];
    
    // Verificación rápida para español - acentos y caracteres específicos
    const strongSpanishIndicators = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'];
    
    // Contar indicadores fuertes de inglés
    let strongEnglishCount = 0;
    for (const indicator of strongEnglishIndicators) {
      if (sample.includes(indicator)) {
        strongEnglishCount++;
      }
    }
    
    // Contar indicadores fuertes de español
    let strongSpanishCount = 0;
    for (const indicator of strongSpanishIndicators) {
      if (sample.includes(indicator)) {
        strongSpanishCount++;
      }
    }
    
    // Si hay muchos indicadores fuertes de inglés y ninguno de español, es casi seguro que es inglés
    if (strongEnglishCount >= 5 && strongSpanishCount === 0) {
      console.log(`[DETECTOR-IDIOMA] Detectado inglés por indicadores fuertes (${strongEnglishCount} marcadores)`);
      return 'en';
    }
    
    // Si hay indicadores fuertes de español, es muy probable que sea español
    if (strongSpanishCount >= 2) {
      console.log(`[DETECTOR-IDIOMA] Detectado español por indicadores fuertes (${strongSpanishCount} marcadores)`);
      return 'es';
    }
    
    // Palabras y patrones específicos del español
    const spanishWords = [
      ' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' unos ', ' unas ',
      ' de ', ' en ', ' con ', ' por ', ' para ', ' del ', ' al ', ' a ', ' y ',
      ' o ', ' u ', ' este ', ' esta ', ' estos ', ' estas ', ' ese ', ' esa ',
      ' esos ', ' esas ', ' aquel ', ' aquella ', ' aquellos ', ' aquellas ',
      ' que ', ' cual ', ' quien ', ' cuyo ', ' donde ', ' cuando ', ' cuanto ',
      ' como ', ' porque ', ' aunque ', ' si ', ' pero ', ' más ', ' menos ',
      ' sin ', ' según ', ' sobre ', ' tras ', ' mediante ', ' durante ',
      ' está ', ' están ', ' estaba ', ' estaban ', ' ser ', ' era ', ' fueron ',
      ' será ', ' han ', ' han sido ', ' ha ', ' he ', ' hemos ', ' habéis ',
      ' muy ', ' mucho ', ' mucha ', ' muchos ', ' muchas ', ' poco ', ' poca ',
      ' pocos ', ' pocas ', ' algunos ', ' algunas ', ' ningún ', ' ninguno ',
      ' ninguna ', ' algo ', ' alguien ', ' nada ', ' nadie ',
      ' siempre ', ' nunca ', ' jamás ', ' también ', ' tampoco ', ' ya ',
      ' ahora ', ' después ', ' antes ', ' aún ', ' todavía '
    ];
    
    // Palabras y patrones específicos del inglés
    const englishWords = [
      ' the ', ' a ', ' an ', ' of ', ' in ', ' on ', ' at ', ' by ', ' for ',
      ' with ', ' about ', ' against ', ' between ', ' into ', ' through ',
      ' during ', ' before ', ' after ', ' above ', ' below ', ' to ', ' from ',
      ' up ', ' down ', ' is ', ' are ', ' was ', ' were ', ' be ', ' been ',
      ' being ', ' have ', ' has ', ' had ', ' having ', ' do ', ' does ', ' did ',
      ' doing ', ' would ', ' should ', ' could ', ' might ', ' may ', ' can ',
      ' must ', ' shall ', ' will ', ' and ', ' but ', ' or ', ' because ',
      ' as ', ' until ', ' while ', ' if ', ' then ', ' than ', ' so ', ' that ',
      ' though ', ' although ', ' this ', ' these ', ' that ', ' those ',
      ' my ', ' your ', ' his ', ' her ', ' its ', ' our ', ' their ',
      ' i ', ' you ', ' he ', ' she ', ' it ', ' we ', ' they ',
      ' me ', ' him ', ' us ', ' them ', ' myself ', ' yourself ', ' himself ',
      ' herself ', ' itself ', ' ourselves ', ' themselves '
    ];
    
    // Contadores para cada idioma
    let spanishCount = 0;
    let englishCount = 0;
    
    // Verificar palabras en español
    for (const word of spanishWords) {
      if (sample.includes(word)) {
        spanishCount++;
      }
    }
    
    // Verificar palabras en inglés
    for (const word of englishWords) {
      if (sample.includes(word)) {
        englishCount++;
      }
    }
    
    // Verificar acentos españoles (gran indicador)
    for (const accent of strongSpanishIndicators) {
      if (sample.includes(accent)) {
        spanishCount += 3; // Dar mayor peso a los acentos
      }
    }
    
    // Verificar patrones de terminación típicos del español
    if (sample.match(/\w+ción\b/g) || 
        sample.match(/\w+dad\b/g) || 
        sample.match(/\w+mente\b/g) ||
        sample.match(/\w+aba\b/g) ||
        sample.match(/\w+aban\b/g) ||
        sample.match(/\w+ado\b/g) ||
        sample.match(/\w+ido\b/g) ||
        sample.match(/\w+amos\b/g) ||
        sample.match(/\w+emos\b/g) ||
        sample.match(/\w+imos\b/g)) {
      spanishCount += 5;
    }
    
    // Verificar patrones de terminación típicos del inglés
    if (sample.match(/\w+ing\b/g) || 
        sample.match(/\w+ly\b/g) || 
        sample.match(/\w+ed\b/g) ||
        sample.match(/\w+'s\b/g) ||
        sample.match(/\w+es\b/g)) {
      englishCount += 5;
    }
    
    console.log(`[DETECTOR-IDIOMA] Puntuación español: ${spanishCount}, Puntuación inglés: ${englishCount}`);
    
    // Requerir una diferencia más clara para clasificar como español
    if (spanishCount > englishCount + 5) {
      return 'es';
    } 
    // Si hay más evidencia de inglés o si la diferencia no es clara, devolver inglés
    else {
      return 'en';
    }
  },

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

      // Si el idioma de origen es 'auto', primero detectamos el idioma
      let sourceLanguage = sourceLanguageCode;
      let detectedLanguage = '';
      
      if (sourceLanguageCode === 'auto') {
        try {
          // Primero intentamos la detección local
          const locallyDetectedLanguage = this.detectLanguageLocally(word);
          console.log(`[DETECCIÓN LOCAL] Idioma detectado: ${locallyDetectedLanguage}`);
          
          // Si tenemos suficiente confianza con la detección local, la usamos
          if (word.length > 50) {
            detectedLanguage = locallyDetectedLanguage;
          } else {
            // Para textos cortos, confirmamos con la API
            detectedLanguage = await this.detectLanguage(word);
            
            // Si la API dice inglés pero nuestra detección dice español, priorizamos nuestra detección
            if (detectedLanguage === 'en' && locallyDetectedLanguage === 'es') {
              console.log('[DETECCIÓN] Sobreescribiendo a español basado en detección local');
              detectedLanguage = 'es';
            }
          }
          
          sourceLanguage = detectedLanguage;
          console.log(`[DETECCIÓN FINAL] Idioma detectado: ${detectedLanguage}`);
        } catch (error) {
          console.warn('Error al detectar idioma, usando inglés como predeterminado:', error);
          sourceLanguage = 'en';
        }
      }

      // Si el idioma de origen y destino son iguales, no es necesario traducir
      if (sourceLanguage === targetLanguageCode) {
        console.log(`[TRADUCCIÓN] Omitiendo traducción de ${sourceLanguage} a ${targetLanguageCode}`);
        
        // Devolver objeto con el idioma detectado pero sin traducción
        if (detectedLanguage) {
          return JSON.stringify({
            text: word,
            detectedSourceLanguage: detectedLanguage
          });
        }
        
        return word;
      }

      const sourceLanguageName = getLanguageName(sourceLanguage);
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
      
      const translatedText = response.data.choices[0]?.message?.content?.trim() || '';
      
      // Si hemos detectado el idioma, devolvemos tanto la traducción como el idioma detectado
      if (detectedLanguage) {
        return JSON.stringify({
          text: translatedText,
          detectedSourceLanguage: detectedLanguage
        });
      }
      
      return translatedText;
    } catch (error) {
      console.error('Error al llamar a la API de OpenAI para traducir palabra:', error);
      throw error;
    }
  },

  /**
   * Detecta el idioma de un texto utilizando OpenAI
   * @param text - Texto para detectar el idioma
   * @returns Código del idioma detectado (ej: 'en', 'es')
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      // Primero intentamos la detección local
      const localDetection = this.detectLanguageLocally(text);
      
      // Si el texto es largo, confiamos más en nuestra detección local
      if (text.length > 100) {
        console.log(`[DETECCIÓN] Confiando en detección local: ${localDetection}`);
        return localDetection;
      }
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        console.log('[DETECCIÓN] API no disponible, usando detección local');
        return localDetection;
      }
      
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1-nano',
          messages: [
            {
              role: 'system',
              content: `Eres un detector de idiomas. Analiza el texto proporcionado y determina su idioma. Responde ÚNICAMENTE con el código ISO 639-1 de dos letras del idioma (ej: 'en' para inglés, 'es' para español, 'fr' para francés, etc.). No incluyas ninguna explicación ni información adicional.`
            },
            {
              role: 'user',
              content: `Detecta el idioma del siguiente texto: "${text.substring(0, 200)}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      const apiDetectedLanguage = response.data.choices[0]?.message?.content?.trim().toLowerCase() || 'en';
      
      // Verificar si hay discrepancia entre detección local y API
      if (localDetection !== apiDetectedLanguage) {
        console.log(`[DETECCIÓN] Discrepancia: Local dice ${localDetection}, API dice ${apiDetectedLanguage}`);
        
        // Si la detección local es español pero la API dice inglés, confiamos más en nuestra detección local
        if (localDetection === 'es' && apiDetectedLanguage === 'en') {
          console.log('[DETECCIÓN] Preferimos detección local: español');
          return 'es';
        }
      }
      
      return apiDetectedLanguage;
    } catch (error) {
      console.error('Error al detectar idioma con OpenAI:', error);
      // Usar nuestra detección local como respaldo
      return this.detectLanguageLocally(text);
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

  async getAIChatResponse(messages: Message[]): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('La clave API de OpenAI no está configurada');
      }

      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.1-nano', // Consistente con otros usos
          messages: messages,
          temperature: 0.7, // Temperatura estándar para chat
          max_tokens: 1000 // Permitir respuestas más largas para chat
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
};