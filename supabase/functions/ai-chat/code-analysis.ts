import { llmText, llmJson, llmJsonFast, llmWithSessionContext, getOrCreateSessionContext, updateSessionContext } from "./openai-utils.ts";
import { CodeSnippet, ChatMessage, ContextualResponse } from "./types.ts";

/**
 * Lightweight sanitizer to fix common TSX issues in generated components before returning to client.
 * - Removes stray markdown fences
 * - Fixes dangling nullish-coalescing operators like `v[0] ??` -> `v[0] ?? 1`
 * - Normalizes Slider onValueChange to handle array/scalar safely
 * - Attempts to balance common unmatched parens/brackets at end of lines
 */
export function sanitizeGeneratedTsx(input: string): string {
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
  const lastLine = lines[lines.length - 1].trim();

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

/**
 * Main conversation handler - generates AI response for general chat
 * Now uses context-aware approach to optimize token usage
 */
export async function generateConversationResponse(
  message: string,
  problemDescription: string,
  conversationHistory: ChatMessage[],
  testCases?: unknown[],
  currentCode?: string,
  sessionId?: string, // context management key
  options?: { previousResponseId?: string | null; forceNewContext?: boolean },
): Promise<string> {
  // Check if we can use context-aware approach or need to fallback
  if (!sessionId) {
    console.log("[chat] No session ID provided, using legacy approach");
    return await generateLegacyChatResponse(message, problemDescription, conversationHistory, testCases, currentCode);
  }

  // Use context-aware approach for optimal token usage
  const serializedTests = Array.isArray(testCases) && testCases.length > 0 
      ? JSON.stringify(testCases)
      : undefined;

  // Analyze message for request/intent signals
  const hasExplicitCode = /```[\s\S]*?```|`[^`]+`/m.test(message);
  const explicitCodeRequest =
    /(\b(write|show|give|provide)\s+(me\s+)?(code|snippet)\b)|\b(insert|add)\s+(code|line|lines|snippet)\b|\b(implement|import|define)\b/i.test(
      message,
    );
  const stuckIndicators = /(stuck|blocked|don'?t know|not sure|lost|confused)/i.test(
      message,
    );
  const explicitHintAsk = /\b(hint|nudge)\b/i.test(message);
  const explanationRequested = /(explain|explanation|walk\s+me\s+through|remind\s+me|what\s+is|why\s+do\s+we|step\s*by\s*step)/i.test(message);
  const isFirstTurn = (conversationHistory || []).length === 0;
  // Hints allowed only if explicitly asked or user signals being stuck, but NEVER when an explanation is requested
  const allowHint = (explicitHintAsk || stuckIndicators) && !explanationRequested;
  // Code allowed when explicitly asked or user is stuck; never when explanation or hint is explicitly requested (unless explicitly asked for code)
  const allowCode = (!explanationRequested && !explicitHintAsk) && (hasExplicitCode || explicitCodeRequest || stuckIndicators) && (!isFirstTurn || hasExplicitCode || explicitCodeRequest);
  // Detect direct questions to prioritize an answer first
  const directQuestion = /\?|\b(what|how|why|explain|can\s+you\s+explain|help\s+me\s+understand)\b/i.test(message);

  let contextualResponse: ContextualResponse;
  
  try {
    // Always use the same comprehensive context approach
    // Responses API will handle continuation automatically via previous_response_id
    const chatContext = `You are SimplyAlgo's AI stocastic coding coach. Use a friendly, concise tone and guide students step by step.

TEST EXECUTION CONTEXT:
- The student's code will be executed automatically on Judge0 against the official test cases.
- Judge0 handles all imports (List, Optional, etc.) and basic Python setup automatically.
- CRITICAL: Do NOT include any import statements in your code suggestions
- CRITICAL: When providing code, always wrap it in \`\`\`python code blocks for proper rendering

TEACHING APPROACH - CRITICAL RULES:
- Do NOT include unsolicited praise (e.g., "Great start", "You're on track").
- Mode selection:
  - directAnswerMode = ${directQuestion}.
  - explanationMode = ${explanationRequested}.
  - If explanationMode is true: Provide a concise explanation in 3–5 sentences tailored to CURRENT CODE. Use one small concrete example and a simple analogy if helpful. No hints. No Socratic question. Aim for ~70–110 words.
  - If explanationMode is false AND directAnswerMode is true: Answer directly first (<= 40 words). After answering, optionally ask ONE short follow-up question (<= 14 words). Do NOT preface with words like "First" or "Next". Do NOT restate the problem.
  - If neither explanationMode nor directAnswerMode: Provide one brief, neutral next-step explanation (<= 26 words) grounded in CURRENT CODE, then ask exactly ONE concise Socratic question (<= 16 words).
- Do NOT provide hints or code unless permitted below.
- Hint policy: allowHint = ${allowHint}. If true, include at most ONE short conceptual hint (<= 12 words). No code and do not reveal the answer.
- Code policy: allowCode = ${allowCode}. If true, you may include at most ONE tiny code block (1–3 lines) with a one‑sentence explanation. No full functions.
- Keep total reply under ~55 words. Friendly but concise and neutral.
- Focus on the immediate next step based on the student's current code.
- Build upon the current code in the editor - analyze what they have and suggest the next logical step.

CODE ANALYSIS PATTERNS:
- If CURRENT CODE is empty or minimal: Provide approach guidance and thinking framework.
- If CURRENT CODE has correct logic: Acknowledge good parts, suggest next step using existing variables.
- If CURRENT CODE has wrong logic: Gently identify issues, guide toward a correct path.
- Always reference specific lines and symbols from CURRENT CODE.
- Use existing variables/functions in suggestions.
- Build incrementally on what's already written.
- Treat code as “minimal” if it’s empty, only a function signature, or lacks control flow (no loops/conditions).

PROBLEM CONTEXT:
${problemDescription}

${serializedTests ? `PROBLEM TEST CASES (JSON):\n${serializedTests}\n` : ""}
${currentCode ? `CURRENT CODE IN EDITOR:\n\`\`\`python\n${currentCode}\n\`\`\`\n` : ""}

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

CURRENT STUDENT MESSAGE: "${message}"

Code policy: allowCode = ${allowCode}

Response requirements:
- If explanationMode is true: Output a concise paragraph of 3–5 sentences that (1) states the core idea, (2) walks through a small concrete example, and (3) uses a simple analogy if helpful. No hints. No questions. No code.
- Else begin with a brief next-step explanation (<= 30 words) based on CURRENT CODE.
- Then ask exactly ONE Socratic question (<= 18 words) only if not in explanationMode.
- If allowHint is true and allowCode is false, add one short conceptual hint (no code).
- If allowCode is true, you may add one tiny code block formatted as:\n\n${"```"}python\n<1-3 lines>\n${"```"}\n\nwith a one‑sentence rationale.
- Otherwise, provide no code or extra commentary.`;

    const session = sessionId || `anon-${Date.now()}`;
    // If client provided a previousResponseId (e.g., after cold start), seed the session cache
    if (options?.previousResponseId) {
      // Ensure context exists then update with provided response id and current code snapshot
      getOrCreateSessionContext(session, 'chat', currentCode || '');
      updateSessionContext(session, options.previousResponseId, currentCode || '');
    }

    contextualResponse = await llmWithSessionContext(
      session,
      chatContext,
      'chat',
      currentCode || '',
      {
        temperature: 0.3,
        maxTokens: 220,
        forceNewContext: options?.forceNewContext === true,
      }
    );

    console.log(`[chat] Context-aware response generated - Tokens saved: ${contextualResponse.tokensSaved || 0}`);
    return contextualResponse.content || "I'm sorry, I couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error("[chat] Context-aware generation failed:", error);
    return "Sorry, I hit a snag generating a response. Please try again.";
  }
}

/**
 * Code analysis handler - analyzes student messages for insertable code snippets
 */
export async function analyzeCodeSnippets(
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
You are an expert coding tutor analyzing ${isAIResponse ? "AI assistant code" : "student code"} for a DSA-style problem.

PROBLEM CONTEXT:
${problemDescription}

${Array.isArray(testCases) && testCases.length > 0 ? `PROBLEM TEST CASES (JSON):\n${JSON.stringify(testCases)}\n` : ""}

${currentCode ? `CURRENT CODE IN EDITOR:\n${"```"}python\n${currentCode}\n${"```"}\n` : ""}

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
export async function insertSnippetSmart(
  code: string,
  snippet: CodeSnippet,
  problemDescription: string,
  cursorPosition?: { line: number; column: number },
  contextHint?: string,
): Promise<{ newCode: string; insertedAtLine?: number; rationale?: string }> {
  // Skip anchor-based insertion for now - it was causing false positives
  // Let AI handle all insertion decisions for better context awareness
  console.log("[ai-chat] Skipping anchor-based insertion, using AI placement for better context awareness");

  const placementPrompt = `You are a smart code merging assistant. Analyze the current code and the snippet to insert. Your job is to intelligently merge them with full context awareness.

CURRENT FILE:
---BEGIN FILE---
${code}
---END FILE---

SNIPPET TO INSERT:
---BEGIN SNIPPET---
${snippet.code}
---END SNIPPET---

COACHING HINT (what to fix):
${contextHint || "(no explicit hint)"}

CRITICAL CONTEXT ANALYSIS:
- Analyze the current code structure, variables, and logic flow
- Understand what the student is trying to build based on existing code
- Consider the algorithm pattern and where this snippet fits in the solution
- Look for incomplete functions, missing initializations, or logical next steps

SMART INSERTION RULES:
1. If the snippet code already exists in the current file, return insertAtLine: -1
2. Find the most logical place considering:
   - Algorithm flow and current code structure
   - Variable scope and dependencies (if initializing variables, place at function start)
   - Function boundaries and proper indentation
   - What the student appears to be building based on existing code
3. Insert as new lines, don't replace existing code unless fixing bugs
4. Consider the logical sequence: imports → initialization → main logic → return

MERGE CLEANUP:
- If the new snippet contains a return from inside a function, remove any unreachable lines that occur after that return within the same function body (e.g., duplicate loops or alternate implementations).
- If both bin(i).count('1') and DP relation (res[i] = res[i >> 1] + (i & 1)) implementations are present for the same function, keep only one consistent implementation based on continuity with surrounding code. Prefer DP if both appear.
- CRITICAL: If the snippet fixes bugs in similar existing code (e.g., n >> 1 vs n >>= 1, or return n vs return count), REPLACE the buggy lines rather than marking as duplicate. Look for logical errors, missing assignments, wrong return values.

Output JSON:
{
  "insertAtLine": <0-based line number, or -1 if code already exists>,
  "indentation": "<spaces for proper indentation>",
  "rationale": "<brief reason for placement or why skipped>"
}`;

  console.log("[ai-chat] insert_snippet using main model for smart placement");
  console.log("[ai-chat] Snippet to insert:", snippet.code);
  console.log("[ai-chat] Current code length:", code.length);
  
  let insertAtLine: number | undefined;
  let indent: string | undefined;
  let rationale: string | undefined;
  
  try {
    const raw = await llmJson(placementPrompt, { maxTokens: 500 });
    console.log("[ai-chat] LLM response for insertion:", raw);
    
  try {
    const parsed = JSON.parse(raw || "{}");
      console.log("[ai-chat] Parsed insertion result:", parsed);
    if (typeof parsed.insertAtLine === "number")
      insertAtLine = parsed.insertAtLine;
    if (typeof parsed.indentation === "string") indent = parsed.indentation;
    if (typeof parsed.rationale === "string") rationale = parsed.rationale;
    } catch (parseError) {
      console.error("[ai-chat] Failed to parse LLM response:", parseError);
      throw new Error(`Invalid JSON response from LLM: ${raw}`);
    }
  } catch (llmError) {
    console.error("[ai-chat] LLM call failed:", llmError);
    throw new Error(`LLM call failed: ${llmError.message}`);
  }

  // No language-specific hardcoded placement heuristics — rely on model analysis.

  // If model claims snippet already exists or cannot place, attempt repairs or controlled replacement
  if (insertAtLine === -1 || insertAtLine === undefined || insertAtLine < 0) {
    const hintLower = (contextHint || '').toLowerCase();
    const isCoachingInsert = hintLower.includes('[coaching snippet insertion]');
    const wantsFix = /(fix|replace|correct|broken|bug|cleanup|clean up|delete|remove|rewrite|overhaul)/i.test(
      contextHint || '',
    );
    const allowDestructiveFixes = isCoachingInsert || wantsFix;

    // Step 1: lightweight deterministic bug-fix heuristics
    let fixed = code;
    fixed = fixed.replace(/^(\s*)(n)\s*>>\s*1\s*$/gm, "$1$2 >>= 1");
    if (/\bcount\b/.test(snippet.code)) {
      fixed = fixed.replace(/^(\s*)return\s+n\s*$/gm, "$1return count");
    }
    if (fixed !== code) {
      return {
        newCode: fixed,
        insertedAtLine: -1,
        rationale: rationale ? `${rationale}; applied heuristic fixes` : 'applied heuristic fixes',
      };
    }

    // Step 2: if allowed, escalate to controlled replacement at function level
    if (allowDestructiveFixes) {
      const lines = code.split('\n');
      const snippetLines = snippet.code.split('\n');

      // Helper: find function range by name
      const getFunctionNameFromSnippet = (): string | null => {
        for (const s of snippetLines) {
          const m = s.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
          if (m) return m[1];
        }
        return null;
      };

      const findFunctionRangeByName = (name: string): { start: number; end: number } | null => {
        let start = -1;
        for (let i = 0; i < lines.length; i++) {
          if (/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/.test(lines[i])) {
            const m = lines[i].match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            if (m && m[1] === name) {
              start = i;
              break;
            }
          }
        }
        if (start === -1) return null;
        // Find end by scanning until next top-level def with indentation <= current def
        const defIndent = (lines[start].match(/^\s*/)?.[0] || '').length;
        let end = lines.length;
        for (let j = start + 1; j < lines.length; j++) {
          const indent = (lines[j].match(/^\s*/)?.[0] || '').length;
          if (/^\s*def\s+/.test(lines[j]) && indent <= defIndent) {
            end = j;
            break;
          }
        }
        return { start, end };
      };

      // Helper: find enclosing function around a line
      const findEnclosingFunction = (lineIndex: number): { start: number; end: number } | null => {
        let start = -1;
        for (let i = lineIndex; i >= 0; i--) {
          if (/^\s*def\s+/.test(lines[i])) { start = i; break; }
        }
        if (start === -1) return null;
        const defIndent = (lines[start].match(/^\s*/)?.[0] || '').length;
        let end = lines.length;
        for (let j = start + 1; j < lines.length; j++) {
          const indent = (lines[j].match(/^\s*/)?.[0] || '').length;
          if (/^\s*def\s+/.test(lines[j]) && indent <= defIndent) { end = j; break; }
        }
        return { start, end };
      };

      const snippetFuncName = getFunctionNameFromSnippet();
      let target: { start: number; end: number } | null = null;

      if (snippetFuncName) {
        target = findFunctionRangeByName(snippetFuncName);
      }
      if (!target && cursorPosition && typeof cursorPosition.line === 'number') {
        target = findEnclosingFunction(Math.max(0, Math.min(lines.length - 1, cursorPosition.line)));
      }

      // Replace strategy
      if (target) {
        const { start, end } = target;
        // If we're replacing body only (snippet has no def) but target exists, keep def line
        let replacement: string[];
        if (!snippetFuncName && /^\s*def\s+/.test(lines[start])) {
          const bodyIndent = (lines[start].match(/^\s*/)?.[0] || '') + '    ';
          const indentedSnippet = snippetLines.map((l) => (l.trim().length ? bodyIndent + l.trim() : l));
          replacement = [lines[start], ...indentedSnippet];
        } else {
          replacement = snippetLines;
        }
        const newLines = [
          ...lines.slice(0, start),
          ...replacement,
          ...lines.slice(end),
        ];
        return {
          newCode: newLines.join('\n'),
          insertedAtLine: start,
          rationale: (rationale ? rationale + '; ' : '') + 'replaced conflicting function region',
        };
      }

      // Fallback: replace entire file if unrecoverable and snippet is small/safe
      const snippetLen = snippet.code.trim().length;
      if (snippetLen > 0 && snippetLen < 4000) {
        return {
          newCode: snippet.code,
          insertedAtLine: 0,
          rationale: (rationale ? rationale + '; ' : '') + 'file-level replacement due to irreparable code',
        };
      }
    }

    // If not allowed to be destructive or no safe target found, return original code with rationale
    return { newCode: code, insertedAtLine: -1, rationale: rationale ? rationale : 'no safe insertion point; non-destructive' };
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

  let newLines = [...lines];
  newLines.splice(safeInsertLine, 0, ...indentedSnippet);

  // Simple deterministic cleanup: if we inserted a return within a function, strip trivial unreachable duplicates after it
  try {
    // Find the function start above insertion (Python-style `def`)
    let funcStart = -1;
    for (let i = safeInsertLine; i >= 0; i--) {
      if (/^\s*def\s+\w+\s*\(/.test(newLines[i])) { funcStart = i; break; }
    }
    if (funcStart !== -1) {
      // Find the first return line inside function after insertion
      let firstReturn = -1;
      for (let i = safeInsertLine; i < newLines.length; i++) {
        if (/^\s*return\b/.test(newLines[i])) { firstReturn = i; break; }
      }
      if (firstReturn !== -1) {
        // If there are simple computed lines after return like alternate loops or extra return, trim trailing duplicate block
        // Heuristic: if following lines include `for i in range` or another `return res`, drop them
        const tail = newLines.slice(firstReturn + 1);
        const hasAltLoop = tail.some(l => /for\s+i\s+in\s+range\s*\(/.test(l));
        const hasSecondReturn = tail.some(l => /^\s*return\b/.test(l));
        if (hasAltLoop || hasSecondReturn) {
          // keep only up to firstReturn
          newLines = newLines.slice(0, firstReturn + 1);
        }
      }
    }
  } catch (_) {
    // non-fatal cleanup error; ignore
  }

  const newCode = newLines.join("\n");
  return { newCode, insertedAtLine: safeInsertLine, rationale };
}

/**
 * Generate interactive visualization component for a given problem
 */
export async function generateVisualizationComponent(problem: {
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

  const prompt = `Generate a complete React component that visualizes the algorithm for this DSA problem:

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
