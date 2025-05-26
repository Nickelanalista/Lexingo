exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      }
    };
  }

  try {
    const debugInfo = {
      openaiKeyExists: !!process.env.OPENAI_API_KEY,
      openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'undefined',
      openaiModel: process.env.OPENAI_MODEL || 'not-set',
      allEnvVars: Object.keys(process.env).filter(key => 
        key.includes('OPENAI') || key.includes('VITE')
      ),
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(debugInfo)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Debug error', 
        details: error.message 
      })
    };
  }
}; 