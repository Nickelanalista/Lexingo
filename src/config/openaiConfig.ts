/**
 * Configuración de OpenAI Assistants
 * Este archivo contiene los IDs de los asistentes de OpenAI utilizados para traducción
 */

console.log('🛠️ Cargando configuración de OpenAI Assistants...');

export const OPENAI_ASSISTANTS = {
  // Los IDs deben ser reemplazados con los reales de tu cuenta de OpenAI
  TRANSLATION: {
    'en-es': '', // ID del asistente de inglés a español
    'es-en': '', // ID del asistente de español a inglés
    'fr-es': '', // ID del asistente de francés a español
    'it-es': '', // ID del asistente de italiano a español
    'ja-es': '', // ID del asistente de japonés a español
  },
  
  // Si quieres usar un solo asistente para todas las traducciones, configura DEFAULT_ASSISTANT_ID
  DEFAULT_ASSISTANT_ID: '', // ID de un asistente general que pueda manejar cualquier par de idiomas
  
  // Flag para forzar el uso del asistente por defecto (ignorando los específicos)
  USE_DEFAULT_ASSISTANT: false,
  
  // Flag para usar el modelo de chat completions si hay problemas con los asistentes
  FALLBACK_TO_CHAT_COMPLETIONS: true,
  
  // Si esta opción es true, SIEMPRE usará el API de Chat en lugar de assistants,
  // independientemente de si hay asistentes configurados o no
  FORCE_CHAT_API: true
};

console.log('⚙️ Configuración cargada:', {
  usandoFallback: OPENAI_ASSISTANTS.FALLBACK_TO_CHAT_COMPLETIONS,
  forzandoChat: OPENAI_ASSISTANTS.FORCE_CHAT_API
});

// Instrucciones para crear asistentes:
// 
// 1. Ve a https://platform.openai.com/assistants
// 2. Crea un nuevo asistente para cada par de idiomas
// 3. Para el asistente de inglés a español:
//    - Nombre: "Traductor EN-ES"
//    - Modelo: gpt-4o
//    - Instrucciones: "Eres un traductor experto de inglés a español. Tu única función es traducir 
//      el texto que recibas del inglés al español, manteniendo el significado preciso y el tono adecuado. 
//      Solo debes proporcionar la traducción, sin información adicional ni comentarios."
// 4. Copia el ID del asistente (asst_123abc...) y colócalo en este archivo
// 5. Repite para cada par de idiomas que necesites
//
// Para el asistente por defecto:
//    - Nombre: "Traductor Universal"
//    - Modelo: gpt-4o
//    - Instrucciones: "Eres un traductor experto. Detecta automáticamente el idioma del texto 
//      que te envío y tradúcelo al español. Proporciona sólo la traducción, sin comentarios ni otra información." 