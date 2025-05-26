const axios = require('axios');

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
    const { text, language, options = {} } = JSON.parse(event.body);
    
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Configure voice and instructions based on language
    const languageConfig = {
      'es': { 
        voice: 'nova', 
        instructions: 'Speak in clear, neutral Spanish with natural intonation. Pronounce each word distinctly for language learning purposes.' 
      },
      'en': { 
        voice: 'alloy', 
        instructions: 'Speak in clear, neutral American English with natural pace. Emphasize proper pronunciation for language learners.' 
      },
      'fr': { 
        voice: 'coral', 
        instructions: 'Speak in clear, neutral French with proper accent. Articulate each syllable clearly for language learning.' 
      },
      'de': { 
        voice: 'onyx', 
        instructions: 'Speak in clear, neutral German with proper pronunciation. Emphasize consonants and vowels for clarity.' 
      },
      'it': { 
        voice: 'fable', 
        instructions: 'Speak in clear, neutral Italian with natural rhythm. Pronounce each word distinctly for learning purposes.' 
      },
      'pt': { 
        voice: 'shimmer', 
        instructions: 'Speak in clear, neutral Portuguese with natural flow. Emphasize proper pronunciation for language learners.' 
      }
    };

    const config = languageConfig[language?.toLowerCase()] || languageConfig['en'];
    
    const requestData = {
      model: options.model || 'tts-1',
      input: text,
      voice: options.voice || config.voice,
      response_format: options.responseFormat || 'wav',
      ...(options.speed && { speed: options.speed })
    };

    console.log('[TTS] Sending request to OpenAI:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer'
      }
    );

    console.log('[TTS] Response received, size:', response.data.byteLength);

    // Convert ArrayBuffer to base64
    const arrayBuffer = response.data;
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let base64 = '';
    
    try {
      // Safe method to convert to base64
      const chunks = [];
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        const chunkStr = Array.from(chunk).map(byte => String.fromCharCode(byte)).join('');
        chunks.push(Buffer.from(chunkStr, 'binary').toString('base64'));
      }
      
      base64 = chunks.join('');
      console.log('[TTS] Base64 conversion completed, size:', base64.length);
      
    } catch (error) {
      console.log('[TTS] Error in chunked conversion, trying alternative method...');
      // Alternative method
      try {
        base64 = Buffer.from(arrayBuffer).toString('base64');
        console.log('[TTS] Alternative conversion successful, size:', base64.length);
      } catch (altError) {
        console.error('[TTS] Error in alternative conversion:', altError);
        throw new Error('Could not convert audio to base64');
      }
    }
    
    if (!base64 || base64.length === 0) {
      throw new Error('Base64 conversion resulted in empty string');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        data: base64,
        size: arrayBuffer.byteLength,
        type: 'audio/wav'
      })
    };
    
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Error generating speech', 
        details: error.message 
      })
    };
  }
}; 