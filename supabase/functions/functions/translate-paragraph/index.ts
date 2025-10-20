import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 translate-paragraph Edge Function iniciada')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, sourceLanguageCode, targetLanguageCode } = await req.json()
    
    console.log(`🔄 [TRANSLATE-PARAGRAPH] Traduciendo párrafo de ${sourceLanguageCode} a ${targetLanguageCode}`)

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
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

    // Get language names for the prompt
    const sourceLanguageName = getLanguageNameInEnglish(sourceLanguageCode)
    const targetLanguageName = getLanguageNameInEnglish(targetLanguageCode)
    
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
            content: `You are an expert translator. ${sourceLanguageCode === 'auto' ? 'First, detect the source language of the provided text.' : `The source language is ${sourceLanguageName}.`} Translate the following text to ${targetLanguageName} accurately and naturally, preserving the original format (line breaks, paragraphs). If the text is already in ${targetLanguageName}, return it unchanged. Respond ONLY with the translation, no explanations.`
          },
          {
            role: 'user',
            content: `${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content?.trim() || ''
    
    console.log(`✅ [SUCCESS] Traducción de párrafo completada (${text.length} → ${result.length} caracteres)`)
    
    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [ERROR] Error in translate-paragraph:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Error translating paragraph', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to get language name in English
function getLanguageNameInEnglish(code: string): string {
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
