import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 speech-to-text Edge Function iniciada')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      audioData, 
      language = 'es',
      format = 'mp3' 
    } = await req.json()
    
    console.log(`🎤 [STT] Procesando audio en formato ${format} para idioma ${language}`)

    if (!audioData) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
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

    // Convert base64 to audio file for OpenAI
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
    
    // Create form data for OpenAI API
    const formData = new FormData()
    // Map common formats to correct MIME types for Whisper
    const formatLower = String(format).toLowerCase()
    const mime =
      formatLower === 'mp3' ? 'audio/mpeg' :
      formatLower === 'wav' ? 'audio/wav' :
      formatLower === 'm4a' ? 'audio/mp4' :
      formatLower === 'aac' ? 'audio/aac' :
      formatLower === 'webm' ? 'audio/webm' :
      formatLower === 'ogg' ? 'audio/ogg' : `audio/${formatLower}`
    // Prefer File over Blob so the backend gets a filename
    const audioFile = new File([audioBuffer], `audio.${formatLower}`, { type: mime })
    formData.append('file', audioFile)

    // Prefer newer model with better quality
    let model = 'gpt-4o-mini-transcribe'
    let response: Response | null = null

    // First attempt with gpt-4o-mini-transcribe (limited params; don't send language; default JSON)
    {
      const fd = new FormData()
      fd.append('file', audioFile)
      fd.append('model', model)
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}` },
        body: fd
      })
    }

    // Fallback to whisper-1 if first attempt fails
    if (!response.ok) {
      const err1 = await response.text().catch(() => '')
      console.warn(`⚠️ [STT] gpt-4o-mini-transcribe failed: ${err1}`)
      const fd2 = new FormData()
      fd2.append('file', audioFile)
      fd2.append('model', 'whisper-1')
      fd2.append('language', language === 'es' ? 'es' : 'en')
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}` },
        body: fd2
      })
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`OpenAI STT API error: ${response.status} ${response.statusText} ${errText}`)
    }

    const data = await response.json()
    const transcription = data.text || ''
    
    console.log(`✅ [SUCCESS] Transcripción completada: "${transcription.substring(0, 50)}..."`)
    
    return new Response(
      JSON.stringify({ result: transcription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [ERROR] Error in speech-to-text:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Error processing speech to text', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
