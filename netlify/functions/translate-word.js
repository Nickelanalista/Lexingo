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

// Local language detection function
const detectLanguageLocally = (text) => {
  if (!text || text.trim().length < 10) return 'en';
  
  const lowerText = text.toLowerCase();
  if (lowerText.startsWith('[página') || lowerText.startsWith('[error')) {
    return 'en';
  }
  
  const sample = text.substring(0, 500).toLowerCase();
  
  const strongEnglishIndicators = [
    'the ', ' of ', ' in ', ' for ', ' and ', ' to ', ' from ', ' with ', ' by ',
    ' is ', ' are ', ' was ', ' were ', ' this ', ' that '
  ];
  
  const strongSpanishIndicators = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'];
  
  let strongEnglishCount = strongEnglishIndicators.filter(indicator => 
    sample.includes(indicator)
  ).length;
  
  let strongSpanishCount = strongSpanishIndicators.filter(indicator => 
    sample.includes(indicator)
  ).length;
  
  if (strongEnglishCount >= 5 && strongSpanishCount === 0) return 'en';
  if (strongSpanishCount >= 2) return 'es';
  
  const spanishWords = [
    ' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' de ', ' en ', ' con ',
    ' por ', ' para ', ' que ', ' muy ', ' más ', ' está ', ' son '
  ];
  
  const englishWords = [
    ' the ', ' a ', ' an ', ' of ', ' in ', ' on ', ' at ', ' by ', ' for ',
    ' with ', ' is ', ' are ', ' was ', ' were ', ' have ', ' has '
  ];
  
  let spanishCount = spanishWords.filter(word => sample.includes(word)).length;
  let englishCount = englishWords.filter(word => sample.includes(word)).length;
  
  // Boost for Spanish accents
  spanishCount += strongSpanishCount * 3;
  
  return spanishCount > englishCount + 5 ? 'es' : 'en';
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
    const { word, sourceLanguageCode, targetLanguageCode = 'es' } = JSON.parse(event.body);
    
    if (!word) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Word is required' })
      };
    }

    // Force translation to Spanish
    const finalTargetLanguage = 'es';
    console.log(`[TRADUCCIÓN] Forzando traducción al español desde: ${sourceLanguageCode}`);

    let sourceLanguage = sourceLanguageCode;
    let detectedLanguage = '';
    
    // Auto-detect language if needed
    if (sourceLanguageCode === 'auto') {
      if (word.length > 50) {
        detectedLanguage = detectLanguageLocally(word);
      } else {
        // For short texts, use local detection as fallback
        detectedLanguage = detectLanguageLocally(word);
      }
      sourceLanguage = detectedLanguage;
      console.log(`[DETECCIÓN] Idioma detectado: ${detectedLanguage}`);
    }

    // If already in Spanish, no translation needed
    if (sourceLanguage === finalTargetLanguage) {
      console.log('[TRADUCCIÓN] No es necesario traducir, el texto ya está en español');
      
      const result = detectedLanguage ? {
        text: word,
        detectedSourceLanguage: detectedLanguage
      } : word;
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result })
      };
    }

    const sourceLanguageName = getLanguageName(sourceLanguage);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Eres un traductor especializado que SIEMPRE traduce al español. Traduce la palabra proporcionada del ${sourceLanguageName} al español de forma precisa. Responde únicamente con la palabra traducida en español, sin información adicional.`
          },
          {
            role: 'user',
            content: `Traduce la siguiente palabra del ${sourceLanguageName} al español: "${word}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    const translatedText = response.data.choices[0]?.message?.content?.trim() || '';
    
    const result = detectedLanguage ? {
      text: translatedText,
      detectedSourceLanguage: detectedLanguage
    } : translatedText;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ result })
    };
    
  } catch (error) {
    console.error('Error in translate-word function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Error translating word', 
        details: error.message 
      })
    };
  }
}; 