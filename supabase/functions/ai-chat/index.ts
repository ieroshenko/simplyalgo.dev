import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

// Types
interface CodeSnippet {
  id: string;
  code: string;
  language: string;
  isValidated: boolean;
  insertionType: 'smart' | 'cursor' | 'append' | 'prepend' | 'replace';
  insertionHint?: {
    type: 'import' | 'variable' | 'function' | 'statement' | 'class';
    scope: 'global' | 'function' | 'class';
    description: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  problemDescription: string;
  conversationHistory: ChatMessage[];
}

interface AIResponse {
  response: string;
  codeSnippets?: CodeSnippet[];
}

// Initialize OpenAI client (will be created with proper error handling in the handler)
let openai: OpenAI;

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main conversation handler - generates AI response for general chat
 */
async function generateConversationResponse(
  message: string,
  problemDescription: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const conversationPrompt = `
You are SimplyAlgo's AI coding tutor, helping students solve LeetCode-style problems step by step.

PROBLEM CONTEXT:
${problemDescription}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT STUDENT MESSAGE:
"${message}"

Your role:
1. Provide helpful, educational guidance without giving away the complete solution
2. Ask probing questions to help students think through the problem
3. Explain concepts clearly and encourage good coding practices  
4. Give hints and suggestions when students are stuck
5. Celebrate progress and provide constructive feedback

Respond naturally and conversationally. Focus on teaching and guiding rather than just providing answers.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful coding tutor. Be encouraging, educational, and guide students to discover solutions themselves."
      },
      {
        role: "user",
        content: conversationPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
}

/**
 * Code analysis handler - analyzes student messages for insertable code snippets
 */
async function analyzeCodeSnippets(
  message: string,
  conversationHistory: ChatMessage[],
  problemDescription: string
): Promise<CodeSnippet[]> {
  // Only analyze if message contains potential code
  const hasCodeIndicators = /```|`[^`]+`|\w+\s*=|\w+\(|\bimport\b|\bfrom\b|\bdef\b|\bclass\b|\bif\b|\bfor\b|\bwhile\b/.test(message);
  
  if (!hasCodeIndicators) {
    return [];
  }

  const analysisPrompt = `
You are an expert coding tutor analyzing student code for a LeetCode-style problem.

PROBLEM CONTEXT:
${problemDescription}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT STUDENT MESSAGE:
"${message}"

TASK: Analyze the student's message for any code snippets that could be added to their code editor. Look for:

1. **Code in backticks or code blocks** - Extract and validate syntax
2. **Variable declarations mentioned** - e.g., "I need counter = Counter(word)"
3. **Import statements discussed** - e.g., "Should I import Counter?"
4. **Function calls or logic suggested** - e.g., "What about len(s) == len(t)?"
5. **Algorithm patterns mentioned** - e.g., "two pointers", "sliding window"

VALIDATION CRITERIA:
- ✅ Syntactically correct Python code
- ✅ Logically appropriate for this specific problem
- ✅ Uses correct variable names from problem context
- ✅ Follows good coding practices

INSERTION INTELLIGENCE:
- **Imports**: Place at top of file, after existing imports
- **Variables**: Place at logical location within function scope  
- **Functions**: Place at module level with proper spacing
- **Statements**: Maintain proper indentation and control flow
- **Algorithm patterns**: Provide foundational setup code

RESPONSE FORMAT (JSON only, no markdown):
{
  "codeSnippets": [
    {
      "id": "unique-identifier",
      "code": "exact_code_to_insert",
      "language": "python",
      "isValidated": true,
      "insertionType": "smart",
      "insertionHint": {
        "type": "import|variable|function|statement|class",
        "scope": "global|function|class",
        "description": "Clear explanation of what this code accomplishes"
      }
    }
  ]
}

EXAMPLES:

Student: "I think I need Counter from collections"
Response: Include import snippet + usage example

Student: "What about freq = Counter(s)?"  
Response: Validate syntax, provide Counter import if needed, mark as insertable

Student: "Maybe if char in seen:"
Response: Provide complete conditional logic with proper indentation

Student: "Two pointers approach?"
Response: Provide left, right pointer initialization

IMPORTANT: Only include snippets that are syntactically correct and solve part of this specific problem. Return empty array if no valid code found.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 1000
    });

    const analysisResult = JSON.parse(response.choices[0]?.message?.content || '{"codeSnippets": []}');
    
    // Add unique IDs and validate structure
    const codeSnippets: CodeSnippet[] = (analysisResult.codeSnippets || []).map((snippet: any, index: number) => ({
      id: `snippet-${Date.now()}-${index}`,
      code: snippet.code || '',
      language: snippet.language || 'python',
      isValidated: snippet.isValidated || false,
      insertionType: snippet.insertionType || 'smart',
      insertionHint: {
        type: snippet.insertionHint?.type || 'statement',
        scope: snippet.insertionHint?.scope || 'function',
        description: snippet.insertionHint?.description || 'Code snippet'
      }
    }));

    return codeSnippets.filter(snippet => 
      snippet.code.trim().length > 0 && snippet.isValidated
    );
  } catch (error) {
    console.error('Error analyzing code snippets:', error);
    return [];
  }
}

/**
 * CORS headers for all responses
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '3600',
};

/**
 * Main handler function
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API key and initialize client
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          message: 'OpenAI API key is not configured' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize OpenAI client with the validated key
    openai = new OpenAI({
      apiKey: openaiKey,
    });
    // Parse request body
    const { message, problemDescription, conversationHistory }: RequestBody = await req.json();

    // Validate required fields
    if (!message || !problemDescription) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message, problemDescription' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate main conversation response and analyze code snippets in parallel
    const [conversationResponse, codeSnippets] = await Promise.all([
      generateConversationResponse(message, problemDescription, conversationHistory || []),
      analyzeCodeSnippets(message, conversationHistory || [], problemDescription)
    ]);

    const aiResponse: AIResponse = {
      response: conversationResponse,
      codeSnippets: codeSnippets.length > 0 ? codeSnippets : undefined
    };

    return new Response(
      JSON.stringify(aiResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});