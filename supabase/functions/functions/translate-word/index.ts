import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 translate-word Edge Function iniciada')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { word, sourceLanguageCode, targetLanguageCode = 'es' } = await req.json()
    
    console.log(`🔄 [TRANSLATE-WORD] Traduciendo palabra: "${word}" de ${sourceLanguageCode} a ${targetLanguageCode}`)

    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is missing'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Detect language if auto
    let sourceLanguage = sourceLanguageCode
    let detectedLanguage = ''
    
    if (sourceLanguageCode === 'auto') {
      // Simple language detection logic
      detectedLanguage = detectLanguageLocally(word)
      sourceLanguage = detectedLanguage
      console.log(`🔍 [DETECT] Idioma detectado: ${detectedLanguage}`)
    }

    // Skip translation if already in target language
    if (sourceLanguage === targetLanguageCode) {
      console.log('✅ [SKIP] No necesita traducción, ya está en el idioma objetivo')
      const result = detectedLanguage ? {
        text: word,
        detectedSourceLanguage: detectedLanguage
      } : word
      
      return new Response(
        JSON.stringify({ result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Translate using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cheap model
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given word from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguageCode)} accurately and concisely. Respond only with the translated word, no explanations.`
          },
          {
            role: 'user',
            content: `Translate this word from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguageCode)}: "${word}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const translatedText = data.choices[0]?.message?.content?.trim() || ''
    
    console.log(`✅ [SUCCESS] Traducción completada: "${word}" → "${translatedText}"`)
    
    const result = detectedLanguage ? {
      text: translatedText,
      detectedSourceLanguage: detectedLanguage
    } : translatedText
    
    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [ERROR] Error in translate-word:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Error translating word', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper functions
function detectLanguageLocally(text: string): string {
  if (!text || text.trim().length < 5) return 'en'
  
  const lowerText = text.toLowerCase()
  
  // Strong indicators for Spanish
  const spanishChars = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡']
  const hasSpanishChars = spanishChars.some(char => lowerText.includes(char))
  
  if (hasSpanishChars) return 'es'
  
  // Common Spanish words
  const spanishWords = [' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' de ', ' en ', ' con ', ' por ', ' para ', ' que ', ' muy ', ' más ', ' está ', ' son ']
  const spanishMatches = spanishWords.filter(word => lowerText.includes(word)).length
  
  // Common English words
  const englishWords = [' the ', ' a ', ' an ', ' of ', ' in ', ' on ', ' at ', ' by ', ' for ', ' with ', ' is ', ' are ', ' was ', ' were ', ' have ', ' has ']
  const englishMatches = englishWords.filter(word => lowerText.includes(word)).length
  
  return spanishMatches > englishMatches + 2 ? 'es' : 'en'
}

function getLanguageName(code: string): string {
  const languages: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish', 
    'it': 'Italian',
    'fr': 'French',
    'ja': 'Japanese',
    'de': 'German',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'ko': 'Korean',
    'auto': 'auto-detect'
  }
  return languages[code.toLowerCase()] || code.toUpperCase()
}