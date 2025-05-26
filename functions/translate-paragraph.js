const axios = require('axios');

// Helper function to get full language name in Spanish
const getLanguageName = (code) => {
  const languages = {
    'en': 'inglés', 'es': 'español', 'it': 'italiano', 'fr': 'francés',
    'ja': 'japonés', 'de': 'alemán', 'pt': 'portugués', 'ru': 'ruso',
    'zh': 'chino (simplificado)', 'ar': 'árabe', 'hi': 'hindi', 'ko': 'coreano',
    'auto': 'detección automática'
  };
  return languages[code.toLowerCase()] || code.toUpperCase();
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, sourceLanguageCode, targetLanguageCode = 'es' } = JSON.parse(event.body);
    
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Force translation to Spanish
    console.log(`[TRADUCCIÓN PÁRRAFO] Forzando traducción al español desde: ${sourceLanguageCode}`);
    
    const sourceLanguageName = getLanguageName(sourceLanguageCode);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Eres un traductor experto que SIEMPRE traduce al español. Traduce el siguiente texto del ${sourceLanguageName} al español de forma precisa y natural, manteniendo el formato y el significado original lo mejor posible. Si hay saltos de línea o párrafos, consérvalos.`
          },
          {
            role: 'user',
            content: `Traduce el siguiente texto del ${sourceLanguageName} al español:\n\n"${text}"`
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    const result = response.data.choices[0]?.message?.content?.trim() || '';
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ result })
    };
    
  } catch (error) {
    console.error('Error in translate-paragraph function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Error translating paragraph', 
        details: error.message 
      })
    };
  }
}; 