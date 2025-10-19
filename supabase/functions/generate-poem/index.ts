import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, poemType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating poem about:', topic, 'type:', poemType);

    // Define poem structures
    const poemStructures: Record<string, string> = {
      sonnet: "a 14-line sonnet with Shakespearean rhyme scheme (ABAB CDCD EFEF GG)",
      haiku: "a traditional haiku with 3 lines following the 5-7-5 syllable pattern",
      limerick: "a humorous limerick with 5 lines and AABBA rhyme scheme",
      villanelle: "a 19-line villanelle with repeating lines and two rhymes throughout",
      ode: "a lyrical ode with elevated language and formal structure",
      ballad: "a narrative ballad with rhythm and rhyme, telling a dramatic story",
      epic: "an epic poem telling a grand story with elevated style"
    };

    const structure = poemStructures[poemType] || "a poem";
    
    const systemPrompt = `You are a talented poet. Generate beautiful, creative poems based on the user's topic and poem type. Focus on vivid imagery, emotional depth, and proper form. Return ONLY the poem text, no additional commentary or explanation.`;
    
    const userPrompt = `Write ${structure} about "${topic}". Make it beautiful and evocative.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
    }

    const data = await response.json();
    const poem = data.choices[0].message.content;

    console.log('Generated poem successfully');

    return new Response(
      JSON.stringify({ poem }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-poem function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
