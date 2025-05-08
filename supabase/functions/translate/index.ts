import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { OpenAI } from 'npm:openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();

    if (!word || typeof word !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Word parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a precise English to Spanish translator. Respond with only the Spanish translation of the word, no additional text or explanation.',
        },
        {
          role: 'user',
          content: `Translate this English word to Spanish: "${word}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const translation = completion.choices[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ translation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});