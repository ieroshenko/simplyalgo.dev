import { llmText, llmJson, llmJsonFast } from "./openai-utils.ts";
import { CodeSnippet, ChatMessage } from "./types.ts";

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

/**
 * Main conversation handler - generates AI response for general chat
 */
export async function generateConversationResponse(
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
- Judge0 handles all imports (List, Optional, etc.) and basic Python setup automatically.
- Do NOT ask about basic Python syntax like colons, indentation, or function definitions.
- Do NOT ask the student to run tests or provide test cases.
- Do NOT ask about function scaffolding (e.g., self usage) or basic typing/import boilerplate unless the student explicitly asks.
- Provide hints first; only provide code if the student requests it or has shared code.
- Once you believe the student's solution is likely correct, then ask ONE follow-up about time and space complexity.

PROBLEM CONTEXT:
${problemDescription}

${serializedTests ? `PROBLEM TEST CASES (JSON):\n${serializedTests}\n` : ""}

${currentCode ? `CURRENT CODE IN EDITOR:\n${"```"}python\n${currentCode}\n${"```"}\n` : ""}

CONVERSATION HISTORY:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

CURRENT STUDENT MESSAGE:
"${message}"

Your role:
1. Coach with a Socratic style, but be helpful when students need code examples.
2. Ask ONE concise question (<= 25 words) to guide their thinking.
3. Provide helpful hints when students are stuck or ask for guidance. do not provide hints otherwise.
4. Keep tone friendly and educational.
5. Do not provide code examples unless explicitly asked for.
6. Do not provide solutions unless explicitly asked for.Ask one guiding question at a time. If the student does not know the answer, ask another question. guiding questions should be concise and focused on one aspect of the problem.

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
- Provide helpful hints as needed (do not provide hints otherwise)
- If code is warranted and allowCode=true, include properly formatted code:
${"```"}python
# Clear, educational code example
# With proper indentation and comments
${"```"}

`;

  const systemGuidance =
    "You are a helpful Socratic coding tutor. Guide students with questions and provide educational code examples when requested. When allowCode=true and students ask for code help, provide clear, well-formatted Python examples that teach concepts. Balance Socratic questioning with practical code assistance.";
  const combined = `${systemGuidance}\n\n${conversationPrompt}`;
  const text = await llmText(combined, { temperature: 0.3, maxTokens: 600 });
  return text || "I'm sorry, I couldn't generate a response. Please try again.";
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
You are an expert coding tutor analyzing ${isAIResponse ? "AI assistant code" : "student code"} for a LeetCode-style problem.

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

  const placementPrompt = `You are a smart code merging assistant. Analyze the current code and the snippet to insert. Your job is to intelligently merge them.

CURRENT FILE:
---BEGIN FILE---
${code}
---END FILE---

SNIPPET TO INSERT:
---BEGIN SNIPPET---
${snippet.code}
---END SNIPPET---

IMPORTANT RULES:
1. If the snippet code already exists in the current file, return insertAtLine: -1
2. Find the most logical place to insert this snippet considering:
   - Code flow and algorithm structure
   - Variable scope and dependencies
   - Function boundaries
   - Proper indentation context
3. The snippet should be inserted as new lines, not replace existing code
4. Consider if this is part of an algorithm implementation inside a function

MERGE CLEANUP:
- If the new snippet contains a return from inside a function, remove any unreachable lines that occur after that return within the same function body (e.g., duplicate loops or alternate implementations).
- If both bin(i).count('1') and DP relation (res[i] = res[i >> 1] + (i & 1)) implementations are present for the same function, keep only one consistent implementation based on continuity with surrounding code. Prefer DP if both appear.

Output JSON:
{
  "insertAtLine": <0-based line number, or -1 if code already exists>,
  "indentation": "<spaces for proper indentation>",
  "rationale": "<brief reason for placement or why skipped>"
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
