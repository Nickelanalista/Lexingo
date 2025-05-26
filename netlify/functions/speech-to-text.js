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
    const { audio, language = 'auto' } = JSON.parse(event.body);
    
    if (!audio) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Audio data is required' })
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('[ERROR] OPENAI_API_KEY not found in environment');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is missing'
        })
      };
    }

    console.log('[STT] Procesando transcripción de audio...');
    console.log('[STT] Language:', language);
    console.log('[STT] Audio data length:', audio.length);

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Create FormData for multipart/form-data request
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });
    form.append('model', 'whisper-1');
    
    // Only add language if it's not auto-detect
    if (language && language !== 'auto') {
      form.append('language', language);
    }

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const transcription = response.data.text || '';
    
    console.log('[STT] Transcripción exitosa:', transcription.substring(0, 100) + '...');
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        result: transcription,
        language: response.data.language || language
      })
    };
    
  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Error transcribing audio', 
        details: error.message 
      })
    };
  }
}; 