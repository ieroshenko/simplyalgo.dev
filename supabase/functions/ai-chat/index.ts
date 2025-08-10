import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

// Ambient declaration for Deno types (for editor/TS tooling)
// This does not affect runtime in the Supabase Edge environment.
declare const Deno: { env: { get(name: string): string | undefined } };

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
  // Optional action for smart insertion
  action?: 'insert_snippet';
  // Payload for insertion
  code?: string;
  snippet?: CodeSnippet;
  cursorPosition?: { line: number; column: number };
  // Optional problem test cases to condition the tutor (will be executed on Judge0)
  testCases?: unknown[];
}

interface AIResponse {
  response: string;
  codeSnippets?: CodeSnippet[];
}

// Initialize OpenAI client (will be created with proper error handling in the handler)
let openai: OpenAI;

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main conversation handler - generates AI response for general chat
 */
async function generateConversationResponse(
  message: string,
  problemDescription: string,
  conversationHistory: ChatMessage[],
  testCases?: unknown[]
): Promise<string> {
  const serializedTests = Array.isArray(testCases) && testCases.length > 0
    ? JSON.stringify(testCases)
    : undefined;
  const conversationPrompt = `
You are SimplyAlgo's AI coding tutor, helping students solve LeetCode-style problems step by step.

TEST EXECUTION CONTEXT:
- The student's code will be executed automatically on Judge0 against the official test cases.
- Do NOT ask the student to run tests or provide test cases.
- Do NOT ask about function scaffolding (e.g., self usage) or basic typing/import boilerplate unless the student explicitly asks.
- Provide hints first; only provide code if the student requests it or has shared code.
- Once you believe the student's solution is likely correct, then ask ONE follow-up about time and space complexity.

PROBLEM CONTEXT:
${problemDescription}

${serializedTests ? `PROBLEM TEST CASES (JSON):\n${serializedTests}\n` : ''}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT STUDENT MESSAGE:
"${message}"

Your role:
1. Provide helpful, educational guidance without giving away the complete solution.
2. Ask probing questions to help students think through the problem.
3. Explain concepts clearly and encourage good coding practices.
4. Give hints and suggestions when students are stuck.
5. Celebrate progress and provide constructive feedback.

Important constraints:
- Do NOT provide code (no code blocks, no pseudo-code) unless the student explicitly requests code or has shared their own code to review.
- If the student hasn't attempted an answer yet, respond with a clarifying question or a high-level hint (one at a time). Avoid revealing algorithmic answers prematurely.
- Prefer guiding the student to articulate their approach, constraints, and test cases before moving towards implementation details.
- If code is explicitly requested or provided, keep responses minimal and focused on the student's context (still avoid full solutions unless explicitly asked).

Respond naturally and conversationally. Focus on teaching and guiding rather than just providing answers.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful coding tutor. Be encouraging and educational. IMPORTANT: Do not provide code (no code blocks, no pseudo-code) unless the student explicitly asks for code or has shared code to review. Prefer questions and high-level hints first. Testing is handled automatically by Judge0 with official test cases — never ask the student to run tests, write tests, or provide test cases. You may discuss potential edge cases conceptually. Only after a likely-correct solution, ask one follow-up on time/space complexity."
      },
      {
        role: "user",
        content: conversationPrompt
      }
    ],
    temperature: 0.5,
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
  problemDescription: string,
  testCases?: unknown[]
): Promise<CodeSnippet[]> {
  // Only analyze if message clearly indicates code intent
  const hasExplicitCode = /```[\s\S]*?```|`[^`]+`/m.test(message);
  const explicitAsk = /\b(write|show|give|provide|insert|add|implement|code|import|define|declare|create)\b/i.test(message);
  const looksLikeCode = /^(\s*)(def|class)\s+\w+|^(\s*)\w+\s*=\s*.+|\b\w+\(.*\)|\bfrom\b\s+\w+\s+\bimport\b/m.test(message);
  const lastAssistant = (conversationHistory || []).slice().reverse().find(m => m.role === 'assistant')?.content?.trim() || '';
  const assistantJustAskedQuestion = /\?\s*$/.test(lastAssistant);

  // Gate strictly: only if the user pasted code, explicitly asked, or message looks like code
  const allowAnalysis = hasExplicitCode || explicitAsk || looksLikeCode;
  if (!allowAnalysis || (assistantJustAskedQuestion && !hasExplicitCode)) {
    return [];
  }

  const analysisPrompt = `
You are an expert coding tutor analyzing student code for a LeetCode-style problem.

PROBLEM CONTEXT:
${problemDescription}

${Array.isArray(testCases) && testCases.length > 0 ? `PROBLEM TEST CASES (JSON):\n${JSON.stringify(testCases)}\n` : ''}

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
- Syntactically correct Python code
- Logically appropriate for this specific problem
- Uses correct variable names from problem context
- Follows good coding practices

INSERTION INTELLIGENCE:
- **Imports**: Place at top of file, after existing imports
- **Variables**: Place at logical location within function scope  
- **Functions**: Place at module level with proper spacing
- **Statements**: Maintain proper indentation and control flow
- **Algorithm patterns**: Provide foundational setup code

STRICT AVOIDANCE:
- Do NOT propose incomplete control-flow headers without body (e.g., "for s in strs:", "if x:") unless the user explicitly asked for that exact header.
- Prefer concrete, context-safe statements (e.g., d[key].append(strs[i])) over scaffolding.

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
Respond with conceptual guidance only unless the student explicitly asks for code or pastes code.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 1000
    });

    let analysisResult;
    try {
      analysisResult = JSON.parse(
        response.choices[0]?.message?.content || '{"codeSnippets": []}'
      );
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }
    
    // Add unique IDs and validate structure
    const codeSnippets: CodeSnippet[] = (analysisResult.codeSnippets || []).map((snippet: Record<string, unknown>, index: number) => ({
      id: `snippet-${Date.now()}-${index}`,
      code: typeof snippet.code === 'string' ? snippet.code : '',
      language: typeof snippet.language === 'string' ? (snippet.language as string) : 'python',
      isValidated: typeof snippet.isValidated === 'boolean' ? (snippet.isValidated as boolean) : false,
      insertionType: typeof snippet.insertionType === 'string' ? (snippet.insertionType as any) : 'smart',
      insertionHint: {
        type: typeof (snippet as any).insertionHint?.type === 'string' ? (snippet as any).insertionHint.type : 'statement',
        scope: typeof (snippet as any).insertionHint?.scope === 'string' ? (snippet as any).insertionHint.scope : 'function',
        description: typeof (snippet as any).insertionHint?.description === 'string' ? (snippet as any).insertionHint.description : 'Code snippet'
      }
    }));

    // Filter validated and remove incomplete control-flow headers
    const validated = codeSnippets.filter(snippet => 
      snippet.code && snippet.code.trim().length > 0 && snippet.isValidated
    ).filter(snippet => {
      const c = snippet.code.trim();
      const incompleteHeader = /^(for\s+\w+\s+in\s+\w+\s*:\s*$)|(if\s+.+:\s*$)|(while\s+.+:\s*$)/.test(c);
      return !incompleteHeader;
    }).filter(snippet => {
      // Drop import suggestions unless the user explicitly asked about imports
      const isImportSnippet = (snippet.insertionHint?.type === 'import') || /^\s*(from\s+\S+\s+import\s+\S+|import\s+\S+)/.test(snippet.code);
      const explicitImportAsk = /\b(import|from\s+\w+\s+import|how\s+to\s+import)\b/i.test(message);
      return !isImportSnippet || explicitImportAsk;
    });

    // Dedupe within the same response
    const normalize = (s: CodeSnippet) => `${(s.insertionHint?.type || '')}|${(s.insertionHint?.scope || '')}|${(s.code || '').replace(/\s+/g, ' ').trim()}`;
    const seen = new Set<string>();
    const unique: CodeSnippet[] = [];
    for (const s of validated) {
      const key = normalize(s);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }
    return unique;
  } catch (error) {
    console.error('Error analyzing code snippets:', error);
    return [];
  }
}

/**
 * Use LLM to compute the best insertion point and return updated code
 */
async function insertSnippetSmart(
  code: string,
  snippet: CodeSnippet,
  problemDescription: string,
  cursorPosition?: { line: number; column: number }
): Promise<{ newCode: string; insertedAtLine?: number; rationale?: string }> {
  const prompt = `You are assisting with inserting a small code snippet into a student's Python solution file.

PROBLEM CONTEXT:
${problemDescription}

CURRENT FILE (Python):
---BEGIN FILE---
${code}
---END FILE---

SNIPPET TO INSERT (language=${snippet.language}, type=${snippet.insertionHint?.type || 'statement'}, scope=${snippet.insertionHint?.scope || 'function'}):
---BEGIN SNIPPET---
${snippet.code}
---END SNIPPET---

CURSOR POSITION (0-based line, column): ${cursorPosition ? `${cursorPosition.line},${cursorPosition.column}` : 'null'}

Task:
- Determine the best insertion location according to the snippet type/scope and code structure.
- Maintain valid Python syntax and correct indentation.
- Avoid duplicating existing code. If the snippet (normalized whitespace) already exists in the file, return the original code.
- If insertion is ambiguous, prefer placing inside the active function near the cursor when provided; otherwise, at a logical spot following Python best practices.

Output strictly as JSON (no markdown):
{
  "newCode": "<entire updated file content>",
  "insertedAtLine": <0-based line index where first line of snippet was inserted or -1 if unchanged>,
  "rationale": "<brief explanation>"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a precise code editing assistant. Always return valid JSON with the full updated file content.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 2000
  });

  try {
    const content = response.choices[0]?.message?.content || '{"newCode":"","insertedAtLine":-1}';
    const parsed = JSON.parse(content);
    return {
      newCode: typeof parsed.newCode === 'string' ? parsed.newCode : code,
      insertedAtLine: typeof parsed.insertedAtLine === 'number' ? parsed.insertedAtLine : undefined,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : undefined
    };
  } catch {
    return { newCode: code };
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
    const body: RequestBody = await req.json();
    const { message, problemDescription, conversationHistory, action, code, snippet, cursorPosition, testCases } = body;

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

    // Smart insertion action
    if (req.method === 'POST' && (action === 'insert_snippet')) {
      if (!code || !snippet) {
        return new Response(
          JSON.stringify({ error: 'Missing code or snippet for insert_snippet action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = await insertSnippetSmart(code, snippet, problemDescription, cursorPosition);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default chat behavior: generate conversation + analyze snippets
    const [conversationResponse, codeSnippets] = await Promise.all([
      generateConversationResponse(message, problemDescription, conversationHistory || [], testCases),
      analyzeCodeSnippets(message, conversationHistory || [], problemDescription, testCases)
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