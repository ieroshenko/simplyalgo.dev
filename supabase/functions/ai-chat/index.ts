
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPEN_AI_API_KEY');

console.log('OpenAI API Key exists:', !!openAIApiKey);
console.log('OpenAI API Key length:', openAIApiKey?.length || 0);
console.log('OpenAI API Key prefix:', openAIApiKey?.substring(0, 7) || 'none');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, problemDescription, conversationHistory } = await req.json();
    
    if (!openAIApiKey) {
      console.error('OpenAI API key is missing');
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an AI coding tutor helping students solve LeetCode-style problems. Your role is to guide students through problem-solving without giving direct solutions.

PROBLEM DESCRIPTION:
${problemDescription}

INSTRUCTIONS:
- Help me solve this problem one step at a time
- Do not give me solutions, just ask questions to guide me in the right direction
- Ask me one question at a time
- Focus on helping me understand the problem, think about edge cases, consider different approaches, and guide me toward the solution
- If I ask about Python syntax or show code, help me with syntax and logic issues
- Be encouraging and educational
- Only work with Python code`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    console.log('OpenAI Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
