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
  // Optional explicit diagram request
  diagram?: boolean;
  // Preferred engines order for diagram generation
  preferredEngines?: Array<'reactflow' | 'mermaid'>;
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
  diagram?:
    | { engine: 'mermaid'; code: string; title?: string }
    | { engine: 'reactflow'; graph: { nodes: Array<{ id: string; type?: string; data: { label: string }; position: { x: number; y: number } }>; edges: Array<{ id: string; source: string; target: string; label?: string }> }; title?: string };
  suggestDiagram?: boolean;
  diagramDebug?: {
    tried: Array<'reactflow' | 'mermaid'>;
    reactflow?: { ok: boolean; reason?: string };
    mermaid?: { ok: boolean; reason?: string };
  };
}

// Initialize OpenAI client (will be created with proper error handling in the handler)
let openai: OpenAI;

// Model selection via env var; default to o3-mini if not set
const configuredModel = (Deno.env.get('OPENAI_MODEL') || 'o3-mini').trim();
const modelSource = Deno.env.get('OPENAI_MODEL') ? 'OPENAI_MODEL env set' : 'defaulted to o3-mini (no OPENAI_MODEL)';
const useResponsesApi = /^(gpt-5|o3)/i.test(configuredModel);

// Unified LLM callers (supports Responses API for gpt-5/o3 and falls back to Chat Completions)
async function llmText(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; responseFormat?: 'json_object' | undefined }
): Promise<string> {
  const model = configuredModel;
  if (useResponsesApi) {
    // Try configured Responses model first, then o3-mini, then fall back to Chat API
    const responseModels = [model, 'o3-mini'].filter((v, i, a) => a.indexOf(v) === i);
    for (const respModel of responseModels) {
      try {
        console.log(`[ai-chat] Using Responses API with model=${respModel}`);
        const req: Record<string, unknown> = {
          model: respModel,
          input: prompt,
          // temperature is not supported by some Responses models (e.g., gpt-5), so omit it entirely
          max_output_tokens: typeof opts.maxTokens === 'number' ? opts.maxTokens : undefined,
        };
        if (/^gpt-5/i.test(respModel)) {
          req.reasoning = { effort: 'minimal' };
          req.text = {
            verbosity: opts.responseFormat ? 'low' : 'medium',
            ...(opts.responseFormat ? { format: { type: 'json_object' } } : {}),
          };
        } else if (/^o3/i.test(respModel)) {
          req.reasoning = { effort: 'medium' };
          // o3 may ignore text.verbosity; omit for safety
        }
        const response = await openai.responses.create(req as unknown as {
          output_text?: string;
          output?: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string }> }>;
          choices?: Array<{ message?: { content?: string } }>;
        } );
        let text: string = 'output_text' in (response as Record<string, unknown>) && typeof (response as Record<string, unknown>).output_text === 'string'
          ? ((response as unknown as { output_text: string }).output_text)
          : '';
        const output: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string }> }> = 'output' in (response as Record<string, unknown>)
          ? ((response as unknown as { output: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string }> }> }).output)
          : [];
        if (!text && Array.isArray(output)) {
          for (const item of output) {
            const content = Array.isArray(item?.content) ? item.content : [];
            for (const c of content) {
              const type = c?.type;
              const textField = c?.text as unknown;
              const nestedValue = (textField && typeof textField === 'object' && 'value' in (textField as Record<string, unknown>)
                ? (textField as { value?: string }).value
                : undefined);
              if (type === 'output_text' && typeof nestedValue === 'string') {
                text += nestedValue;
              } else if (type === 'text') {
                if (typeof textField === 'string') text += textField;
                else if (typeof nestedValue === 'string') text += nestedValue;
              }
            }
          }
        }
        const choices: Array<{ message?: { content?: string } }> = 'choices' in (response as Record<string, unknown>)
          ? ((response as unknown as { choices: Array<{ message?: { content?: string } }> }).choices)
          : [];
        if (!text && choices?.[0]?.message?.content) {
          text = choices[0].message!.content || '';
        }
        const finalText = (text || '').toString();
        if (finalText.trim().length > 0) {
          return finalText;
        }
        console.warn(`[ai-chat] Responses API returned empty text for model=${respModel}; trying next option...`);
        continue;
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        console.warn(`[ai-chat] Responses API failed for model=${respModel}. ${err?.name || ''}: ${err?.message || ''}`);
        continue;
      }
    }
    console.warn(`[ai-chat] All Responses API attempts failed; falling back to Chat Completions.`);
  }
  const chatModel = useResponsesApi ? 'gpt-4o-mini' : model;
  console.log(`[ai-chat] Using Chat Completions API with model=${chatModel} (fallback=${useResponsesApi ? 'yes' : 'no'})`);
  const chat = await openai.chat.completions.create({
    model: chatModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 500,
    response_format: opts.responseFormat ? ({ type: opts.responseFormat } as { type: 'json_object' }) : undefined,
  } as unknown as { choices: Array<{ message?: { content?: string } }> });
  return chat.choices[0]?.message?.content || '';
}

async function llmJson(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return await llmText(prompt, {
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    responseFormat: 'json_object',
  });
}

/**
 * Fast JSON helper: force a lightweight, fast model for tool-style calls
 */
async function llmJsonFast(
  prompt: string,
  opts?: { maxTokens?: number }
): Promise<string> {
  // Prefer Responses API for gpt-5-mini, fall back to Chat Completions with gpt-4o-mini
  try {
    console.log('[ai-chat] llmJsonFast using Responses API with model=gpt-5-mini');
    const req: Record<string, unknown> = {
      model: 'gpt-5-mini',
      input: prompt,
      max_output_tokens: typeof opts?.maxTokens === 'number' ? opts.maxTokens : 600,
      text: { verbosity: 'low', format: { type: 'json_object' } },
      reasoning: { effort: 'minimal' },
    };
    const response = await openai.responses.create(req as unknown as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string }> }>;
    });
    let text: string = (response as unknown as { output_text?: string }).output_text || '';
    const output: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string }> }> =
      (response as unknown as { output?: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string }> }> }).output || [];
    if (!text && Array.isArray(output)) {
      for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const c of content) {
          const type = (c as { type?: string })?.type;
          const textField = (c as { text?: { value?: string } | string })?.text as unknown;
          const nestedValue = (textField && typeof textField === 'object' && 'value' in (textField as Record<string, unknown>)
            ? (textField as { value?: string }).value
            : undefined);
          if (type === 'output_text' && typeof nestedValue === 'string') {
            text += nestedValue;
          } else if (type === 'text') {
            if (typeof textField === 'string') text += textField;
            else if (typeof nestedValue === 'string') text += nestedValue;
          }
        }
      }
    }
    return text;
  } catch (err) {
    console.warn('[ai-chat] llmJsonFast gpt-5-mini Responses failed; falling back to gpt-4o-mini Chat. Error:', err);
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      max_tokens: opts?.maxTokens ?? 600,
      response_format: { type: 'json_object' } as { type: 'json_object' },
    } as unknown as { choices: Array<{ message?: { content?: string } }> });
    return chat.choices[0]?.message?.content || '';
  }
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (if service role key is provided) for maintenance actions like clearing chat
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : supabase;

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

  const systemGuidance = "You are a helpful coding tutor. Be encouraging and educational. IMPORTANT: Do not provide code (no code blocks, no pseudo-code) unless the student explicitly asks for code or has shared code to review. Prefer questions and high-level hints first. The student's code is auto-run on Judge0 with official tests; avoid asking them to run tests or provide test cases. Only after a likely-correct solution, ask one follow-up on time/space complexity.";
  const combined = `${systemGuidance}\n\n${conversationPrompt}`;
  const text = await llmText(combined, { temperature: 0.7, maxTokens: 500 });
  return text || "I'm sorry, I couldn't generate a response. Please try again.";
}

// React Flow types and validator
type FlowNode = { id: string; type?: string; data: { label: string }; position: { x: number; y: number } };
type FlowEdge = { id: string; source: string; target: string; label?: string };
type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

function validateFlowGraph(graph: unknown): graph is FlowGraph {
  if (!graph || typeof graph !== 'object') return false;
  const g = graph as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) return false;
  const idSet = new Set<string>();
  for (const n of g.nodes) {
    const node = n as FlowNode;
    if (!node || typeof node.id !== 'string') return false;
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') return false;
    if (!node.data || typeof node.data.label !== 'string') return false;
    if (idSet.has(node.id)) return false;
    idSet.add(node.id);
  }
  for (const e of g.edges) {
    const edge = e as FlowEdge;
    if (!edge || typeof edge.id !== 'string' || typeof edge.source !== 'string' || typeof edge.target !== 'string') return false;
  }
  return true;
}

/**
 * Try to generate a React Flow diagram first; fallback to Mermaid
 */
async function maybeGenerateDiagram(
  message: string,
  problemDescription: string,
  conversationHistory: ChatMessage[],
  force = false,
  preferredEngines?: Array<'reactflow' | 'mermaid'>
): Promise<
  | { engine: 'reactflow'; graph: FlowGraph; title?: string }
  | { engine: 'mermaid'; code: string; title?: string }
  | undefined
> {
  const wantsDiagram = /\b(visualize|diagram|draw|show.*diagram|mermaid|flow|graph)\b/i.test(message);
  if (!force && !wantsDiagram) return undefined;
  const engineOrder: Array<'reactflow' | 'mermaid'> = Array.isArray(preferredEngines) && preferredEngines.length
    ? Array.from(new Set(preferredEngines.concat(['reactflow', 'mermaid'] as const))) as Array<'reactflow' | 'mermaid'>
    : ['reactflow', 'mermaid'];

  const rfPrompt = `You will output a React Flow graph JSON that visualizes the algorithm discussed.
STRICT OUTPUT FORMAT: Return JSON only with this schema:
{ "reactflow": { "nodes": [{ "id": "n1", "type": "default", "data": { "label": "Start" }, "position": { "x": 0, "y": 0 } }], "edges": [{ "id": "e1", "source": "n1", "target": "n2", "label": "next" }] } }
Rules:
- Max 40 nodes.
- Keep labels concise; no code in labels.
- Provide reasonable positions (x,y in pixels).
- Node ids and edge ids must be unique strings.
- No HTML in labels.

Context:
Problem: ${problemDescription}
Recent conversation:\n${conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}
Current user request: ${message}`;

  // Attempt functions
  const tryReactFlow = async (): Promise<{ ok: true; diagram: { engine: 'reactflow'; graph: FlowGraph } } | { ok: false; reason: string }> => {
    let raw = '';
    try {
      raw = (await llmJson(rfPrompt, { temperature: 0.2, maxTokens: 700 })).trim();
    } catch (e) {
      try {
        raw = (await llmText(rfPrompt, { temperature: 0.2, maxTokens: 700 })).trim();
      } catch (e2) {
        return { ok: false, reason: `Responses+fallback failed: ${(e2 as Error)?.message || 'unknown error'}` };
      }
    }
    if (!raw) return { ok: false, reason: 'Empty response for reactflow JSON' };
    try {
      const parsed = JSON.parse(raw);
      const rf = (parsed && parsed.reactflow) ? parsed.reactflow : undefined;
      if (!rf) return { ok: false, reason: 'Missing reactflow key in JSON' };
      if (validateFlowGraph(rf)) {
        return { ok: true, diagram: { engine: 'reactflow', graph: rf } };
      }
      return { ok: false, reason: 'Schema validation failed' };
    } catch (parseErr) {
      return { ok: false, reason: `Invalid JSON: ${(parseErr as Error)?.message || 'parse error'}` };
    }
  };

  const mermaidPrompt = `You will output a Mermaid diagram that visualizes the algorithm discussed.
STRICT OUTPUT FORMAT: Return JSON only (no markdown, no prose) with this schema: { "mermaid": "<diagram>" }
Rules for the diagram:
- Use flowchart LR unless another type is clearly better.
- Keep under 50 nodes.
- Avoid htmlLabels and raw HTML.
- Use concise node labels.

Context:
Problem: ${problemDescription}
Recent conversation:\n${conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}
Current user request: ${message}`;

  const tryMermaid = async (): Promise<{ ok: true; diagram: { engine: 'mermaid'; code: string } } | { ok: false; reason: string }> => {
    let mermaidRaw = '';
    try {
      mermaidRaw = (await llmJson(mermaidPrompt, { temperature: 0.2, maxTokens: 700 })).trim();
    } catch (e) {
      try {
        mermaidRaw = (await llmText(mermaidPrompt, { temperature: 0.2, maxTokens: 700 })).trim();
      } catch (e2) {
        return { ok: false, reason: `Responses+fallback failed: ${(e2 as Error)?.message || 'unknown error'}` };
      }
    }
    if (!mermaidRaw) return { ok: false, reason: 'Empty response for mermaid JSON' };
    let mermaidCode = '';
    try {
      const parsed = JSON.parse(mermaidRaw);
      if (parsed && typeof parsed.mermaid === 'string') {
        mermaidCode = String(parsed.mermaid);
      }
    } catch (parseErr) {
      const fence = mermaidRaw.match(/```mermaid([\s\S]*?)```/i);
      if (fence && fence[1]) {
        mermaidCode = fence[1];
      } else if (/flowchart\s+LR|graph\s+LR/i.test(mermaidRaw)) {
        mermaidCode = mermaidRaw;
      } else {
        return { ok: false, reason: `Invalid JSON and no fence: ${(parseErr as Error)?.message || 'parse error'}` };
      }
    }
    const sanitized = (mermaidCode || '')
      .replace(/^```mermaid\n?/i, '')
      .replace(/```$/i, '')
      .trim();
    if (!sanitized) return { ok: false, reason: 'Mermaid content empty after sanitization' };
    return { ok: true, diagram: { engine: 'mermaid', code: sanitized } };
  };

  const tried: Array<'reactflow' | 'mermaid'> = [];
  const debug: { reactflow?: { ok: boolean; reason?: string }; mermaid?: { ok: boolean; reason?: string } } = {};

  for (const engine of engineOrder) {
    if (engine === 'reactflow') {
      tried.push('reactflow');
      const rf = await tryReactFlow();
      if (rf.ok) return rf.diagram;
      debug.reactflow = { ok: false, reason: rf.reason };
    } else if (engine === 'mermaid') {
      tried.push('mermaid');
      const mm = await tryMermaid();
      if (mm.ok) return mm.diagram;
      debug.mermaid = { ok: false, reason: mm.reason };
    }
  }

  // No diagram; attach debug info to console
  console.warn('[ai-chat] Diagram generation failed', { tried: engineOrder, ...debug });
  return undefined;
}

// Generate a brief, friendly explanation of a given Mermaid diagram
async function explainMermaid(
  mermaidCode: string,
  problemDescription: string
): Promise<string> {
  const explainPrompt = `You are a helpful tutor. In 2-4 short bullet points, explain the following Mermaid diagram for a coding problem. Avoid code, be concise, no questions.

Problem context (for reference): ${problemDescription}

Diagram (Mermaid DSL):\n${mermaidCode}`;

  const text = await llmText(explainPrompt, { temperature: 0.5, maxTokens: 180 });
  return text?.trim() || 'Here is the diagram.';
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
  // Don't auto-trigger on vague code-like text; rely on explicit ask or explicit code
  const looksLikeCode = false;
  const lastAssistant = (conversationHistory || []).slice().reverse().find(m => m.role === 'assistant')?.content?.trim() || '';
  const assistantJustAskedQuestion = /\?\s*$/.test(lastAssistant);

  const allowAnalysis = hasExplicitCode || explicitAsk;
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
Respond by extracting any concrete, safe-to-insert scaffolding (e.g., pointer initialization), but avoid full solutions unless explicitly requested.`;

  try {
    const raw = await llmJson(analysisPrompt, { temperature: 0.1, maxTokens: 1000 });
    let analysisResult;
    try {
      analysisResult = JSON.parse(raw || '{"codeSnippets": []}');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }
    
    // Add unique IDs and validate structure
    const codeSnippets: CodeSnippet[] = (analysisResult.codeSnippets || []).map((snippet: { [k: string]: unknown; insertionHint?: { type?: string; scope?: string; description?: string } }, index: number) => ({
      id: `snippet-${Date.now()}-${index}`,
      code: typeof snippet.code === 'string' ? snippet.code : '',
      language: typeof snippet.language === 'string' ? (snippet.language as string) : 'python',
      isValidated: typeof snippet.isValidated === 'boolean' ? (snippet.isValidated as boolean) : false,
      insertionType: typeof snippet.insertionType === 'string' ? (snippet.insertionType as 'smart' | 'cursor' | 'append' | 'prepend' | 'replace') : 'smart',
      insertionHint: {
        type: typeof snippet.insertionHint?.type === 'string' ? snippet.insertionHint.type as 'import' | 'variable' | 'function' | 'statement' | 'class' : 'statement',
        scope: typeof snippet.insertionHint?.scope === 'string' ? snippet.insertionHint.scope as 'global' | 'function' | 'class' : 'function',
        description: typeof snippet.insertionHint?.description === 'string' ? snippet.insertionHint.description : 'Code snippet'
      }
    }));

    const normalizedMessage = message.replace(/\s+/g, ' ').toLowerCase();
    const validated = codeSnippets
      .filter(snippet => snippet.code && snippet.code.trim().length > 0 && snippet.isValidated)
      .filter(snippet => {
        const code = snippet.code.trim();
        const lower = code.replace(/\s+/g, ' ').toLowerCase();
        const lineCount = code.split('\n').length;
        const isControlFlow = /(^|\n)\s*(if|for|while)\b/.test(code) || /(^|\n)\s*(class|def)\b/.test(code);
        const tooLong = code.length > 200 || lineCount > 3;
        const appearsInUserText = normalizedMessage.includes(lower);
        const isSimpleType = snippet.insertionHint?.type === 'import' || snippet.insertionHint?.type === 'variable' || snippet.insertionHint?.type === 'statement';
        const allowedByPolicy = (hasExplicitCode || explicitAsk) && (appearsInUserText || isSimpleType);
        return allowedByPolicy && !isControlFlow && !tooLong;
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
 * Use LLM to compute the best insertion line and indentation, then deterministically insert ONLY the snippet
 */
async function insertSnippetSmart(
  code: string,
  snippet: CodeSnippet,
  problemDescription: string,
  cursorPosition?: { line: number; column: number }
): Promise<{ newCode: string; insertedAtLine?: number; rationale?: string }> {
  // 1) Deterministic, fast path: anchor-based insertion if the first line exists
  try {
    const snippetLines = (snippet.code || '').split('\n');
    const firstLineTrim = (snippetLines[0] || '').trim();
    if (firstLineTrim.length > 0) {
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === firstLineTrim) {
          // If next lines already match snippet continuation, skip (already inserted)
          const secondLineTrim = (snippetLines[1] || '').trim();
          if (secondLineTrim && lines[i + 1]?.trim() === secondLineTrim) {
            return { newCode: code, insertedAtLine: -1, rationale: 'Snippet already present after anchor' };
          }
          const indent = lines[i].match(/^\s*/)?.[0] || '';
          const toInsert = snippetLines.slice(1).map((l, idx) => (idx === 0 ? indent + l.trim() : indent + l));
          const newLines = [...lines];
          newLines.splice(i + 1, 0, ...toInsert);
          const newCode = newLines.join('\n');
          console.log('[ai-chat] insert_snippet anchor-based insertion at line', i + 1);
          return { newCode, insertedAtLine: i + 1, rationale: 'Anchor-based placement after matching first line' };
        }
      }
    }
  } catch (e) {
    console.warn('[ai-chat] Anchor-based insertion failed, continuing to model placement:', e);
  }

  const placementPrompt = `You will choose where to insert a SHORT code snippet into a Python file.

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
- Determine the 0-based line index where the FIRST line of the snippet should be inserted.
- Provide an indentation string (spaces or tabs) appropriate for that location. Do NOT include any other code.
- If the exact snippet (normalized whitespace) already exists, set insertAtLine to -1.
- If insertion is ambiguous, prefer placing inside the active function near the cursor when provided.

Output strictly as JSON (no markdown):
{
  "insertAtLine": <number>,
  "indentation": "<indent string>",
  "rationale": "<brief explanation>"
}`;

  console.log('[ai-chat] insert_snippet using model=gpt-4o-mini (placement-only)');
  const raw = await llmJsonFast(placementPrompt, { maxTokens: 500 });
  let insertAtLine: number | undefined;
  let indent: string | undefined;
  let rationale: string | undefined;
  try {
    const parsed = JSON.parse(raw || '{}');
    if (typeof parsed.insertAtLine === 'number') insertAtLine = parsed.insertAtLine;
    if (typeof parsed.indentation === 'string') indent = parsed.indentation;
    if (typeof parsed.rationale === 'string') rationale = parsed.rationale;
  } catch {
    // ignore
  }

  // If snippet already exists or placement invalid, return original
  if (insertAtLine === -1 || insertAtLine === undefined || insertAtLine < 0) {
    return { newCode: code, insertedAtLine: -1, rationale };
  }

  // Deterministic insertion of ONLY the provided snippet
  const lines = code.split('\n');
  const safeInsertLine = Math.min(Math.max(0, insertAtLine), lines.length);
  // Derive indentation if not provided
  const contextIndent = indent !== undefined ? indent : (lines[safeInsertLine]?.match(/^\s*/)?.[0] || '');

  const snippetLines = snippet.code.split('\n');
  const indentedSnippet: string[] = snippetLines.map((line, idx) => {
    if (idx === 0) {
      return contextIndent + line.trim();
    }
    return contextIndent + line;
  });

  const newLines = [...lines];
  newLines.splice(safeInsertLine, 0, ...indentedSnippet);
  const newCode = newLines.join('\n');
  return { newCode, insertedAtLine: safeInsertLine, rationale };
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
    console.log(`[ai-chat] Model selection: model=${configuredModel} | api=${useResponsesApi ? 'Responses' : 'Chat'} | source=${modelSource}`);
    // Parse request body
    const body: RequestBody = await req.json();
    const { message, problemDescription, conversationHistory, action, code, snippet, cursorPosition, testCases, diagram: diagramRequested, preferredEngines } = body;

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

    // If diagram explicitly requested, prioritize diagram and skip snippet analysis
    if (diagramRequested) {
      const diagram = await maybeGenerateDiagram(message, problemDescription, conversationHistory || [], true, preferredEngines);
      const responseText = diagram
        ? (diagram.engine === 'mermaid' ? await explainMermaid(diagram.code, problemDescription) : 'Here is an interactive diagram of the approach.')
        : 'Unable to create a diagram for this message.';
      const aiResponse: AIResponse = { response: responseText, diagram };
      return new Response(JSON.stringify(aiResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default chat behavior: generate conversation + analyze snippets + opportunistic diagram
    const [conversationResponse, codeSnippets, diagram] = await Promise.all([
      generateConversationResponse(message, problemDescription, conversationHistory || [], testCases),
      analyzeCodeSnippets(message, conversationHistory || [], problemDescription, testCases),
      maybeGenerateDiagram(message, problemDescription, conversationHistory || [], false, preferredEngines)
    ]);

    // Heuristic: suggest diagram if user mentions visualization OR problem classes where visuals help
    const userAskedForDiagram = /\b(visualize|diagram|flowchart|mermaid|draw)\b/i.test(message);
    const contextHints = /\b(linked list|two pointers|tree|graph|dfs|bfs|heap|priority queue|sliding window|dp|dynamic programming)\b/i.test(
      [message, ...conversationHistory.slice(-2).map(m => m.content)].join(' ')
    );
    const suggestDiagram = !!diagram || userAskedForDiagram || contextHints;

    const aiResponse: AIResponse = {
      response: conversationResponse,
      codeSnippets: codeSnippets.length > 0 ? codeSnippets : undefined,
      diagram: diagram,
      suggestDiagram
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