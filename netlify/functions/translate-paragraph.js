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

// Helper function to get language name in English for AI prompt
const getLanguageNameInEnglish = (code) => {
  const languages = {
    'en': 'English', 'es': 'Spanish', 'it': 'Italian', 'fr': 'French',
    'ja': 'Japanese', 'de': 'German', 'pt': 'Portuguese', 'ru': 'Russian',
    'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi', 'ko': 'Korean',
    'auto': 'auto-detect'
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

    // Translate to the specified target language
    console.log(`[TRADUCCIÓN PÁRRAFO] Traduciendo de ${sourceLanguageCode} a ${targetLanguageCode}`);
    
    const sourceLanguageName = getLanguageNameInEnglish(sourceLanguageCode);
    const targetLanguageName = getLanguageNameInEnglish(targetLanguageCode);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Translate the following text from ${sourceLanguageName} to ${targetLanguageName} accurately and naturally, preserving the original format and meaning as much as possible. If there are line breaks or paragraphs, preserve them. Respond ONLY with the translation, no explanations or additional text.`
          },
          {
            role: 'user',
            content: `Translate this text from ${sourceLanguageName} to ${targetLanguageName}:\n\n"${text}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 800
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