import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 ai-chat Edge Function iniciada')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      message, 
      context, 
      bookTitle, 
      currentPage, 
      language = 'es',
      history = []
    } = await req.json()
    
    console.log(`🤖 [AI-CHAT] Procesando mensaje para libro "${bookTitle}" (página ${currentPage})`)

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
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

    // Build system prompt oriented as a translation teacher focused on grammar
    const systemPrompt = `You are Lexingo AI, a translation teacher and grammar coach. Always respond in ${getLanguageName(language)}.

Focus area:
- Explain grammar, conjugation, syntax, idioms, and nuances found in the provided context
- Provide brief, practical examples and alternatives
- If asked, offer translation hints, common mistakes, and memory tips
- Keep a helpful, didactic tone (teacher-like), concise and structured

Context policy:
- Use ONLY the provided page excerpt as primary context (not the whole book). Do not invent content beyond it.
- If the question is unrelated to the excerpt, answer generally but stay brief.

Output guidelines:
- Respond in ${getLanguageName(language)}
- Use short paragraphs and bullet points when useful
- Include mini conjugation or pattern tables when talking about verbs
- Include 1–2 short examples (in original language + ${getLanguageName(language)} when relevant)
- If appropriate, finish with a brief follow-up question to keep learning going

Book metadata (optional):
- Book: "${bookTitle || 'N/A'}"
- Current page: ${currentPage ?? 'N/A'}`

    // Prepare messages for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ]

    // Add context if provided
    if (context && String(context).trim()) {
      messages.push({
        role: 'system', 
        content: `Current page content for reference (keep private, use only for answers):\n\n"${String(context).slice(0, 4000)}${String(context).length > 4000 ? '…' : ''}"`
      })
    }

    // Add prior chat history if provided (assistant/user turns only)
    if (Array.isArray(history)) {
      for (const h of history) {
        if (!h || !h.role || !h.content) continue
        if (h.role === 'user' || h.role === 'assistant') {
          messages.push({ role: h.role, content: String(h.content).slice(0, 2000) })
        }
      }
    }

    // Add user message
    messages.push({ role: 'user', content: String(message) })

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective model
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content?.trim() || 'Lo siento, no pude procesar tu consulta.'
    
    console.log(`✅ [SUCCESS] Respuesta de IA generada (${result.length} caracteres)`)
    
    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [ERROR] Error in ai-chat:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Error processing AI chat', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to get language name
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
    'ko': 'Korean'
  }
  return languages[code.toLowerCase()] || 'Spanish'
}
