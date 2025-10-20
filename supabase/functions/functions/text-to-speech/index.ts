import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 text-to-speech Edge Function iniciada')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      text, 
      voice = 'alloy', 
      speed = 1.0,
      format = 'mp3' 
    } = await req.json()
    
    console.log(`🔊 [TTS] Generando audio para texto (${text.length} caracteres) con voz "${voice}"`)

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

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1', // Fast TTS model
        input: text,
        voice: voice,
        response_format: format,
        speed: speed
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText}`)
    }

    // Get the audio data as array buffer
    const audioData = await response.arrayBuffer()
    
    console.log(`✅ [SUCCESS] Audio generado (${audioData.byteLength} bytes)`)
    
    // Convert to base64 for JSON response (chunked to avoid call stack overflow)
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
        format: format,
        voice: voice,
        textLength: text.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [ERROR] Error in text-to-speech:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Error generating speech', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
