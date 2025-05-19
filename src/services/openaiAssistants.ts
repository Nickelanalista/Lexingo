import axios, { AxiosError } from 'axios';
import { OpenAIResponse } from '../types';
import { OPENAI_ASSISTANTS } from '../config/openaiConfig';
import OpenAIService from './openai';

// Constantes para reintentos
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

// Función auxiliar para esperar
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Servicio para interactuar con OpenAI Assistants API
export const OpenAIAssistants = {
  /**
   * Traduce un texto usando un asistente especializado de OpenAI
   * @param text - Texto a traducir
   * @param targetLanguage - Idioma destino (por defecto 'es')
   * @param sourceLanguage - Idioma origen (por defecto 'en')
   * @returns El texto traducido
   */
  async translateText(text: string, targetLanguage: string = 'es', sourceLanguage: string = 'en'): Promise<string> {
    // Si está configurado para forzar el uso de la API de Chat, usarla directamente
    if (OPENAI_ASSISTANTS.FORCE_CHAT_API) {
      console.log('[OpenAIAssistants] Forzando uso de Chat API en lugar de asistentes');
      return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
    }

    let retries = 0;
    let threadId = null;
    
    console.log(`[OpenAIAssistants] Iniciando traducción de "${text.substring(0, 30)}..." de ${sourceLanguage} a ${targetLanguage}`);
    
    while (true) {
      try {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        
        if (!apiKey) {
          console.error('[OpenAIAssistants] Error: No hay API key configurada');
          throw new Error('La clave API de OpenAI no está configurada');
        }

        // Imprimir config para depuración
        console.log('[OpenAIAssistants] Configuración de asistentes:', JSON.stringify(OPENAI_ASSISTANTS.TRANSLATION));

        // Determinar el asistente a usar
        let assistantId;
        
        if (OPENAI_ASSISTANTS.USE_DEFAULT_ASSISTANT) {
          // Si la configuración indica usar el asistente por defecto, lo usamos
          assistantId = OPENAI_ASSISTANTS.DEFAULT_ASSISTANT_ID;
          console.log(`[OpenAIAssistants] Usando asistente por defecto: ${assistantId}`);
        } else {
          // Intentar usar un asistente específico para el par de idiomas
          const assistantKey = `${sourceLanguage}-${targetLanguage}`;
          assistantId = OPENAI_ASSISTANTS.TRANSLATION[assistantKey];
          
          // Si no hay asistente específico, intentar usar el asistente por defecto
          if (!assistantId && OPENAI_ASSISTANTS.DEFAULT_ASSISTANT_ID) {
            assistantId = OPENAI_ASSISTANTS.DEFAULT_ASSISTANT_ID;
            console.log(`[OpenAIAssistants] No hay asistente para ${assistantKey}, usando asistente por defecto: ${assistantId}`);
          }
        }
        
        // Si no se encontró ningún asistente, verificar si podemos hacer fallback a chat completions
        if (!assistantId) {
          console.warn(`[OpenAIAssistants] No se encontró ningún asistente para traducir de ${sourceLanguage} a ${targetLanguage}`);
          
          if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
            console.log('[OpenAIAssistants] Usando fallback a chat completions...');
            return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
          } else {
            throw new Error(`No hay asistente configurado para traducir de ${sourceLanguage} a ${targetLanguage}`);
          }
        }
        
        console.log(`[OpenAIAssistants] Usando asistente ${assistantId} para par de idiomas ${sourceLanguage}-${targetLanguage}`);
        
        // 1. Crear un thread
        console.log('[OpenAIAssistants] Creando thread...');
        const threadResponse = await axios.post(
          'https://api.openai.com/v1/threads',
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'assistants=v1'
            }
          }
        );
        
        threadId = threadResponse.data.id;
        console.log(`[OpenAIAssistants] Thread creado: ${threadId}`);
        
        // 2. Agregar mensaje al thread con contexto del idioma objetivo si es el asistente por defecto
        let userMessage = text;
        
        // Si estamos usando el asistente por defecto y no es el caso específico del idioma,
        // añadir instrucciones sobre el idioma destino
        if (assistantId === OPENAI_ASSISTANTS.DEFAULT_ASSISTANT_ID) {
          userMessage = `Traduce el siguiente texto de ${sourceLanguage} a ${targetLanguage}:\n\n${text}`;
        }
        
        console.log('[OpenAIAssistants] Agregando mensaje al thread...');
        await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/messages`,
          {
            role: 'user',
            content: userMessage
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'assistants=v1'
            }
          }
        );
        
        // 3. Ejecutar el asistente en el thread
        console.log(`[OpenAIAssistants] Ejecutando asistente ${assistantId} en thread ${threadId}...`);
        const runResponse = await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/runs`,
          {
            assistant_id: assistantId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'assistants=v1'
            }
          }
        );
        
        const runId = runResponse.data.id;
        console.log(`[OpenAIAssistants] Run iniciado: ${runId}`);
        
        // 4. Esperar a que termine la ejecución
        let runStatus = 'queued';
        let statusChecks = 0;
        
        console.log('[OpenAIAssistants] Esperando a que el asistente termine...');
        while (runStatus !== 'completed') {
          // Esperar un poco antes de verificar el estado
          await wait(1000);
          statusChecks++;
          
          const runStatusResponse = await axios.get(
            `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v1'
              }
            }
          );
          
          runStatus = runStatusResponse.data.status;
          console.log(`[OpenAIAssistants] Estado del run (check ${statusChecks}): ${runStatus}`);
          
          // Si hay error, salir del bucle
          if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
            console.error(`[OpenAIAssistants] Error: Run terminado con estado: ${runStatus}`);
            
            // Obtener más detalles del error
            if (runStatusResponse.data.last_error) {
              console.error('[OpenAIAssistants] Detalles del error:', runStatusResponse.data.last_error);
            }
            
            // Si hay un error con los asistentes, intentar con chat completions si está habilitado
            if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
              console.log('[OpenAIAssistants] Error con asistente, usando fallback a chat completions...');
              return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
            }
            
            throw new Error(`Ejecución del asistente terminada con estado: ${runStatus}`);
          }
          
          // Prevenir bucle infinito
          if (statusChecks > 30) { // 30 segundos max
            console.error('[OpenAIAssistants] Error: Timeout esperando respuesta del asistente');
            
            // Si hay timeout, intentar con chat completions si está habilitado
            if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
              console.log('[OpenAIAssistants] Timeout, usando fallback a chat completions...');
              return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
            }
            
            throw new Error('Timeout esperando respuesta del asistente');
          }
        }
        
        // 5. Obtener los mensajes (respuesta)
        console.log('[OpenAIAssistants] Obteniendo mensajes con la respuesta...');
        const messagesResponse = await axios.get(
          `https://api.openai.com/v1/threads/${threadId}/messages`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'assistants=v1'
            }
          }
        );
        
        // Depuración: imprimir la estructura completa del primer mensaje
        console.log('[OpenAIAssistants] Estructura del primer mensaje:', 
          JSON.stringify(messagesResponse.data.data[0]).substring(0, 500) + '...');
        
        // Obtener el último mensaje (respuesta del asistente)
        const assistantMessages = messagesResponse.data.data.filter(msg => msg.role === 'assistant');
        
        console.log(`[OpenAIAssistants] Encontrados ${assistantMessages.length} mensajes del asistente`);
        
        if (assistantMessages.length === 0) {
          console.error('[OpenAIAssistants] Error: No se recibieron mensajes del asistente');
          
          // Si no hay mensajes, intentar con chat completions si está habilitado
          if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
            console.log('[OpenAIAssistants] No hay mensajes, usando fallback a chat completions...');
            return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
          }
          
          throw new Error('No se recibió respuesta del asistente');
        }
        
        // Obtener el contenido del mensaje, con manejo de diferentes formatos posibles
        const message = assistantMessages[0];
        let translatedText = '';
        
        // Intentar extraer el texto con manejo seguro de diferentes estructuras
        try {
          if (message.content && Array.isArray(message.content)) {
            // Buscar el primer elemento de tipo 'text'
            const textContent = message.content.find(item => item.type === 'text');
            if (textContent && textContent.text && textContent.text.value) {
              translatedText = textContent.text.value;
            } else {
              // Alternativa: intentar con primera posición aunque no tenga estructura esperada
              console.log('[OpenAIAssistants] Estructura diferente, intentando alternativa...');
              if (message.content[0] && typeof message.content[0] === 'object') {
                if (message.content[0].text) {
                  // Si tiene .text directamente
                  translatedText = message.content[0].text;
                } else if (message.content[0].text && message.content[0].text.value) {
                  // Si sigue la estructura pero con nombres de campo diferentes
                  translatedText = message.content[0].text.value;
                }
              }
            }
          } else if (message.content && typeof message.content === 'string') {
            // Si el contenido es directamente un string
            translatedText = message.content;
          }
        } catch (contentError) {
          console.error('[OpenAIAssistants] Error extrayendo texto de la respuesta:', contentError);
          console.log('[OpenAIAssistants] Mensaje completo:', JSON.stringify(message));
          
          // Si hay error extrayendo el texto, intentar con chat completions si está habilitado
          if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
            console.log('[OpenAIAssistants] Error extrayendo texto, usando fallback a chat completions...');
            return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
          }
          
          throw new Error('Error al extraer el texto traducido de la respuesta');
        }
        
        if (!translatedText) {
          console.error('[OpenAIAssistants] No se pudo extraer texto de la respuesta');
          console.log('[OpenAIAssistants] Mensaje completo:', JSON.stringify(message));
          
          // Si no hay texto extraído, intentar con chat completions si está habilitado
          if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
            console.log('[OpenAIAssistants] No hay texto extraído, usando fallback a chat completions...');
            return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
          }
          
          throw new Error('No se pudo extraer el texto traducido de la respuesta');
        }
        
        console.log(`[OpenAIAssistants] Traducción exitosa, resultado: "${translatedText.substring(0, 30)}..."`);
        return translatedText.trim();
        
      } catch (error) {
        // Verificar si es un error de API de OpenAI
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;
        
        // Imprimir detalles completos del error para depuración
        console.error('[OpenAIAssistants] Error completo:', error);
        
        // Si es un error temporal y no hemos agotado los reintentos
        if (statusCode && [429, 500, 502, 503, 504].includes(statusCode) && retries < MAX_RETRIES) {
          console.warn(`[OpenAIAssistants] Error ${statusCode} al llamar a OpenAI, reintentando (${retries + 1}/${MAX_RETRIES})...`);
          retries++;
          await wait(RETRY_DELAY * retries); // Esperar más tiempo en cada reintento
          continue;
        }
        
        // Si es otro tipo de error o agotamos los reintentos
        console.error('[OpenAIAssistants] Error al llamar a la API de OpenAI Assistants:', error.message);
        
        // En caso de error, devolver el texto original o mensaje de error
        if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          console.error('[OpenAIAssistants] Detalles del error:', JSON.stringify(axiosError.response?.data));
        }
        
        // Si hay error general y está habilitado el fallback, usar chat completions
        if (OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS) {
          console.log('[OpenAIAssistants] Error general, usando fallback a chat completions...');
          try {
            return await OpenAIService.translateParagraph(text, targetLanguage, sourceLanguage);
          } catch (fallbackError) {
            console.error('[OpenAIAssistants] Error también en fallback:', fallbackError);
            throw new Error(`Error en la traducción y fallback: ${error.message}`);
          }
        }
        
        throw new Error(`Error en la traducción: ${error.message}`);
      }
    }
  },

  /**
   * Traduce una palabra usando un asistente especializado
   * @param word - Palabra a traducir
   * @param targetLanguage - Idioma destino (por defecto 'es')
   * @param sourceLanguage - Idioma origen (por defecto 'en')
   * @returns La palabra traducida
   */
  async translateWord(word: string, targetLanguage: string = 'es', sourceLanguage: string = 'en'): Promise<string> {
    return this.translateText(word, targetLanguage, sourceLanguage);
  },

  /**
   * Traduce un párrafo usando un asistente especializado
   * @param text - Texto a traducir
   * @param targetLanguage - Idioma destino (por defecto 'es')
   * @param sourceLanguage - Idioma origen (por defecto 'en')
   * @returns El texto traducido
   */
  async translateParagraph(text: string, targetLanguage: string = 'es', sourceLanguage: string = 'en'): Promise<string> {
    return this.translateText(text, targetLanguage, sourceLanguage);
  }
};

export default OpenAIAssistants; 