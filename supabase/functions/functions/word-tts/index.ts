import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 word-tts Edge Function iniciada')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      text,
      language = 'en',
      voice,
      speed = 1.0,
      format = 'mp3',
      instructions
    } = await req.json()

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is missing'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const selectedVoice = voice || pickVoiceForLanguage(String(language))

    console.log(`🔊 [WORD-TTS] "${text}" | lang=${language} | voice=${selectedVoice} | fmt=${format}`)

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        // You can also use 'gpt-4o-mini-tts' per docs. Keeping tts-1 for consistency.
        model: 'tts-1',
        input: text,
        voice: selectedVoice,
        response_format: format,
        speed: speed,
        ...(instructions ? { instructions } : {})
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText} ${errorText}`)
    }

    const audioData = await response.arrayBuffer()
    
    // Convert to base64 string safely (chunked to avoid call stack overflow)
    const bytes = new Uint8Array(audioData)
    const chunkSize = 0x8000
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    const base64Audio = btoa(binary)

    return new Response(
      JSON.stringify({ 
        audioData: base64Audio,
        format,
        voice: selectedVoice,
        language
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ [ERROR] word-tts:', error?.message || String(error))
    return new Response(
      JSON.stringify({ 
        error: 'Error generating word TTS',
        details: error?.message || String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function pickVoiceForLanguage(code: string): string {
  const c = code.toLowerCase()
  // Simple voice mapping by language preference
  const map: Record<string, string> = {
    en: 'alloy',
    es: 'coral',
    fr: 'fable',
    de: 'onyx',
    it: 'nova',
    pt: 'sage',
    ja: 'shimmer',
    ko: 'onyx',
    zh: 'ballad',
    ru: 'echo'
  }
  return map[c] || 'alloy'
}
