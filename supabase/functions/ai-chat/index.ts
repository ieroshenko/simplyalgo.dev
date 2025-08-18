import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

// Ambient declaration for Deno types (for editor/TS tooling)
// This does not affect runtime in the Supabase Edge environment.
declare const Deno: { env: { get(name: string): string | undefined } };

// Types
interface CodeSnippet {
  id: string;
  code: string;
  language: string;
  isValidated: boolean;
  insertionType: "smart" | "cursor" | "append" | "prepend" | "replace";
  insertionHint?: {
    type: "import" | "variable" | "function" | "statement" | "class";
    scope: "global" | "function" | "class";
    description: string;
  };
}

/**
 * Lightweight sanitizer to fix common TSX issues in generated components before returning to client.
 * - Removes stray markdown fences
 * - Fixes dangling nullish-coalescing operators like `v[0] ??` -> `v[0] ?? 1`
 * - Normalizes Slider onValueChange to handle array/scalar safely
 * - Attempts to balance common unmatched parens/brackets at end of lines
 */
function sanitizeGeneratedTsx(input: string): string {
  let code = input || "";

  // 1) Strip markdown fences if any
  code = code.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");

  // 2) Fix dangling nullish coalescing at end of expression or before comma/paren/pipe
  // Examples seen: `setSpeed(v[0] ?? |` or `setSpeed(v[0] ?? )`
  code = code.replace(/\?\?\s*(\)|,|\||\n)/g, "?? 1$1");

  // 3) Specific hardening for Slider onValueChange: ensure defaults and numeric cast
  // onValueChange={(v) => setSpeed(v[0] ?? 1)} or when v is scalar
  code = code.replace(
    /onValueChange=\{\(v\)\s*=>\s*setSpeed\(([^)]*)\)\)\}/g,
    (m) => m, // no-op if already in a different shape
  );
  // Generic normalization for common patterns `setSpeed(v[0] ?? 1)` or `setSpeed(v ?? 1)`
  code = code.replace(
    /onValueChange=\{\(v\)\s*=>\s*setSpeed\(([^)]*)\)\s*\}/g,
    (_m, inner) => {
      const safe = `Number((Array.isArray(v) ? v[0] : v) ?? 1)`;
      return `onValueChange={(v) => setSpeed(${safe})}`;
    },
  );

  // 4) Try to repair simple unmatched parentheses at line ends like `(... ?? 1` without closing )
  code = code.replace(/(setSpeed\([^\n]*)$/gm, (line) => {
    const opens = (line.match(/\(/g) || []).length;
    const closes = (line.match(/\)/g) || []).length;
    if (opens > closes) return line + ")";
    return line;
  });

  // 5) Fix incomplete JSX attribute assignments like `values={list |` or `values={list}`
  // Replace dangling pipes at end of JSX attribute values
  code = code.replace(/=\{([^}]*)\s*\|\s*$/gm, "={$1}");

  // 6) Fix unclosed JSX attribute braces like `values={list` (missing closing brace)
  code = code.replace(/=\{([^}\n]*?)$/gm, (match, content) => {
    // Only fix if it looks like an incomplete JSX attribute (no closing brace on same line)
    if (content && !content.includes("}")) {
      return `={${content}}`;
    }
    return match;
  });

  // 7) Fix malformed template literals or incomplete expressions in JSX
  code = code.replace(/\{[^}]*\|[^}]*\}/g, (match) => {
    // Remove stray pipes inside JSX expressions that might break syntax
    return match.replace(/\|/g, "");
  });

  // 8) Clean up any remaining stray pipes at end of lines
  code = code.replace(/\s*\|\s*$/gm, "");

  // 9) Handle truncated JSX components at the end of the code
  // Look for incomplete JSX tags like `<ComponentName` or `<ComponentName values={prop`
  const lines = code.split("\n");
  let lastLine = lines[lines.length - 1].trim();

  // If the last line looks like an incomplete JSX tag, remove it
  if (
    lastLine.match(/^\s*<[A-Z]\w*[^>]*$/) ||
    (lastLine.includes("values={") && !lastLine.includes("}"))
  ) {
    lines.pop(); // Remove the incomplete line
    code = lines.join("\n");
  }

  // 10) Ensure the component ends properly with export or return statement
  if (!code.trim().endsWith("}") && !code.trim().endsWith(";")) {
    // If code doesn't end properly, try to add a closing brace
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      code += "\n}".repeat(openBraces - closeBraces);
    }
  }

  return code;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  message?: string;
  problemDescription?: string;
  conversationHistory?: ChatMessage[];
  // Optional action for smart insertion or clearing chat
  action?: "insert_snippet" | "clear_chat" | "generate_visualization";
  // Optional explicit diagram request
  diagram?: boolean;
  // Preferred engines order for diagram generation
  preferredEngines?: Array<"reactflow" | "mermaid">;
  // Payload for insertion
  code?: string;
  snippet?: CodeSnippet;
  cursorPosition?: { line: number; column: number };
  // Optional problem test cases to condition the tutor (will be executed on Judge0)
  testCases?: unknown[];
  // Current code in the editor for context-aware responses
  currentCode?: string;
  // For clear_chat action
  sessionId?: string;
  userId?: string;
  // For visualization generation
  problem?: {
    title: string;
    description: string;
    examples: Array<{
      input: string;
      output: string;
      explanation?: string;
    }>;
    category: string;
    difficulty: string;
    functionSignature?: string;
  };
}

interface AIResponse {
  response: string;
  codeSnippets?: CodeSnippet[];
  diagram?:
    | { engine: "mermaid"; code: string; title?: string }
    | {
        engine: "reactflow";
        graph: {
          nodes: Array<{
            id: string;
            type?: string;
            data: { label: string };
            position: { x: number; y: number };
          }>;
          edges: Array<{
            id: string;
            source: string;
            target: string;
            label?: string;
          }>;
        };
        title?: string;
      };
  suggestDiagram?: boolean;
  diagramDebug?: {
    tried: Array<"reactflow" | "mermaid">;
    reactflow?: { ok: boolean; reason?: string };
    mermaid?: { ok: boolean; reason?: string };
  };
  visualizationComponent?: {
    code: string;
    title: string;
  };
}

// Initialize OpenAI client (will be created with proper error handling in the handler)
let openai: OpenAI;

// Model selection via env var; default to o3-mini if not set
const configuredModel = (Deno.env.get("OPENAI_MODEL") || "o3-mini").trim();
const modelSource = Deno.env.get("OPENAI_MODEL")
  ? "OPENAI_MODEL env set"
  : "defaulted to o3-mini (no OPENAI_MODEL)";
const useResponsesApi = /^(gpt-5|o3)/i.test(configuredModel);

// Diagram engine preference - set DIAGRAM_ENGINE=reactflow or mermaid
const preferredDiagramEngine = (Deno.env.get("DIAGRAM_ENGINE") || "reactflow")
  .toLowerCase()
  .trim();
const validEngines = ["reactflow", "mermaid"];
const diagramEngine = validEngines.includes(preferredDiagramEngine)
  ? preferredDiagramEngine
  : "reactflow";
console.log(
  `[ai-chat] Diagram engine: ${diagramEngine} (${Deno.env.get("DIAGRAM_ENGINE") ? "env configured" : "defaulted"})`,
);

// ---- Responses API helpers ----
type ResponsesApiRequest = {
  model: string;
  input: string;
  max_output_tokens?: number;
  reasoning?: { effort: "minimal" | "medium" | "high" };
  text?: {
    verbosity?: "low" | "medium" | "high";
    format?: { type: "json_object" };
  };
};

function buildResponsesRequest(
  model: string,
  prompt: string,
  opts: { maxTokens?: number; responseFormat?: "json_object" | undefined },
): ResponsesApiRequest {
  const req: ResponsesApiRequest = {
    model,
    input: prompt,
    max_output_tokens:
      typeof opts.maxTokens === "number" ? opts.maxTokens : undefined,
  };
  if (/^gpt-5/i.test(model)) {
    req.reasoning = { effort: "minimal" };
    req.text = {
      verbosity: opts.responseFormat ? "low" : "medium",
      ...(opts.responseFormat ? { format: { type: "json_object" } } : {}),
    };
  } else if (/^o3/i.test(model)) {
    req.reasoning = { effort: "medium" };
    // o3 may ignore text.verbosity; omit for safety
  }
  return req;
}

type ResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: { value?: string } | string }>;
  }>;
  choices?: Array<{ message?: { content?: string } }>;
};

function extractResponsesText(response: ResponsesApiResponse): string {
  // 1) Direct output_text
  const direct =
    typeof response?.output_text === "string" ? response.output_text : "";
  if (direct) return direct;
  // 2) Traverse output[].content[] for output_text/text
  const output = Array.isArray(response?.output) ? response.output : [];
  let text = "";
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      const type = c?.type;
      const textField = (c as { text?: { value?: string } | string })
        ?.text as unknown;
      const nestedValue =
        textField &&
        typeof textField === "object" &&
        "value" in (textField as Record<string, unknown>)
          ? (textField as { value?: string }).value
          : undefined;
      if (type === "output_text" && typeof nestedValue === "string") {
        text += nestedValue;
      } else if (type === "text") {
        if (typeof textField === "string") text += textField;
        else if (typeof nestedValue === "string") text += nestedValue;
      }
    }
  }
  if (text) return text;
  // 3) Fallback to chat-like choices
  const choices = Array.isArray(response?.choices) ? response.choices : [];
  return choices?.[0]?.message?.content || "";
}

// Unified LLM callers (supports Responses API for gpt-5/o3 and falls back to Chat Completions)
async function llmText(
  prompt: string,
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
  },
): Promise<string> {
  const model = configuredModel;
  if (useResponsesApi) {
    // Try configured Responses model first, then o3-mini, then fall back to Chat API
    const responseModels = [model, "o3-mini"].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    for (const respModel of responseModels) {
      try {
        console.log(`[ai-chat] Using Responses API with model=${respModel}`);
        const req = buildResponsesRequest(respModel, prompt, {
          maxTokens: opts.maxTokens,
          responseFormat: opts.responseFormat,
        });
        const response = await openai.responses.create(
          req as unknown as ResponsesApiResponse,
        );
        const finalText = extractResponsesText(response).toString();
        if (finalText.trim().length > 0) {
          return finalText;
        }
        console.warn(
          `[ai-chat] Responses API returned empty text for model=${respModel}; trying next option...`,
        );
        continue;
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        console.warn(
          `[ai-chat] Responses API failed for model=${respModel}. ${err?.name || ""}: ${err?.message || ""}`,
        );
        continue;
      }
    }
    console.warn(
      `[ai-chat] All Responses API attempts failed; falling back to Chat Completions.`,
    );
  }
  const chatModel = useResponsesApi ? "gpt-4o-mini" : model;
  console.log(
    `[ai-chat] Using Chat Completions API with model=${chatModel} (fallback=${useResponsesApi ? "yes" : "no"})`,
  );
  const chat = await openai.chat.completions.create({
    model: chatModel,
    messages: [{ role: "user", content: prompt }],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 500,
    response_format: opts.responseFormat
      ? ({ type: opts.responseFormat } as { type: "json_object" })
      : undefined,
  } as unknown as { choices: Array<{ message?: { content?: string } }> });
  return chat.choices[0]?.message?.content || "";
}

async function llmJson(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number },
): Promise<string> {
  return await llmText(prompt, {
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    responseFormat: "json_object",
  });
}

/**
 * Fast JSON helper: force a lightweight, fast model for tool-style calls
 */
async function llmJsonFast(
  prompt: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  // Prefer Responses API for gpt-5-mini, fall back to Chat Completions with gpt-4o-mini
  try {
    console.log(
      "[ai-chat] llmJsonFast using Responses API with model=gpt-5-mini",
    );
    const req: Record<string, unknown> = {
      model: "gpt-5-mini",
      input: prompt,
      max_output_tokens:
        typeof opts?.maxTokens === "number" ? opts.maxTokens : 600,
      text: { verbosity: "low", format: { type: "json_object" } },
      reasoning: { effort: "minimal" },
    };
    const response = await openai.responses.create(
      req as unknown as {
        output_text?: string;
        output?: Array<{
          content?: Array<{
            type?: string;
            text?: { value?: string } | string;
          }>;
        }>;
      },
    );
    let text: string =
      (response as unknown as { output_text?: string }).output_text || "";
    const output: Array<{
      content?: Array<{ type?: string; text?: { value?: string } | string }>;
    }> =
      (
        response as unknown as {
          output?: Array<{
            content?: Array<{
              type?: string;
              text?: { value?: string } | string;
            }>;
          }>;
        }
      ).output || [];
    if (!text && Array.isArray(output)) {
      for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const c of content) {
          const type = (c as { type?: string })?.type;
          const textField = (c as { text?: { value?: string } | string })
            ?.text as unknown;
          const nestedValue =
            textField &&
            typeof textField === "object" &&
            "value" in (textField as Record<string, unknown>)
              ? (textField as { value?: string }).value
              : undefined;
          if (type === "output_text" && typeof nestedValue === "string") {
            text += nestedValue;
          } else if (type === "text") {
            if (typeof textField === "string") text += textField;
            else if (typeof nestedValue === "string") text += nestedValue;
          }
        }
      }
    }
    return text;
  } catch (err) {
    console.warn(
      "[ai-chat] llmJsonFast gpt-5-mini Responses failed; falling back to gpt-4o-mini Chat. Error:",
      err,
    );
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: opts?.maxTokens ?? 600,
      response_format: { type: "json_object" } as { type: "json_object" },
    } as unknown as { choices: Array<{ message?: { content?: string } }> });
    return chat.choices[0]?.message?.content || "";
  }
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (if service role key is provided) for maintenance actions like clearing chat
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

/**
 * Main conversation handler - generates AI response for general chat
 */
async function generateConversationResponse(
  message: string,
  problemDescription: string,
  conversationHistory: ChatMessage[],
  testCases?: unknown[],
  currentCode?: string,
): Promise<string> {
  const serializedTests =
    Array.isArray(testCases) && testCases.length > 0
      ? JSON.stringify(testCases)
      : undefined;

  // Determine if we should allow code in the reply - be more liberal for explicit requests
  const hasExplicitCode = /```[\s\S]*?```|`[^`]+`/m.test(message);
  const explicitCodeRequest =
    /\b(write|show|give|provide|insert|add|implement|code|import|define|create|how do i|help me)\b/i.test(
      message,
    );
  const codeKeywords =
    /\b(algorithm|logic|solution|function|method|approach|example)\b/i.test(
      message,
    );
  const allowCode = hasExplicitCode || explicitCodeRequest || codeKeywords;

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

${serializedTests ? `PROBLEM TEST CASES (JSON):\n${serializedTests}\n` : ""}

${currentCode ? `CURRENT CODE IN EDITOR:\n\`\`\`python\n${currentCode}\n\`\`\`\n` : ""}

CONVERSATION HISTORY:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

CURRENT STUDENT MESSAGE:
"${message}"

Your role:
1. Coach with a Socratic style, but be helpful when students need code examples.
2. Ask ONE concise question (<= 25 words) to guide their thinking.
3. Provide helpful hints when students are stuck or ask for guidance.
4. Keep tone friendly and educational.

Code policy (conditional):
- allowCode = ${allowCode}
- If allowCode = false: Use questions and conceptual hints only.
- If allowCode = true and student explicitly requests code: 
  * CRITICAL: Only provide incremental code snippets, NEVER complete solutions
  * Analyze what's already in their editor and provide ONLY the next 1-3 lines they need
  * If they have an empty function, provide just the first variable declaration or setup
  * If they have setup code, provide just the next logical step (loop, condition, etc.)
  * If they have partial logic, provide just the missing piece to complete that step
  * NEVER provide full algorithm implementations - break it into tiny incremental steps
  * Each snippet should be 1-5 lines maximum and build on their existing code

Output format:
- Lead with a guiding question or brief explanation
- Provide helpful hints as needed
- If code is warranted and allowCode=true, include properly formatted code:
\`\`\`python
# Clear, educational code example
# With proper indentation and comments
\`\`\`
`;

  const systemGuidance =
    "You are a helpful Socratic coding tutor. Guide students with questions and provide educational code examples when requested. When allowCode=true and students ask for code help, provide clear, well-formatted Python examples that teach concepts. Balance Socratic questioning with practical code assistance.";
  const combined = `${systemGuidance}\n\n${conversationPrompt}`;
  const text = await llmText(combined, { temperature: 0.3, maxTokens: 600 });
  return text || "I'm sorry, I couldn't generate a response. Please try again.";
}

// React Flow types and validator
type FlowNode = {
  id: string;
  type?: string;
  data: { label: string };
  position: { x: number; y: number };
};
type FlowEdge = { id: string; source: string; target: string; label?: string };
type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

function validateFlowGraph(graph: unknown): graph is FlowGraph {
  console.log(
    "[Validation] Starting validation for:",
    JSON.stringify(graph, null, 2),
  );

  if (!graph || typeof graph !== "object") {
    console.log("[Validation] Failed: graph is not an object");
    return false;
  }

  const g = graph as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(g.nodes)) {
    console.log(
      "[Validation] Failed: nodes is not an array, got:",
      typeof g.nodes,
    );
    return false;
  }
  if (!Array.isArray(g.edges)) {
    console.log(
      "[Validation] Failed: edges is not an array, got:",
      typeof g.edges,
    );
    return false;
  }

  console.log(
    `[Validation] Found ${g.nodes.length} nodes and ${g.edges.length} edges`,
  );

  const idSet = new Set<string>();
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i];
    const node = n as FlowNode;
    console.log(
      `[Validation] Checking node ${i}:`,
      JSON.stringify(node, null, 2),
    );

    if (!node || typeof node.id !== "string") {
      console.log(
        `[Validation] Failed: node ${i} has invalid id:`,
        typeof node?.id,
      );
      return false;
    }
    if (
      !node.position ||
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    ) {
      console.log(
        `[Validation] Failed: node ${i} has invalid position:`,
        node.position,
      );
      return false;
    }
    if (!node.data || typeof node.data.label !== "string") {
      console.log(
        `[Validation] Failed: node ${i} has invalid data:`,
        node.data,
      );
      return false;
    }
    if (idSet.has(node.id)) {
      console.log(`[Validation] Failed: duplicate node id: ${node.id}`);
      return false;
    }
    idSet.add(node.id);
  }

  for (let i = 0; i < g.edges.length; i++) {
    const e = g.edges[i];
    const edge = e as FlowEdge;
    console.log(
      `[Validation] Checking edge ${i}:`,
      JSON.stringify(edge, null, 2),
    );

    if (
      !edge ||
      typeof edge.id !== "string" ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string"
    ) {
      console.log(`[Validation] Failed: edge ${i} has invalid properties:`, {
        id: typeof edge?.id,
        source: typeof edge?.source,
        target: typeof edge?.target,
      });
      return false;
    }
  }

  console.log("[Validation] All checks passed!");
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
  preferredEngines?: Array<"reactflow" | "mermaid">,
): Promise<
  | { engine: "reactflow"; graph: FlowGraph; title?: string }
  | { engine: "mermaid"; code: string; title?: string }
  | undefined
> {
  const wantsDiagram =
    /\b(visualize|diagram|draw|show.*diagram|mermaid|flow|graph)\b/i.test(
      message,
    );
  if (!force && !wantsDiagram) return undefined;
  // Use configured diagram engine preference
  const defaultOrder: Array<"reactflow" | "mermaid"> =
    diagramEngine === "reactflow"
      ? ["reactflow", "mermaid"]
      : ["mermaid", "reactflow"];

  const engineOrder: Array<"reactflow" | "mermaid"> =
    Array.isArray(preferredEngines) && preferredEngines.length
      ? (Array.from(new Set(preferredEngines.concat(defaultOrder))) as Array<
          "reactflow" | "mermaid"
        >)
      : defaultOrder;

  const rfPrompt = `Create a React Flow diagram that visualizes the algorithm step-by-step with meaningful progression.

OUTPUT FORMAT (copy structure exactly):
{
  "reactflow": {
    "nodes": [
      {"id": "n1", "type": "default", "data": {"label": "Initialize variables"}, "position": {"x": 100, "y": 50}},
      {"id": "n2", "type": "default", "data": {"label": "Check condition"}, "position": {"x": 100, "y": 150}},
      {"id": "n3", "type": "default", "data": {"label": "Process step"}, "position": {"x": 100, "y": 250}}
    ],
    "edges": [
      {"id": "e1", "source": "n1", "target": "n2"},
      {"id": "e2", "source": "n2", "target": "n3"}
    ]
  }
}

REQUIREMENTS:
- Create 6-10 nodes showing algorithm flow
- Include key algorithmic concepts: initialization, loops, conditions, updates
- For data structures: show operations like "compare", "merge", "split", "traverse"
- For search algorithms: show "check condition", "update bounds", "found/not found"
- For dynamic programming: show "base case", "recurrence", "memoize"
- For sorting: show "partition", "merge", "swap"
- Use decision branches for conditional logic (spread horizontally +200px)
- Show meaningful progression that teaches the approach
- Space vertically +100px, horizontally +200px for branches
- Node labels max 25 characters, clear and educational
- Simple IDs: n1, n2, n3, etc.

Problem context: ${problemDescription}
User request: ${message}
Conversation context: ${conversationHistory
    .slice(-3)
    .map((m) => m.content)
    .join(" ")
    .substring(0, 300)}

Create an educational algorithm visualization:`;

  // Attempt functions
  const tryReactFlow = async (): Promise<
    | { ok: true; diagram: { engine: "reactflow"; graph: FlowGraph } }
    | { ok: false; reason: string }
  > => {
    let raw = "";
    try {
      raw = (
        await llmJson(rfPrompt, { temperature: 0.2, maxTokens: 700 })
      ).trim();
      console.log(
        "[React Flow] Raw AI response:",
        raw.substring(0, 500) + (raw.length > 500 ? "..." : ""),
      );
    } catch (e) {
      console.log("[React Flow] llmJson failed, trying llmText:", e);
      try {
        raw = (
          await llmText(rfPrompt, { temperature: 0.2, maxTokens: 700 })
        ).trim();
        console.log(
          "[React Flow] Raw AI response from llmText:",
          raw.substring(0, 500) + (raw.length > 500 ? "..." : ""),
        );
      } catch (e2) {
        console.log("[React Flow] Both llmJson and llmText failed:", e2);
        return {
          ok: false,
          reason: `Responses+fallback failed: ${(e2 as Error)?.message || "unknown error"}`,
        };
      }
    }
    if (!raw) {
      console.log("[React Flow] Empty response");
      return { ok: false, reason: "Empty response for reactflow JSON" };
    }
    try {
      // Clean the response to extract JSON
      let cleanJson = raw.trim();

      // Remove markdown code blocks if present
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson
          .replace(/^```(?:json)?/m, "")
          .replace(/```$/m, "")
          .trim();
      }

      // Try to find JSON object boundaries
      const jsonStart = cleanJson.indexOf("{");
      const jsonEnd = cleanJson.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
      }

      console.log("[React Flow] Cleaned JSON:", cleanJson);

      const parsed = JSON.parse(cleanJson);
      console.log("[React Flow] Parsed JSON:", JSON.stringify(parsed, null, 2));
      const rf = parsed && parsed.reactflow ? parsed.reactflow : undefined;
      if (!rf) {
        console.log("[React Flow] Missing reactflow key in parsed JSON");
        return { ok: false, reason: "Missing reactflow key in JSON" };
      }
      console.log(
        "[React Flow] Found reactflow data:",
        JSON.stringify(rf, null, 2),
      );
      if (validateFlowGraph(rf)) {
        console.log("[React Flow] Validation passed, returning diagram");
        return { ok: true, diagram: { engine: "reactflow", graph: rf } };
      }
      console.log("[React Flow] Schema validation failed");
      return { ok: false, reason: "Schema validation failed" };
    } catch (parseErr) {
      console.log("[React Flow] JSON parse error:", parseErr, "Raw:", raw);
      return {
        ok: false,
        reason: `Invalid JSON: ${(parseErr as Error)?.message || "parse error"}`,
      };
    }
  };

  const mermaidPrompt = `Output ONLY a JSON with a simple Mermaid flowchart. Use this exact format:

{
  "mermaid": "flowchart TD\\n    A[Start] --> B[Compare]\\n    B --> C[Choose smaller]\\n    C --> D[End]"
}

RULES:
- Use "flowchart TD" syntax only
- Maximum 8 nodes for simplicity  
- Node labels must be simple text in brackets: [Text here]
- Use --> for arrows
- No special characters except spaces and hyphens in labels
- Each line must end with \\n
- Keep labels under 15 characters

For: ${problemDescription.split(".")[0]}
User request: ${message}

Output only the JSON:`;

  const tryMermaid = async (): Promise<
    | { ok: true; diagram: { engine: "mermaid"; code: string } }
    | { ok: false; reason: string }
  > => {
    let mermaidRaw = "";
    try {
      mermaidRaw = (
        await llmJson(mermaidPrompt, { temperature: 0.2, maxTokens: 700 })
      ).trim();
    } catch (e) {
      try {
        mermaidRaw = (
          await llmText(mermaidPrompt, { temperature: 0.2, maxTokens: 700 })
        ).trim();
      } catch (e2) {
        return {
          ok: false,
          reason: `Responses+fallback failed: ${(e2 as Error)?.message || "unknown error"}`,
        };
      }
    }
    if (!mermaidRaw)
      return { ok: false, reason: "Empty response for mermaid JSON" };
    let mermaidCode = "";
    try {
      const parsed = JSON.parse(mermaidRaw);
      if (parsed && typeof parsed.mermaid === "string") {
        mermaidCode = String(parsed.mermaid);
      }
    } catch (parseErr) {
      const fence = mermaidRaw.match(/```mermaid([\s\S]*?)```/i);
      if (fence && fence[1]) {
        mermaidCode = fence[1];
      } else if (/flowchart\s+LR|graph\s+LR/i.test(mermaidRaw)) {
        mermaidCode = mermaidRaw;
      } else {
        return {
          ok: false,
          reason: `Invalid JSON and no fence: ${(parseErr as Error)?.message || "parse error"}`,
        };
      }
    }
    const sanitized = (mermaidCode || "")
      .replace(/^```mermaid\n?/i, "")
      .replace(/```$/i, "")
      .trim();
    if (!sanitized)
      return { ok: false, reason: "Mermaid content empty after sanitization" };
    return { ok: true, diagram: { engine: "mermaid", code: sanitized } };
  };

  const tried: Array<"reactflow" | "mermaid"> = [];
  const debug: {
    reactflow?: { ok: boolean; reason?: string };
    mermaid?: { ok: boolean; reason?: string };
  } = {};

  console.log("[Diagram Generation] Engine order:", engineOrder);

  for (const engine of engineOrder) {
    console.log(`[Diagram Generation] Trying engine: ${engine}`);
    if (engine === "reactflow") {
      tried.push("reactflow");
      const rf = await tryReactFlow();
      if (rf.ok) {
        console.log("[Diagram Generation] React Flow succeeded");
        return rf.diagram;
      }
      console.log("[Diagram Generation] React Flow failed:", rf.reason);
      debug.reactflow = { ok: false, reason: rf.reason };
    } else if (engine === "mermaid") {
      tried.push("mermaid");
      const mm = await tryMermaid();
      if (mm.ok) {
        console.log("[Diagram Generation] Mermaid succeeded");
        return mm.diagram;
      }
      console.log("[Diagram Generation] Mermaid failed:", mm.reason);
      debug.mermaid = { ok: false, reason: mm.reason };
    }
  }

  // No diagram; attach debug info to console
  console.warn("[ai-chat] Diagram generation failed", {
    tried: engineOrder,
    ...debug,
  });
  return undefined;
}

// Generate a brief, friendly explanation of a given Mermaid diagram
async function explainMermaid(
  mermaidCode: string,
  problemDescription: string,
): Promise<string> {
  const explainPrompt = `You are a helpful tutor. In 2-4 short bullet points, explain the following Mermaid diagram for a coding problem. Avoid code, be concise, no questions.

Problem context (for reference): ${problemDescription}

Diagram (Mermaid DSL):\n${mermaidCode}`;

  const text = await llmText(explainPrompt, {
    temperature: 0.5,
    maxTokens: 180,
  });
  return text?.trim() || "Here is the diagram.";
}

/**
 * Code analysis handler - analyzes student messages for insertable code snippets
 */
async function analyzeCodeSnippets(
  message: string,
  conversationHistory: ChatMessage[],
  problemDescription: string,
  testCases?: unknown[],
  currentCode?: string,
): Promise<CodeSnippet[]> {
  // Check if this is an AI response by looking at conversation history
  const isAIResponse =
    conversationHistory.length > 0 &&
    conversationHistory[conversationHistory.length - 1]?.role === "user";

  console.log(
    `[CodeSnippets] Analysis context: isAIResponse=${isAIResponse}, conversationLength=${conversationHistory.length}, lastRole=${conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.role : "none"}`,
  );

  // For AI responses, only analyze if there are clear code blocks
  if (isAIResponse) {
    const hasCodeBlocks = /```[\s\S]*?```/m.test(message);
    if (!hasCodeBlocks) {
      return [];
    }
  } else {
    // For user messages, use original logic: only analyze if clear intent
    const hasExplicitCode = /```[\s\S]*?```|`[^`]+`/m.test(message);
    const explicitAsk =
      /\b(write|show|give|provide|insert|add|implement|code|import|define|declare|create)\b/i.test(
        message,
      );

    // Don't auto-trigger on vague code-like text; rely on explicit ask or explicit code
    const lastAssistant =
      (conversationHistory || [])
        .slice()
        .reverse()
        .find((m) => m.role === "assistant")
        ?.content?.trim() || "";
    const assistantJustAskedQuestion = /\?\s*$/.test(lastAssistant);

    const allowAnalysis = hasExplicitCode || explicitAsk;
    if (!allowAnalysis || (assistantJustAskedQuestion && !hasExplicitCode)) {
      return [];
    }
  }

  const analysisPrompt = `
You are an expert coding tutor analyzing ${isAIResponse ? "AI assistant code" : "student code"} for a LeetCode-style problem.

PROBLEM CONTEXT:
${problemDescription}

${Array.isArray(testCases) && testCases.length > 0 ? `PROBLEM TEST CASES (JSON):\n${JSON.stringify(testCases)}\n` : ""}

${currentCode ? `CURRENT CODE IN EDITOR:\n\`\`\`python\n${currentCode}\n\`\`\`\n` : ""}

CONVERSATION HISTORY:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

CURRENT ${isAIResponse ? "AI ASSISTANT" : "STUDENT"} MESSAGE:
"${message}"

TASK: Analyze the ${isAIResponse ? "AI assistant's response" : "student's message"} for any code snippets that could be added to their code editor. Look for:

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
- PROPER INDENTATION: Use 4 spaces for each indentation level
- CLEAN FORMATTING: Remove unnecessary whitespace, ensure consistent spacing

INSERTION INTELLIGENCE:
- **Imports**: Place at top of file, after existing imports
- **Variables**: Place at logical location within function scope  
- **Functions**: Place at module level with proper spacing
- **Statements**: Maintain proper indentation and control flow
- **Algorithm patterns**: Provide foundational setup code
- **Code Formatting**: Ensure proper Python indentation (4 spaces per level), clean line breaks

STRICT AVOIDANCE:
- Do NOT propose incomplete control-flow headers without body (e.g., "for s in strs:", "if x:") unless the user explicitly asked for that exact header.
- Prefer concrete, context-safe statements (e.g., d[key].append(strs[i])) over scaffolding.

SPECIAL RULES FOR AI RESPONSES:
- If analyzing AI assistant responses, be VERY selective - only extract 1-2 most relevant snippets
- Only suggest code that is NOT already present in the current file
- Focus on the immediate next step the student needs, not all possible improvements
- Ignore explanatory code examples - only extract actionable additions
- Skip code that duplicates existing logic or variables
- Prefer missing pieces over alternative implementations

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
    const raw = await llmJson(analysisPrompt, {
      temperature: 0.1,
      maxTokens: 1000,
    });
    let analysisResult;
    try {
      analysisResult = JSON.parse(raw || '{"codeSnippets": []}');
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return [];
    }

    // Add unique IDs and validate structure
    const codeSnippets: CodeSnippet[] = (analysisResult.codeSnippets || []).map(
      (
        snippet: {
          [k: string]: unknown;
          insertionHint?: {
            type?: string;
            scope?: string;
            description?: string;
          };
        },
        index: number,
      ) => ({
        id: `snippet-${Date.now()}-${index}`,
        code: typeof snippet.code === "string" ? snippet.code : "",
        language:
          typeof snippet.language === "string"
            ? (snippet.language as string)
            : "python",
        isValidated:
          typeof snippet.isValidated === "boolean"
            ? (snippet.isValidated as boolean)
            : false,
        insertionType:
          typeof snippet.insertionType === "string"
            ? (snippet.insertionType as
                | "smart"
                | "cursor"
                | "append"
                | "prepend"
                | "replace")
            : "smart",
        insertionHint: {
          type:
            typeof snippet.insertionHint?.type === "string"
              ? (snippet.insertionHint.type as
                  | "import"
                  | "variable"
                  | "function"
                  | "statement"
                  | "class")
              : "statement",
          scope:
            typeof snippet.insertionHint?.scope === "string"
              ? (snippet.insertionHint.scope as "global" | "function" | "class")
              : "function",
          description:
            typeof snippet.insertionHint?.description === "string"
              ? snippet.insertionHint.description
              : "Code snippet",
        },
      }),
    );

    const normalizedMessage = message.replace(/\s+/g, " ").toLowerCase();
    console.log(
      `[CodeSnippets] Processing ${codeSnippets.length} raw snippets through validation`,
    );

    const initialFiltered = codeSnippets.filter(
      (snippet) =>
        snippet.code && snippet.code.trim().length > 0 && snippet.isValidated,
    );
    console.log(
      `[CodeSnippets] After basic validation: ${initialFiltered.length} snippets`,
    );

    const validated = initialFiltered.filter((snippet, index) => {
      const code = snippet.code.trim();
      const lower = code.replace(/\s+/g, " ").toLowerCase();
      const lineCount = code.split("\n").length;
      const isControlFlow =
        /(^|\n)\s*(if|for|while)\b/.test(code) ||
        /(^|\n)\s*(class|def)\b/.test(code);
      const tooLong = code.length > 200 || lineCount > 3;
      const appearsInUserText = normalizedMessage.includes(lower);
      const isSimpleType =
        snippet.insertionHint?.type === "import" ||
        snippet.insertionHint?.type === "variable" ||
        snippet.insertionHint?.type === "statement";

      // For AI responses, be very liberal with validation
      let passes;
      if (isAIResponse) {
        // For AI responses: almost always allow if reasonable length
        const reasonableLength = code.length <= 2000 && lineCount <= 50;
        passes = reasonableLength && code.trim().length > 0; // Very permissive for AI
      } else {
        // Original strict validation for user messages
        const allowedByPolicy = appearsInUserText || isSimpleType;
        passes = allowedByPolicy && !isControlFlow && !tooLong;
      }

      console.log(
        `[CodeSnippets] Snippet ${index}: type=${snippet.insertionHint?.type}, code="${code.substring(0, 100)}...", codeLength=${code.length}, lineCount=${lineCount}, passes=${passes}, isAI=${isAIResponse}, reasons: controlFlow=${isControlFlow}, tooLong=${tooLong}, appearsInUserText=${appearsInUserText}, isSimpleType=${isSimpleType}, reasonableLength=${isAIResponse ? code.length <= 2000 && lineCount <= 50 : "N/A"}`,
      );

      return passes;
    });

    // Dedupe within the same response
    const normalize = (s: CodeSnippet) =>
      `${s.insertionHint?.type || ""}|${s.insertionHint?.scope || ""}|${(s.code || "").replace(/\s+/g, " ").trim()}`;
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
    console.error("Error analyzing code snippets:", error);
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
  cursorPosition?: { line: number; column: number },
): Promise<{ newCode: string; insertedAtLine?: number; rationale?: string }> {
  // 1) Deterministic, fast path: anchor-based insertion if the first line exists
  try {
    const snippetLines = (snippet.code || "").split("\n");
    const firstLineTrim = (snippetLines[0] || "").trim();
    if (firstLineTrim.length > 0) {
      const lines = code.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === firstLineTrim) {
          // If next lines already match snippet continuation, skip (already inserted)
          const secondLineTrim = (snippetLines[1] || "").trim();
          if (secondLineTrim && lines[i + 1]?.trim() === secondLineTrim) {
            return {
              newCode: code,
              insertedAtLine: -1,
              rationale: "Snippet already present after anchor",
            };
          }
          const indent = lines[i].match(/^\s*/)?.[0] || "";
          const toInsert = snippetLines
            .slice(1)
            .map((l, idx) => (idx === 0 ? indent + l.trim() : indent + l));
          const newLines = [...lines];
          newLines.splice(i + 1, 0, ...toInsert);
          const newCode = newLines.join("\n");
          console.log(
            "[ai-chat] insert_snippet anchor-based insertion at line",
            i + 1,
          );
          return {
            newCode,
            insertedAtLine: i + 1,
            rationale: "Anchor-based placement after matching first line",
          };
        }
      }
    }
  } catch (e) {
    console.warn(
      "[ai-chat] Anchor-based insertion failed, continuing to model placement:",
      e,
    );
  }

  const placementPrompt = `Analyze this Python code and determine the best place to insert a code snippet.

CURRENT FILE:
---BEGIN FILE---
${code}
---END FILE---

SNIPPET TO INSERT:
---BEGIN SNIPPET---
${snippet.code}
---END SNIPPET---

Find the most logical place for this snippet. Consider code flow, variable scope, and algorithm structure.

Output JSON:
{
  "insertAtLine": <0-based line number>,
  "indentation": "<spaces for proper indentation>",
  "rationale": "<brief reason>"
}`;

  console.log("[ai-chat] insert_snippet using main model for smart placement");
  const raw = await llmJson(placementPrompt, { maxTokens: 500 });
  let insertAtLine: number | undefined;
  let indent: string | undefined;
  let rationale: string | undefined;
  try {
    const parsed = JSON.parse(raw || "{}");
    if (typeof parsed.insertAtLine === "number")
      insertAtLine = parsed.insertAtLine;
    if (typeof parsed.indentation === "string") indent = parsed.indentation;
    if (typeof parsed.rationale === "string") rationale = parsed.rationale;
  } catch {
    // ignore
  }

  // If snippet already exists or placement invalid, return original
  if (insertAtLine === -1 || insertAtLine === undefined || insertAtLine < 0) {
    return { newCode: code, insertedAtLine: -1, rationale };
  }

  // Deterministic insertion of ONLY the provided snippet
  const lines = code.split("\n");
  const safeInsertLine = Math.min(Math.max(0, insertAtLine), lines.length);
  // Derive indentation if not provided
  const contextIndent =
    indent !== undefined
      ? indent
      : lines[safeInsertLine]?.match(/^\s*/)?.[0] || "";

  const snippetLines = snippet.code.split("\n");
  const indentedSnippet: string[] = snippetLines.map((line, idx) => {
    if (idx === 0) {
      return contextIndent + line.trim();
    }
    return contextIndent + line;
  });

  const newLines = [...lines];
  newLines.splice(safeInsertLine, 0, ...indentedSnippet);
  const newCode = newLines.join("\n");
  return { newCode, insertedAtLine: safeInsertLine, rationale };
}

/**
 * Generate interactive visualization component for a given problem
 */
async function generateVisualizationComponent(problem: {
  title: string;
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  category: string;
  difficulty: string;
  functionSignature?: string;
}): Promise<{ code: string; title: string }> {
  console.log(
    `[generateVisualizationComponent] Generating for problem: ${problem.title}`,
  );

  const prompt = `Generate a complete React component that visualizes the algorithm for this LeetCode problem:

**Problem:** ${problem.title}
**Category:** ${problem.category}
**Difficulty:** ${problem.difficulty}

**Description:**
${problem.description}

**Examples:**
${problem.examples
  .map(
    (ex, i) => `Example ${i + 1}:
Input: ${ex.input}
Output: ${ex.output}
${ex.explanation ? `Explanation: ${ex.explanation}` : ""}`,
  )
  .join("\n\n")}

**Requirements:**
1. Create a complete React component that demonstrates the algorithm step-by-step
2. Use React hooks: useState, useEffect, useMemo, useCallback
3. Include interactive controls: Play/Pause, Reset, Speed adjustment
4. Use Framer Motion for smooth animations (import { motion, AnimatePresence } from 'framer-motion')
5. Use Tailwind CSS for styling with dark mode support
6. Include step descriptions and current algorithm state
7. Focus on essential features - avoid overly complex nested components or excessive helper functions
8. Keep the main component structure clean and readable
9. Use these UI components from our design system:
   - Button from '@/components/ui/button'
   - Card, CardContent, CardHeader, CardTitle from '@/components/ui/card'
   - Slider from '@/components/ui/slider'
   - Label from '@/components/ui/label'
8. Use lucide-react icons: Play, Pause, RotateCcw, Shuffle
9. Show the algorithm working on the example data
10. Make it educational and visually appealing

**Component Structure:**
- Component name should be descriptive (e.g., TwoSumVisualizer, BubbleSortVisualizer)
- Include default example data based on the problem examples
- Show current step, comparisons, swaps, or other relevant algorithm operations
- Use appropriate data structures (arrays, trees, graphs) based on the problem type

Return ONLY the complete React component code, no explanations or markdown formatting. The component should be production-ready and self-contained.`;

  try {
    const componentCode = await llmText(prompt, {
      temperature: 0.7,
      maxTokens: 8000, // Increased to prevent truncation of complex components
    });

    // Clean up the response to ensure it's just the component code
    try {
      console.log(
        `[generateVisualizationComponent] Prompt length: ${prompt.length} chars | descriptionLen=${problem.description?.length || 0} | examples=${Array.isArray(problem.examples) ? problem.examples.length : 0}`,
      );
    } catch (_) {
      // noop
    }
    const cleanedCode = componentCode
      .replace(/```typescript/g, "")
      .replace(/```tsx/g, "")
      .replace(/```javascript/g, "")
      .replace(/```jsx/g, "")
      .replace(/```/g, "")
      .trim();

    // TEMPORARILY DISABLED: Skip sanitization to see raw GPT output
    const finalCode = cleanedCode; // sanitizeGeneratedTsx(cleanedCode);

    // Check if component was truncated and log for debugging
    const wasTruncated =
      cleanedCode.includes("....[truncated]") ||
      (!cleanedCode.trim().endsWith("}") && !cleanedCode.trim().endsWith(";"));

    if (wasTruncated) {
      console.warn(
        `[generateVisualizationComponent] Component appears truncated for ${problem.title} (${cleanedCode.length} chars)`,
      );
    }

    try {
      console.log(
        `[generateVisualizationComponent] Generated component for ${problem.title} (${cleanedCode.length} chars) - Truncated: ${wasTruncated}\n--- CODE START ---\n${cleanedCode.slice(0, 500)}\n--- CODE END (last 300 chars) ---\n${cleanedCode.slice(-300)}\n-------------------`,
      );
    } catch (e) {
      console.warn(
        "[generateVisualizationComponent] Preview logging failed:",
        e,
      );
    }

    return {
      code: finalCode,
      title: `${problem.title} Visualizer`,
    };
  } catch (error) {
    // Include small snippet of componentCode if available for debugging
    try {
      const maybeStr = (error as unknown as { message?: string })?.message;
      console.error(
        "[generateVisualizationComponent] Error:",
        maybeStr || error,
      );
    } catch (_) {
      console.error("[generateVisualizationComponent] Error (raw):", error);
    }
    throw error;
  }
}

/**
 * CORS headers for all responses
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

/**
 * Main handler function
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API key and initialize client
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("OPENAI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          message: "OpenAI API key is not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize OpenAI client with the validated key
    openai = new OpenAI({
      apiKey: openaiKey,
    });
    console.log(
      `[ai-chat] Model selection: model=${configuredModel} | api=${useResponsesApi ? "Responses" : "Chat"} | source=${modelSource}`,
    );
    // Parse request body
    const body: RequestBody = await req.json();
    const {
      message,
      problemDescription,
      conversationHistory,
      action,
      code,
      snippet,
      cursorPosition,
      testCases,
      currentCode,
      diagram: diagramRequested,
      preferredEngines,
      sessionId,
      userId,
      problem,
    } = body;

    // Clear chat action
    if (req.method === "POST" && action === "clear_chat") {
      if (!sessionId || !userId) {
        return new Response(
          JSON.stringify({
            error: "Missing sessionId or userId for clear_chat action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        // Delete all messages for this session
        const { error: messagesError } = await supabaseAdmin
          .from("ai_chat_messages")
          .delete()
          .eq("session_id", sessionId);

        if (messagesError) {
          console.error("Error deleting messages:", messagesError);
          throw messagesError;
        }

        // Delete the session itself
        const { error: sessionError } = await supabaseAdmin
          .from("ai_chat_sessions")
          .delete()
          .eq("id", sessionId)
          .eq("user_id", userId);

        if (sessionError) {
          console.error("Error deleting session:", sessionError);
          throw sessionError;
        }

        return new Response(
          JSON.stringify({ ok: true, message: "Chat cleared successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error) {
        console.error("Error clearing chat:", error);
        return new Response(
          JSON.stringify({ ok: false, error: "Failed to clear chat" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Generate visualization component action
    if (req.method === "POST" && action === "generate_visualization") {
      if (!problem) {
        return new Response(
          JSON.stringify({
            error: "Missing problem object for generate_visualization action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        // Debug: summarize incoming payload
        try {
          console.log("[generate_visualization] Payload summary:", {
            title: problem.title,
            descriptionLen: problem.description?.length || 0,
            examples: Array.isArray(problem.examples)
              ? problem.examples.length
              : 0,
            category: problem.category,
            difficulty: problem.difficulty,
            hasFunctionSignature: !!problem.functionSignature,
          });
        } catch (_) {
          // noop
        }
        const visualizationComponent =
          await generateVisualizationComponent(problem);

        // Debug: log preview of generated code
        try {
          const code = visualizationComponent?.code || "";
          console.log(
            `[generate_visualization] Generated code length=${code.length} | title="${visualizationComponent?.title || ""}"\n--- SERVER CODE START ---\n${code.slice(0, 400)}\n--- SERVER CODE END (last 250) ---\n${code.slice(-250)}\n-----------------------------------`,
          );
        } catch (e) {
          console.warn(
            "[generate_visualization] Failed to log code preview:",
            e,
          );
        }

        return new Response(
          JSON.stringify({
            response: `Generated interactive visualization for "${problem.title}"`,
            visualizationComponent,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error) {
        console.error("Error generating visualization component:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to generate visualization component",
            response:
              "Sorry, I encountered an error generating the interactive visualization. Please try again.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Validate required fields for normal chat operations
    if (!message || !problemDescription) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: message, problemDescription",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Smart insertion action
    if (req.method === "POST" && action === "insert_snippet") {
      if (!code || !snippet) {
        return new Response(
          JSON.stringify({
            error: "Missing code or snippet for insert_snippet action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const result = await insertSnippetSmart(
        code,
        snippet,
        problemDescription,
        cursorPosition,
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If diagram explicitly requested, prioritize diagram and skip snippet analysis
    if (diagramRequested) {
      const diagram = await maybeGenerateDiagram(
        message,
        problemDescription,
        conversationHistory || [],
        true,
        preferredEngines,
      );
      const responseText = diagram
        ? diagram.engine === "mermaid"
          ? await explainMermaid(diagram.code, problemDescription)
          : "Here is an interactive diagram of the approach."
        : "Unable to create a diagram for this message.";
      const aiResponse: AIResponse = { response: responseText, diagram };
      return new Response(JSON.stringify(aiResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default chat behavior: generate conversation + analyze snippets + opportunistic diagram
    const [conversationResponse, userCodeSnippets, diagram] = await Promise.all(
      [
        generateConversationResponse(
          message,
          problemDescription,
          conversationHistory || [],
          testCases,
          currentCode,
        ),
        analyzeCodeSnippets(
          message,
          conversationHistory || [],
          problemDescription,
          testCases,
          currentCode,
        ),
        maybeGenerateDiagram(
          message,
          problemDescription,
          conversationHistory || [],
          false,
          preferredEngines,
        ),
      ],
    );

    // Skip AI response analysis - code blocks now have direct "Add to Editor" buttons
    const aiCodeSnippets: CodeSnippet[] = [];
    console.log(
      `[Main] Skipping AI response analysis - using direct code block buttons instead`,
    );

    // Combine code snippets from user message and AI response
    const codeSnippets = [...userCodeSnippets, ...aiCodeSnippets];
    console.log(
      `[Main] Combined snippets: user=${userCodeSnippets.length}, ai=${aiCodeSnippets.length}, total=${codeSnippets.length}`,
    );

    // Heuristic: suggest diagram if user mentions visualization OR problem classes where visuals help
    const userAskedForDiagram =
      /\b(visualize|diagram|flowchart|mermaid|draw)\b/i.test(message);
    const contextHints =
      /\b(linked list|two pointers|tree|graph|dfs|bfs|heap|priority queue|sliding window|dp|dynamic programming)\b/i.test(
        [message, ...conversationHistory.slice(-2).map((m) => m.content)].join(
          " ",
        ),
      );
    const suggestDiagram = !!diagram || userAskedForDiagram || contextHints;

    const aiResponse: AIResponse = {
      response: conversationResponse,
      codeSnippets: codeSnippets.length > 0 ? codeSnippets : undefined,
      diagram: diagram,
      suggestDiagram,
    };

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-chat function:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
