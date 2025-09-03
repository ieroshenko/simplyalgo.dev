import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmText, getOpenAI, llmWithSessionContext, clearSessionContext } from "./openai-utils.ts";
import { CoachingSession, CoachingValidation, CoachingStep, ContextualResponse } from "./types.ts";
import { logger } from "./utils/logger.ts";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// Initialize Supabase clients
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

/**
 * Simple optimization heuristics to judge if code is likely optimizable (top-level)
 */
function analyzeOptimizationHeuristics(
  code: string,
  _problemDescription: string,
): {
  isOptimizable: boolean;
  currentComplexity?: string;
  targetComplexity?: string;
  reason?: string;
} {
  const src = (code || "").toLowerCase();
  const hasNestedFor = /\n\s*for\b[\s\S]*\n\s{2,}for\b/.test(code);
  const usesDictOrSet = /(dict\(|\{\s*\}|\bset\(|\{[^:}]+:[^}]+\})/.test(src) || /\bCounter\(/.test(code);
  const usesTwoPointers = /(i\+\+|j\-\-|two\s*pointers|left\s*=|right\s*=)/.test(src);
  const sortsInsideLoop = /for\b[\s\S]*?(sorted\(|\.sort\()/.test(src);
  const repeatedMembershipInList = /for\b[\s\S]*?\bin\s+\w+\s*:\s*\n[\s\S]*?\bin\s+\w+/.test(src) && !usesDictOrSet;

  // If time is O(n) with extra space via set/dict → suggest O(1) space target
  if (usesDictOrSet && !hasNestedFor && !sortsInsideLoop) {
    return {
      isOptimizable: true,
      currentComplexity: "O(n) time, O(n) space",
      targetComplexity: "O(1) space (e.g., XOR or arithmetic)",
      reason: "Extra memory detected",
    };
  }

  if (sortsInsideLoop || hasNestedFor || repeatedMembershipInList) {
    return {
      isOptimizable: true,
      currentComplexity: hasNestedFor ? "~O(n^2)" : undefined,
      targetComplexity: "O(n) or O(n log n)",
      reason: "Nested loops/sort inside loop/membership scans detected",
    };
  }
  if (!usesDictOrSet && !usesTwoPointers) {
    return {
      isOptimizable: true,
      targetComplexity: "O(n) or O(n log n)",
      reason: "No hash/set or two-pointer patterns detected",
    };
  }
  return {
    isOptimizable: false,
    currentComplexity: usesTwoPointers ? "O(n)" : "~O(n)",
    targetComplexity: usesTwoPointers ? "O(n)" : "O(n)",
    reason: "Efficient pattern detected",
  };
}

/**
 * Compute a reasonable insert/highlight line inside the current function body
 */
function computeSuggestedInsertLine(code: string): number {
  const lines = (code || "").split('\n');
  if (lines.length === 0) return 2;
  let defLine = -1;
  let defIndent = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^(\s*)def\s+\w+\s*\(/);
    if (m) { defLine = i; defIndent = m[1]?.length || 0; break; }
  }
  if (defLine === -1) return Math.max(2, lines.length + 1);
  let bodyStart = defLine + 1;
  while (bodyStart < lines.length) {
    const indent = (lines[bodyStart].match(/^\s*/)?.[0] || '').length;
    if (indent > defIndent) break;
    bodyStart++;
  }
  if (bodyStart >= lines.length) return defLine + 2;
  // Next blank within body, else last body + 1
  let firstBlank = -1, last = bodyStart;
  for (let i = bodyStart; i < lines.length; i++) {
    const indent = (lines[i].match(/^\s*/)?.[0] || '').length;
    if (/^\s*def\s+\w+\s*\(/.test(lines[i]) && indent <= defIndent) break;
    last = i;
    if (firstBlank === -1 && lines[i].trim() === '') firstBlank = i;
  }
  const target = firstBlank !== -1 ? firstBlank + 1 : last + 2;
  return Math.max(2, target);
}
/**
 * Start an interactive coaching session - generates first question
 */
export async function startInteractiveCoaching(
  problemId: string,
  userId: string,
  currentCode: string,
  problemDescription: string,
  difficulty: "beginner" | "intermediate" | "advanced"
) {
  logger.coaching("Starting context-aware coaching", { problemId, userId, difficulty, action: "start_interactive_coaching" });
  const sessionId = crypto.randomUUID();
  
  // Analyze current code to determine an insertion line inside the active function
  const codeLines = (currentCode || '').split('\n');
  const computeNextLineNumber = () => {
    if (!codeLines.length) return 2;
    // Find last function definition and its indent
    let defLine = -1;
    let defIndent = 0;
    for (let i = codeLines.length - 1; i >= 0; i--) {
      const line = codeLines[i];
      const m = line.match(/^(\s*)def\s+\w+\s*\(/);
      if (m) {
        defLine = i;
        defIndent = m[1]?.length || 0;
        break;
      }
    }
    // If no def found, append after last line
    if (defLine === -1) return Math.max(2, codeLines.length + 1);
    // Find first line with greater indent -> function body start
    let bodyStart = defLine + 1;
    while (bodyStart < codeLines.length) {
      const indent = (codeLines[bodyStart].match(/^\s*/)?.[0] || '').length;
      if (indent > defIndent) break;
      bodyStart++;
    }
    if (bodyStart >= codeLines.length) return defLine + 2;
    // Prefer first blank line in body; else choose last body line + 1
    let firstBlankInBody = -1;
    let lastBodyLine = bodyStart;
    for (let i = bodyStart; i < codeLines.length; i++) {
      const indent = (codeLines[i].match(/^\s*/)?.[0] || '').length;
      if (/^\s*def\s+\w+\s*\(/.test(codeLines[i]) && indent <= defIndent) break;
      lastBodyLine = i;
      if (firstBlankInBody === -1 && codeLines[i].trim() === '') firstBlankInBody = i;
    }
    const target = firstBlankInBody !== -1 ? firstBlankInBody + 1 : lastBodyLine + 2;
    return Math.max(2, target);
  };
  const nextLineNumber = computeNextLineNumber();

  // Create comprehensive initial context with ALL coaching rules and context
  const initialContextPrompt = `You are an expert coding coach for a DSA-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT (REMEMBER FOR ENTIRE SESSION):
- This code runs on Judge0 servers (automatic execution like DSA)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY by the platform
- Students ONLY implement the core algorithm logic inside the function body
- CRITICAL: Provide ONLY function implementations without imports, classes, or main blocks
- Code format: Just the function definition (def solution_name():) with implementation
- Do NOT provide: import statements, class definitions, if __name__ == "__main__", or test code
- NEVER mention function signatures, imports, or test case handling in ANY response
- Focus EXCLUSIVELY on algorithm implementation and problem-solving logic

PROBLEM CONTEXT (FOR ENTIRE SESSION):
Problem ID: ${problemId}  
Problem Description: ${problemDescription}
Difficulty Level: ${difficulty}

COACHING METHODOLOGY (FOR ENTIRE SESSION):
1. Analyze the student's COMPLETE code state before each response
2. Guide step-by-step algorithm development through Socratic questioning
3. If code is correct/complete, determine session completion or optimization opportunities
4. NEVER duplicate code that already exists in their editor
5. Focus on missing algorithmic components only
6. ALWAYS reference specific lines and symbols (variables/functions) present in the CURRENT CODE
7. ONLY one step at a time: do not advance to the next step until the current change is validated as correct.

TONE & HINT POLICY (ALWAYS ENFORCE):
- Avoid generic praise or encouragement (e.g., "Great start", "You're on track") unless the student just made measurable progress.
- When the student asks a question, respond directly without prefacing with praise.
- Ask a question that elicits thinking; the accompanying hint must NOT reveal the answer.
- Hints should be a single nudge (<= 120 characters), avoid naming the exact final operator/algorithm unless already used in the student's code.


CURRENT STUDENT CODE STATE:
\`\`\`python
${currentCode}
\`\`\`

ALGORITHM-FOCUSED COACHING APPROACH:
- Examine existing algorithm implementation (ignore signatures)
- If they have data structures initialized, guide to the next algorithmic step  
- Focus on core logic: iteration patterns, bit manipulation, counting, etc.
- Ask about algorithmic approach, not code formatting or imports
- Reference line ${nextLineNumber} for where they should add algorithm code, and mention existing symbol names (e.g., variables) when applicable
- Be specific about algorithmic steps, not boilerplate code

Now analyze this student's current code and generate the FIRST coaching step.

Return JSON object with:
- A specific question about what algorithm step to implement next
- A concrete hint that guides them to the solution logic  
- The correct highlight area for where they should add code

Required JSON format:
{
  "question": "[Specific question about next algorithm step based on current code]",
  "hint": "[Specific actionable hint about algorithm logic they should implement]", 
  "highlightArea": {
    "startLine": ${nextLineNumber},
    "startColumn": 1,
    "endLine": ${nextLineNumber},
    "endColumn": 1
  },
  "difficulty": "${difficulty}",
  "currentStepNumber": 1,
  "awaitingSubmission": true,
  "isCompleted": false
}


Examples of good Socratic questions/hints (guide discovery, don't give solutions):
- Question: "What data structure would be appropriate to store results for each number from 0 to n?"
- Hint: "Think about what type of collection can hold multiple values and allows access by index"

- Question: "How would you systematically process each number from 0 to n?"  
- Hint: "What Python construct allows you to repeat an operation for a sequence of numbers?"

- Question: "What approach could you use to count bits in a number's binary representation?"
- Hint: "Consider what Python functions might help convert numbers to different representations"

CRITICAL: Do NOT provide direct code solutions in hints. Ask guiding questions that help them think through the problem step by step.

Be encouraging and guide them step by step with specific, actionable advice focused on the algorithm.`;

  // Use context-aware AI call to create initial coaching context
  let stepData;
  let contextualResponse: ContextualResponse;
  
  try {
    logger.coaching("Creating initial coaching context", { sessionId, action: "create_context" });
    
    // Use the new context-aware function to create initial context
    contextualResponse = await llmWithSessionContext(
      sessionId,
      initialContextPrompt,
      'coaching',
      currentCode,
      {
        maxTokens: 800,
        temperature: 0.7,
        responseFormat: "json_object"
      }
    );

    logger.coaching("Context created successfully", { sessionId, responseId: contextualResponse.responseId });
    logger.debug("Context response details", { responseId: contextualResponse.responseId, isNewContext: contextualResponse.isNewContext });

    const rawContent = contextualResponse.content;
    let cleanContent = rawContent.trim();
    
    logger.debug("Raw AI response received", { sessionId, responseLength: rawContent?.length });
    
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/```$/m, "")
        .trim();
    }

    logger.debug("Response cleaned and processed", { sessionId, cleanContentLength: cleanContent.length });
    
    if (!cleanContent || cleanContent === "{}") {
      logger.error("Empty response from AI", undefined, { sessionId, action: "start_interactive_coaching" });
      throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
    }
    
    stepData = JSON.parse(cleanContent);
    logger.debug("Step data parsed successfully", { sessionId, hasQuestion: !!stepData.question, hasHighlightArea: !!stepData.highlightArea });
    
    // Validate required fields
    if (!stepData.question || !stepData.highlightArea) {
      logger.error("Missing required fields in step data", undefined, { sessionId, stepData, action: "validate_step_data" });
      throw new Error("Invalid coaching step data");
    }
  } catch (error) {
    logger.error("AI generation failed", error, { sessionId, action: "start_interactive_coaching" });
    throw error;
  }

  // Only create database session AFTER successful AI step generation
  try {
    logger.coaching("Creating database session", { sessionId, problemId, userId });
    const { error: sessionError } = await supabaseAdmin
      .from("coaching_sessions")
      .insert({
        id: sessionId,
        user_id: userId,
        problem_id: problemId,
        difficulty: difficulty || "beginner",
        total_steps: 5, // Estimated total steps for the problem
        current_step_number: 1,
        current_question: stepData.question,
        is_active: true,
        awaiting_submission: true,
        started_at: new Date().toISOString(),
        initial_code: currentCode,
        response_id: contextualResponse.responseId, // Store response ID for context continuity
        context_initialized: true,
        last_code_snapshot: currentCode,
        context_created_at: new Date().toISOString(),
      });

    if (sessionError) {
      logger.error("Database error creating session", sessionError, { sessionId, problemId, userId, action: "create_session" });
      throw new Error("Failed to create coaching session");
    }
    
    // Store the initial step
    await supabaseAdmin
      .from("coaching_responses")
      .insert({
        session_id: sessionId,
        step_number: 1,
        ai_question: stepData.question,
        ai_hint: stepData.hint,
        highlight_area: stepData.highlightArea,
        created_at: new Date().toISOString(),
        response_id: contextualResponse.responseId, // Store response ID for this step
      });
    
    logger.coaching("Session created successfully", { sessionId, responseId: contextualResponse.responseId, problemId, userId });
    logger.debug("Token optimization status", { sessionId, tokensSaved: contextualResponse.tokensSaved || 0 });
    
    return {
      sessionId,
      question: stepData.question,
      hint: stepData.hint,
      highlightArea: stepData.highlightArea,
      difficulty: stepData.difficulty || difficulty,
      currentStepNumber: 1,
      awaitingSubmission: true,
      isCompleted: false,
      responseId: contextualResponse.responseId, // Return response ID for frontend tracking
      contextInitialized: true,
    };
  } catch (dbError) {
    logger.error("Database operation failed", dbError, { sessionId, action: "create_coaching_session" });
    throw new Error("Failed to create coaching session");
  }
}

/**
 * Generate the next coaching step based on current context
 */
export async function generateNextCoachingStep(
  sessionId: string,
  currentCode: string,
  problemDescription: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  previousResponse?: string
): Promise<CoachingStep> {
  logger.coaching("Generating next coaching step", { sessionId, action: "generate_next_step" });
  
  const prompt = `You are an expert coding coach for a DSA-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT:
- This code runs on Judge0 servers (automatic execution like DSA)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY
- Students ONLY implement the core algorithm logic inside the function body
- CRITICAL: Provide ONLY function implementations without imports, classes, or main blocks
- Code format: Just the function definition (def solution_name():) with implementation
- Do NOT provide: import statements, class definitions, if __name__ == "__main__", or test code
- NEVER mention function signatures, imports, or test case handling in questions
- Focus EXCLUSIVELY on algorithm implementation and problem-solving logic

PROBLEM: ${problemDescription}

STUDENT'S CURRENT CODE STATE (USE TO GROUND ALL REFERENCES):
\`\`\`python
${currentCode || "# No code written yet"}
\`\`\`

${previousResponse ? `PREVIOUS STUDENT RESPONSE: ${previousResponse}` : ''}

STUDENT PROGRESS ANALYSIS:
${currentCode.trim() === "" || currentCode.includes("def ") && currentCode.split('\n').length === 1 
  ? "🔍 BEGINNER STATE: Student needs guidance on algorithm approach and core implementation steps."
  : "🔄 IN PROGRESS: Student has started implementing. Analyze their algorithm logic for correctness and next steps."}

Difficulty level: ${difficulty}

ALGORITHM-FOCUSED COACHING STRATEGY:
1. If code is minimal: Focus on algorithm approach and first implementation steps  
2. If code exists: Analyze algorithm logic, identify issues, and guide algorithmic improvements
3. Ask ONE specific question about algorithm logic that helps them write 1-3 lines of core code
4. Guide algorithmic discovery rather than giving direct code solutions
5. ALWAYS reference specific lines (by number) and existing symbols (variables/functions) from CURRENT CODE.
6. ONLY one step at a time: do not propose future steps; wait for validation before progressing.

QUESTION REQUIREMENTS (ALGORITHM-FOCUSED):
- Ask about SPECIFIC algorithmic steps: "What data structure would store your results?" or "How would you process each number?"
- Focus on core algorithm logic: loops, conditions, data manipulation
- Reference their ACTUAL algorithm implementation with specific line numbers and existing symbol names
- Include hints that guide algorithmic discovery, not boilerplate code

TONE & HINT POLICY:
- Do NOT include unsolicited praise (e.g., "Great start", "You're on track"). Keep tone concise and neutral.
- The hint must NOT answer the question. Avoid naming the exact operator/algorithm unless it already appears in CURRENT CODE.
- Provide at most one short hint (<= 120 characters). No code in hint.

FOR HIGHLIGHTING: Use EXACT line numbers from their algorithm code (ignore function signature lines)

Return ONLY a JSON object with this structure (ONE STEP ONLY):
{
  "question": "[Specific question about next code to write]",
  "hint": "[One short nudge that does not reveal the answer]", 
  "expectedCodeType": "variable|loop|condition|expression|return|any",
  "highlightArea": {
    "startLine": [actual line number],
    "endLine": [actual line number],
    "startColumn": 1,
    "endColumn": 50
  }
}

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text, reasoning, or markdown formatting. The response should be valid JSON that can be parsed directly.`;

  try {
    logger.debug("Initializing OpenAI for coaching step", { sessionId });
    const openai = getOpenAI();
    
    logger.llmCall("gpt-5-mini", 0, { sessionId, action: "generate_coaching_step" });
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 800,
    });

    logger.debug("API call completed successfully", { sessionId });
    const rawContent = response.choices[0]?.message?.content || "{}";
    let cleanContent = rawContent.trim();
    
    logger.debug("Raw AI response received", { sessionId, responseLength: rawContent?.length });
    logger.debug("Response details", { sessionId, choiceCount: response.choices?.length });
    logger.llmResponse("gpt-5-mini", response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 0, { sessionId });
    logger.debug("Model used", { sessionId, model: response.model });
    logger.debug("Response structure", { sessionId, responseKeys: Object.keys(response) });
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/```$/m, "")
        .trim();
    }
    
    logger.debug("Response cleaned", { sessionId, cleanContentLength: cleanContent.length });
    
    if (!cleanContent || cleanContent === "{}") {
      logger.error("Empty or invalid response from AI", undefined, { sessionId, action: "generate_next_step" });
      logger.error("Raw response details", undefined, { sessionId, rawResponse: rawContent });
      logger.debug("Response choices info", { sessionId, choicesLength: response.choices?.length });
      console.error("🚨 [generateNextCoachingStep] First choice:", JSON.stringify(response.choices?.[0], null, 2));
      console.error("🚨 [generateNextCoachingStep] API response object:", JSON.stringify(response, null, 2));
      
      
      throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
    }
    
    const step = JSON.parse(cleanContent);
    logger.debug("Step parsed successfully", { sessionId, hasQuestion: !!step.question, hasHint: !!step.hint });
    
    // Validate required fields
    if (!step.question || !step.hint) {
      logger.error("Missing required fields in step", undefined, { sessionId, step, action: "validate_step" });
      throw new Error("Step missing required fields");
    }
    
    logger.coaching("Step generation successful", { sessionId });
    return step;
  } catch (error) {
    logger.error("Step generation failed", error, { sessionId, action: "generate_next_step" });
    
    // Don't return fallback - let the error propagate to frontend for proper handling
    throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
  }
}

/**
 * Validate student's code submission and determine next action
 */
export async function validateCoachingSubmission(
  sessionId: string,
  studentCode: string,
  studentResponse: string,
  currentEditorCode: string
): Promise<CoachingValidation> {
  console.log("🎯 [validateCoachingSubmission] Validating...", { sessionId, studentCode: studentCode.slice(0, 100) + "..." });
  
  // Get session data
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Coaching session not found");
  }

  // Create concise prompt for context continuation (the AI already knows all the coaching rules)
  const contextContinuationPrompt = `STUDENT CODE UPDATE (GROUND IN CURRENT CODE and REFERENCE LINES/SYMBOLS):
\`\`\`python
${currentEditorCode}
\`\`\`

${studentResponse && studentResponse.trim() && studentResponse !== "Code validation from highlighted area" 
  ? `STUDENT RESPONSE: "${studentResponse}"

` : ""}VALIDATION REQUEST:
Analyze the student's current code implementation. Has their algorithm improved? What should happen next?

Determine if:
1. Code is correct/complete → session can end or offer optimization
2. Code has issues → provide specific algorithmic guidance  
3. Code needs more implementation → guide next step

CRITICAL ANALYSIS POINTS:
- Check if the code already has all necessary algorithmic components
- Don't duplicate existing code in codeToAdd
- If algorithm is complete and correct, indicate session completion
- Focus on what's MISSING from their algorithm, not what exists

Return JSON in this exact format:
{
  "isCorrect": boolean,
  "feedback": "specific feedback message about their code",
  "nextAction": "insert_and_continue" | "retry" | "hint" | "complete_session",
  "codeAnalysis": {
    "syntax": "valid" | "invalid",
    "logic": "correct" | "incorrect" | "partial",
    "efficiency": "optimal" | "acceptable" | "inefficient",
    "timeComplexity": "O(1)|O(log n)|O(n)|O(n log n)|O(n^2)|other",
    "spaceComplexity": "O(1)|O(log n)|O(n)|O(n log n)|O(n^2)|other",
    "recommendedTime": "O(1)|O(log n)|O(n)|O(n log n)|O(n^2)|other",
    "recommendedSpace": "O(1)|O(log n)|O(n)|O(n log n)|O(n^2)|other"
  },
  "codeToAdd": "code to insert if nextAction is insert_and_continue",
  "nextStep": {
    "question": "next guiding question for the student",
    "expectedCodeType": "variable" | "loop" | "condition" | "expression" | "return" | "any",
    "hint": "helpful hint for the next step"
  }
}`;

  let contextualResponse: ContextualResponse;
  
  try {
    console.log("🎯 [validateCoachingSubmission] Using context-aware validation...");
    
    // Use context continuation instead of sending full coaching rules again
    contextualResponse = await llmWithSessionContext(
      sessionId,
      contextContinuationPrompt,
      'coaching',
      currentEditorCode,
      {
        maxTokens: 1500,
        responseFormat: "json_object"
      }
    );

    console.log("🎯 [validateCoachingSubmission] Context-aware validation successful");
    console.log(`🎯 [validateCoachingSubmission] Response ID: ${contextualResponse.responseId}`);
    console.log(`🎯 [validateCoachingSubmission] Is new context: ${contextualResponse.isNewContext}`);
    console.log(`🎯 [validateCoachingSubmission] Tokens saved: ${contextualResponse.tokensSaved || 0}`);

    const rawContent = contextualResponse.content;
    let cleanContent = rawContent.trim();
    
    console.log("🎯 [validateCoachingSubmission] Raw AI response:", rawContent);
    
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/```$/m, "")
        .trim();
    }

    console.log("🎯 [validateCoachingSubmission] Cleaned response:", cleanContent);
    
    if (!cleanContent || cleanContent === "{}") {
      console.error("🚨 [validateCoachingSubmission] Empty or invalid response from AI");
      console.error("🚨 [validateCoachingSubmission] Raw response was:", JSON.stringify(rawContent));
      console.error("🚨 [validateCoachingSubmission] Context response ID:", contextualResponse.responseId);
      console.error("🚨 [validateCoachingSubmission] Is new context:", contextualResponse.isNewContext);
      
      throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
    }
    
    const validation = JSON.parse(cleanContent);

    // Add optimization detect flag to inform UI about Learn Optimization button visibility
    try {
      const heur = analyzeOptimizationHeuristics(currentEditorCode, problemDescription);
      (validation as any).isOptimizable = Boolean(heur?.isOptimizable);
    } catch (_) {
      (validation as any).isOptimizable = true;
    }

    // If correct but not optimal, we no longer inject any default next step text.
    // Rendering logic on the frontend hides the Next Step card when empty.
    console.log("🎯 [validateCoachingSubmission] Parsed validation:", validation);
    
    // Validate required fields
    if (!validation.feedback || !validation.nextStep) {
      console.error("🚨 [validateCoachingSubmission] Missing required fields:", validation);
      throw new Error("Validation missing required fields");
    }
    
    // Store the response in database with context information
    await supabaseAdmin
      .from("coaching_responses")
      .insert({
        session_id: sessionId,
        step_number: session.current_step_number,
        question: session.current_question,
        student_response: studentResponse,
        submitted_code: studentCode,
        validation_result: validation,
        is_correct: validation.isCorrect,
        response_id: contextualResponse.responseId, // Store response ID for this validation
        tokens_saved: contextualResponse.tokensSaved || 0,
        context_continued: !contextualResponse.isNewContext
      });

    // Update session state and context information
    const sessionUpdateData: any = {
      response_id: contextualResponse.responseId, // Always update with latest response ID
      last_code_snapshot: currentEditorCode,
      context_initialized: true,
    };

    if (validation.nextAction === "complete_session") {
      sessionUpdateData.is_completed = true;
      sessionUpdateData.session_state = 'completed';
      sessionUpdateData.awaiting_submission = false;
      
      await supabaseAdmin
        .from("coaching_sessions")
        .update(sessionUpdateData)
        .eq("id", sessionId);
        
    } else if (validation.isCorrect && validation.nextAction === "insert_and_continue") {
      sessionUpdateData.current_step_number = session.current_step_number + 1;
      sessionUpdateData.current_question = validation.nextStep?.question || "";
      sessionUpdateData.awaiting_submission = true;
      
      await supabaseAdmin
        .from("coaching_sessions")
        .update(sessionUpdateData)
        .eq("id", sessionId);
        
    } else {
      // For any other case, just update the context information
      await supabaseAdmin
        .from("coaching_sessions")
        .update(sessionUpdateData)
        .eq("id", sessionId);
    }

    console.log("✅ [validateCoachingSubmission] Validation complete");
    return validation;
  } catch (error) {
    console.error("🚨 [validateCoachingSubmission] Error:", error);
    
    // Don't return fallback - let the error propagate to frontend
    throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
  }
}

/**
 * Start optimization coaching steps
 */
export async function startOptimizationCoaching(
  problemId: string,
  userId: string,
  currentCode: string,
  problemDescription: string,
  difficulty: "beginner" | "intermediate" | "advanced" = "beginner",
) {
  const sessionId = crypto.randomUUID();

  const heur = analyzeOptimizationHeuristics(currentCode, problemDescription);
  if (!heur.isOptimizable) {
    return {
      sessionId,
      nextAction: "complete_optimization",
      message: "Solution already appears optimal. Great job!",
      targetComplexity: heur.targetComplexity || "O(n)",
    };
  }

  const prompt = `You are an expert optimization coach.

PROBLEM: ${problemDescription}

CURRENT CODE (optimize by editing minimal lines, keep signature unchanged):
\`\`\`python
${currentCode || "# no code"}
\`\`\`

GOAL:
- Identify one concrete optimization step toward ${heur.targetComplexity || "a better complexity"}.
- Reference specific lines and existing symbols.
- Provide ONE short question and ONE hint.
- If a tiny, safe edit (1–3 lines) helps, include it as codeToAdd.

Return JSON only:
{
  "question": "...",
  "hint": "...",
  "targetComplexity": "O(n) | O(n log n) | ...",
  "expectedChange": "data_structure|algorithm|constant_factor",
  "highlightArea": { "startLine": <number>, "endLine": <number> },
  "codeToAdd": "optional tiny edit or empty string",
  "nextAction": "hint" | "insert_and_continue"
}`;

  const text = await llmText(prompt, { temperature: 0.3, maxTokens: 500 });
  return { sessionId, step: text };
}

/**
 * Validate optimization step
 */
export async function validateOptimizationStep(
  sessionId: string,
  currentEditorCode: string,
  problemDescription: string,
) {
  const heur = analyzeOptimizationHeuristics(currentEditorCode, problemDescription);
  if (!heur.isOptimizable) {
    return {
      isCorrect: true,
      improved: true,
      currentComplexity: heur.currentComplexity || "O(n)",
      feedback: "Solution is already optimal. Nicely done!",
      nextAction: "complete_optimization",
    };
  }

  // Ask for the next minimal improvement (no benchmarking)
  const prompt = `Given the current code, propose the next minimal optimization step toward ${heur.targetComplexity || "a better complexity"}.
Use existing symbols and reference specific lines. Return JSON with fields: question, hint, expectedChange, highlightArea {startLine,endLine}, codeToAdd (<=3 lines or empty), nextAction (hint|insert_and_continue). Code only if safe.`;

  const text = await llmText(prompt + "\n\nCURRENT CODE:\n" + currentEditorCode, { temperature: 0.2, maxTokens: 500 });
  return { isCorrect: true, improved: false, nextStep: text, nextAction: "hint" };
}

/**
 * Generate a coaching session with step-by-step guidance (legacy function for compatibility)
 */
export async function generateCoachingSession(
  problemId: string,
  userId: string,
  currentCode: string,
  problemDescription: string,
  difficulty: "beginner" | "intermediate" | "advanced"
) {
  console.log("🎯 [generateCoachingSession] Starting...", { problemId, userId, difficulty });
  const sessionId = crypto.randomUUID();
  
  const prompt = `You are an expert coding coach for a DSA-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT:
- This code runs on Judge0 servers (automatic execution like DSA)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY
- Students ONLY implement the core algorithm logic inside the function body
- CRITICAL: Provide ONLY function implementations without imports, classes, or main blocks
- Code format: Just the function definition (def solution_name():) with implementation
- Do NOT provide: import statements, class definitions, if __name__ == "__main__", or test code
- NEVER mention function signatures, imports, or test case handling in questions
- Focus EXCLUSIVELY on algorithm implementation and problem-solving logic

PROBLEM: ${problemDescription}

STUDENT'S CURRENT CODE STATE (USE TO GROUND ALL REFERENCES):
${"```"}python
${currentCode || "# No code written yet"}
${"```"}

STUDENT PROGRESS ANALYSIS:
${currentCode.trim() === "" || currentCode.includes("def ") && currentCode.split('\n').length === 1 
  ? "🔍 BEGINNER STATE: Student needs guidance on algorithm approach and core implementation steps."
  : "🔄 IN PROGRESS: Student has started implementing. Analyze their algorithm logic for correctness and next steps."}

Difficulty level: ${difficulty}

ALGORITHM-FOCUSED COACHING STRATEGY:
1. If code is minimal: Focus on algorithm approach and first implementation steps
2. If code exists: Analyze algorithm logic, identify issues, and guide algorithmic improvements  
3. Always provide specific, actionable steps that build on their current algorithm progress
4. Ask questions about algorithm logic that help them discover solutions

Create 3-5 algorithm-focused coaching steps that guide the student through improving their solution. Each step should:
1. Ask a specific question about their ACTUAL algorithm implementation (not generic questions)
2. Highlight the EXACT lines from their algorithm code that are relevant to the question
3. Include expected algorithmic keywords in the student's response  
4. Provide a helpful hint specific to their current algorithm implementation

CRITICAL: For highlightArea, use EXACT line numbers from the student's algorithm code:
- Focus on lines containing algorithm logic (skip function signature lines)
- If they have algorithm code, highlight the specific algorithmic lines relevant to each question
- startLine and endLine should correspond to actual algorithm implementation lines
- Don't highlight boilerplate code or function signatures

Return ONLY a JSON object with this structure:
{
  "sessionId": "${sessionId}",
  "steps": [
    {
      "id": "step-1", 
      "question": "[Question about their specific algorithm implementation]",
      "hint": "[Algorithmic hint specific to what they've implemented]",
      "expectedKeywords": ["algorithm_keyword1", "logic_keyword2"],
      "highlightArea": {
        "startLine": [actual algorithm line number],
        "endLine": [actual algorithm line number], 
        "startColumn": 1,
        "endColumn": 50
      }
    }
  ]
}

Make each step build on their current algorithm progress and guide them toward implementing the missing algorithmic pieces. Focus on algorithm logic, data structures, and problem-solving approach.

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text, reasoning, or markdown formatting. The response should be valid JSON that can be parsed directly.`;

  console.log("🎯 [generateCoachingSession] Calling OpenAI...");
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 1500,
  });
  console.log("🎯 [generateCoachingSession] OpenAI response received");

  // Declare variables outside try block to avoid scope issues
  const rawContent = response.choices[0].message.content || "{}";
  let cleanContent = "";

  try {
    console.log("🎯 [generateCoachingSession] Raw OpenAI content:", rawContent.slice(0, 200) + "...");
    
    // Clean the response to remove markdown code fences
    cleanContent = rawContent.trim();
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/```$/m, "")
        .trim();
    }
    
    console.log("🎯 [generateCoachingSession] Cleaned content:", cleanContent.slice(0, 500) + "...");
    console.log("🎯 [generateCoachingSession] Full cleaned content:", cleanContent);
    
    const sessionData = JSON.parse(cleanContent);
    console.log("🎯 [generateCoachingSession] Parsed session data:", JSON.stringify(sessionData, null, 2));
    console.log("🎯 [generateCoachingSession] sessionData.steps type:", typeof sessionData.steps);
    console.log("🎯 [generateCoachingSession] sessionData.steps value:", sessionData.steps);
    
    // Validate the session data structure
    if (!sessionData || !Array.isArray(sessionData.steps)) {
      console.error("🚨 [generateCoachingSession] Invalid session data structure:", JSON.stringify(sessionData, null, 2));
      console.error("🚨 [generateCoachingSession] Expected: object with 'steps' array property");
      console.error("🚨 [generateCoachingSession] Got steps type:", typeof sessionData.steps);
      throw new Error("AI response does not contain valid coaching steps");
    }
    
    console.log("🎯 [generateCoachingSession] Steps found:", sessionData.steps.length);
    
    // Store session in database
    try {
      const { data, error } = await supabaseAdmin
        .from("coaching_sessions")
        .insert({
          id: sessionId,
          user_id: userId,
          problem_id: problemId,
          difficulty,
          total_steps: sessionData.steps?.length || 0,
          steps: sessionData.steps || [],
          initial_code: currentCode,
        })
        .select()
        .single();

      if (error) {
        console.error("Error storing coaching session:", error);
        // Return session data even if DB storage fails
        console.warn("Continuing without DB storage - coaching session generated but not persisted");
      }
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      console.warn("Continuing without DB storage - coaching session generated but not persisted");
    }

    return {
      sessionId,
      steps: sessionData.steps || [],
      totalSteps: sessionData.steps?.length || 0,
      difficulty,
    };
  } catch (parseError) {
    console.error("🚨 [generateCoachingSession] Error parsing coaching session response:", parseError);
    console.error("🚨 [generateCoachingSession] Content that failed to parse:", cleanContent || rawContent);
    throw new Error(`Failed to parse coaching session: ${(parseError as Error)?.message}`);
  }
}

