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
    const { topic, poemType, generateTopic, recentTopics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle random topic generation
    if (generateTopic) {
      console.log('Generating random topic, avoiding:', recentTopics?.slice(0, 5));
      
      const avoidList = recentTopics && recentTopics.length > 0 
        ? `\n\nDo NOT suggest any of these recently used topics: ${recentTopics.slice(0, 15).join(', ')}`
        : '';
      
      const topicResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You generate names of famous songs, poems, novels, and plays. Return ONLY the work title with artist/author, nothing else. No quotes, no extra text.' 
            },
            { 
              role: 'user', 
              content: `Give me one random topic. 80% of the time, choose a famous song, poem, novel, or play (include the artist or author name). 20% of the time, generate a completely random whimsical scenario. Examples of famous works: "Bohemian Rhapsody" by Queen, "The Raven" by Edgar Allan Poe, "Pride and Prejudice" by Jane Austen, "Romeo and Juliet" by Shakespeare. Examples of random scenarios: "green lizards eating pizza", "dancing robots in a library", "cats teaching yoga"${avoidList}` 
            }
          ],
        }),
      });

      if (!topicResponse.ok) {
        const errorText = await topicResponse.text();
        console.error('Topic generation error:', topicResponse.status, errorText);
        
        if (topicResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (topicResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to generate random topic. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const topicData = await topicResponse.json();
      console.log('Topic response data:', JSON.stringify(topicData));
      
      if (!topicData.choices || !topicData.choices[0] || !topicData.choices[0].message) {
        console.error('Invalid topic response structure:', topicData);
        return new Response(
          JSON.stringify({ error: 'Invalid response from AI. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const generatedTopic = topicData.choices[0].message.content.trim();

      console.log('Generated topic:', generatedTopic);

      return new Response(
        JSON.stringify({ topic: generatedTopic }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating poem about:', topic, 'type:', poemType);

    // Define poem structures
    const poemStructures: Record<string, string> = {
      sonnet: "a 14-line sonnet with Shakespearean rhyme scheme (ABAB CDCD EFEF GG)",
      haiku: "a traditional haiku with 3 lines following the 5-7-5 syllable pattern",
      limerick: "a humorous limerick with 5 lines and AABBA rhyme scheme",
      villanelle: "a 19-line villanelle with repeating lines and two rhymes throughout",
      ode: "a formal ode with multiple stanzas using elevated, lyrical language and consistent meter, addressing the subject with reverence",
      ballad: "a narrative ballad with rhythm and rhyme, telling a dramatic story",
      epic: "an epic poem with multiple stanzas in heroic verse, using elevated diction, grand imagery, and formal meter to tell an expansive story"
    };

    const structure = poemStructures[poemType] || "a poem";
    
    const systemPrompt = `You are a master poet who rewrites existing songs and poems into different poetic forms. You take the actual content, themes, and imagery from the original work and transform them into the requested structure. Keep the essence and key elements of the original while adapting the form. Return ONLY the poem text.`;
    
    const userPrompt = `Take the song/work "${topic}" and rewrite it as ${structure}. Use the actual themes, imagery, and story from the original work, but express them in the formal style and structure of this poetic form. For epics, use heroic verse and elevated diction while retelling the original content. Maintain what the original is about while transforming how it's expressed.`;

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
    console.log('Poem response data:', JSON.stringify(data));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid poem response structure:', data);
      throw new Error('Invalid response from AI. Please try again.');
    }
    
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
