import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmText, llmJson, getOpenAI, llmWithSessionContext, clearSessionContext } from "./openai-utils.ts";
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
 * Parse problem constraints from problem description
 * Returns the extracted constraints for validation context
 */
function parseConstraints(problemDescription: string): {
  constraints: string[];
  numericalConstraints: { min: number; max: number; variable: string }[];
} {
  const constraints: string[] = [];
  const numericalConstraints: { min: number; max: number; variable: string }[] = [];

  // Look for constraint sections
  const constraintMatch = problemDescription.match(/(?:Constraints?|Constraint)\s*:?\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  if (constraintMatch) {
    const constraintText = constraintMatch[1];
    constraints.push(constraintText.trim());

    // Extract numerical constraints like "-1000 <= a, b <= 1000"
    const numericalMatches = constraintText.matchAll(/(-?\d+)\s*<=?\s*([a-zA-Z_][a-zA-Z0-9_,\s]*)\s*<=?\s*(-?\d+)/g);
    for (const match of numericalMatches) {
      const [, minStr, variables, maxStr] = match;
      const min = parseInt(minStr);
      const max = parseInt(maxStr);
      const varList = variables.split(',').map(v => v.trim());

      for (const variable of varList) {
        numericalConstraints.push({ min, max, variable });
      }
    }
  }

  return { constraints, numericalConstraints };
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

  // CHECK IF SOLUTION IS ALREADY COMPLETE - Run tests before asking questions
  const hasReturn = /return\s+/.test(currentCode);
  const looksComplete = hasReturn && currentCode.trim().length > 50;

  if (looksComplete) {
    console.log("🧪 [startInteractiveCoaching] Solution looks complete, running tests before starting session...");

    try {
      // Fetch problem and test cases
      const { data: problem } = await supabaseAdmin
        .from("problems")
        .select("*, test_cases(*)")
        .eq("id", problemId)
        .single();

      if (problem && problem.test_cases && problem.test_cases.length > 0) {
        // Call code executor API
        const codeExecutorUrl = Deno.env.get("CODE_EXECUTOR_URL") || "http://localhost:3001";
        const testResponse = await fetch(`${codeExecutorUrl}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currentCode,
            language: "python",
            problemId: problemId,
            testCases: problem.test_cases.map((tc: any) => ({
              input: tc.input_json,
              expected: tc.expected_json,
            })),
          }),
        });

        console.log("🧪 [startInteractiveCoaching] Test response status:", testResponse.status);

        if (testResponse.ok) {
          const testResults = await testResponse.json();
          console.log("🧪 [startInteractiveCoaching] Test results:", JSON.stringify(testResults));

          // Check if all tests passed
          const allPassed = testResults.results?.every((r: any) => r.passed) || false;
          const passedCount = testResults.results?.filter((r: any) => r.passed).length || 0;
          const totalCount = testResults.results?.length || 0;

          console.log(`🧪 [startInteractiveCoaching] Test summary: ${passedCount}/${totalCount} passed, allPassed=${allPassed}`);

          if (allPassed && totalCount > 0) {
            console.log("✅ [startInteractiveCoaching] All tests passed! Checking for optimization opportunities...");

            // Check if solution can be optimized
            let isOptimizable = false;
            try {
              const optimizationAnalysis = await analyzeOptimizationWithAI(
                currentCode,
                problemDescription
              );
              isOptimizable = optimizationAnalysis.isOptimizable || optimizationAnalysis.hasAlternative || false;
              console.log("🔍 [startInteractiveCoaching] Optimization analysis:", {
                isOptimizable: optimizationAnalysis.isOptimizable,
                hasAlternative: optimizationAnalysis.hasAlternative,
                currentComplexity: optimizationAnalysis.currentComplexity,
                targetComplexity: optimizationAnalysis.targetComplexity,
              });
            } catch (optError) {
              console.warn("⚠️ [startInteractiveCoaching] Optimization analysis failed:", optError);
              isOptimizable = false;
            }

            // Return completion message instead of starting coaching
            return {
              sessionId,
              question: `🎉 Congratulations! Your solution is correct!\n\nAll ${totalCount} test cases passed! ✅\n\nYour code successfully handles all edge cases and produces the expected output. Great work!`,
              hint: "🌟 Your solution is complete and ready to submit. Feel free to explore optimizations or move on to the next challenge!",
              highlightArea: null,
              difficulty,
              currentStepNumber: 1,
              awaitingSubmission: false,
              isCompleted: true,
              isOptimizable: isOptimizable, // ← Add optimization flag
              responseId: null,
              contextInitialized: false
            };
          } else {
            console.log(`⚠️ [startInteractiveCoaching] Tests failed: ${passedCount}/${totalCount} passed - will provide coaching`);
          }
        } else {
          console.error(`❌ [startInteractiveCoaching] Test execution failed with status: ${testResponse.status}`);
          const errorText = await testResponse.text();
          console.error(`❌ [startInteractiveCoaching] Error response: ${errorText}`);
        }
      }
    } catch (testError) {
      console.error("⚠️ [startInteractiveCoaching] Test execution failed:", testError);
      // Continue with coaching if test execution fails
    }
  }

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

CRITICAL: CHECK IF SOLUTION IS ALREADY COMPLETE
Before asking any questions, analyze if the student's code already solves the problem:
1. Does it have all necessary components (initialization, loop, logic, return statement)?
2. Would this code produce correct output for the problem?
3. If YES to both → Set isCompleted: true and provide completion message instead of a question
4. If NO → Identify what's missing and ask about that specific piece

DO NOT start coaching if the solution is already functionally complete. Instead, acknowledge their solution and mark session as complete.

Now analyze this student's current code and generate the FIRST coaching step.

Return JSON object with:
- A specific question about what algorithm step to implement next
- A concrete hint that guides them to the solution logic  
- The correct highlight area for where they should add code

Required JSON format (if solution is INCOMPLETE):
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

Required JSON format (if solution is ALREADY COMPLETE):
{
  "question": "Great work! Your solution is already complete.",
  "hint": "You can test your solution or explore optimizations.",
  "highlightArea": null,
  "difficulty": "${difficulty}",
  "currentStepNumber": 1,
  "awaitingSubmission": false,
  "isCompleted": true
}


QUESTION GRANULARITY - CRITICAL:
- Break down the algorithm into SMALL, ATOMIC steps
- Each question should ask for 1-3 lines of code maximum
- Don't ask broad questions like "How will you solve this problem?"
- Ask specific questions like "What variables will you initialize?" or "How will you iterate?"

Examples of good Socratic questions/hints (guide discovery, don't give solutions):
- Question: "What variables will you need to track the sliding window boundaries?"
- Hint: "You'll need two pointers to mark the start and end of the window"

- Question: "What data structure will track character frequencies?"
- Hint: "Think about a structure that maps characters to their counts"

- Question: "How will you iterate through the string with the right pointer?"
- Hint: "Use a for loop to move the right pointer through each character"

- Question: "What condition determines when to shrink the window?"
- Hint: "Check when the number of replacements needed exceeds k"

CRITICAL:
- Ask questions that can be answered with 1-3 lines of code
- Do NOT ask questions that require multiple algorithmic steps
- Each question = one small atomic step

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
    logger.debug("Step data parsed successfully", { sessionId, hasQuestion: !!stepData.question, hasHighlightArea: !!stepData.highlightArea, isCompleted: !!stepData.isCompleted });

    // Validate required fields (highlightArea can be null if session is already completed)
    if (!stepData.question) {
      logger.error("Missing required fields in step data", undefined, { sessionId, stepData, action: "validate_step_data" });
      throw new Error("Invalid coaching step data");
    }

    // If not completed, highlightArea is required
    if (!stepData.isCompleted && !stepData.highlightArea) {
      logger.error("Missing highlightArea for incomplete session", undefined, { sessionId, stepData, action: "validate_step_data" });
      throw new Error("Invalid coaching step data: missing highlightArea");
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
  currentEditorCode: string,
  problemId?: string,
  userId?: string
): Promise<CoachingValidation> {
  console.log("🎯 [validateCoachingSubmission] Validating...", { sessionId, studentCode: studentCode.slice(0, 100) + "...", problemId });

  // Get session data
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Coaching session not found");
  }

  // Parse constraints from problem description for validation context
  const problemDescription = session.problem_description || "";
  const { constraints, numericalConstraints } = parseConstraints(problemDescription);

  // Get the current question being validated
  const currentQuestion = session.current_question || "";

  // Create constraint-aware validation prompt
  const contextContinuationPrompt = `STUDENT CODE UPDATE (GROUND IN CURRENT CODE and REFERENCE LINES/SYMBOLS):
\`\`\`python
${currentEditorCode}
\`\`\`

PROBLEM CONTEXT:
${problemDescription}

${constraints.length > 0 ? `PROBLEM CONSTRAINTS:
${constraints.join('\n')}
` : ""}
CURRENT COACHING QUESTION BEING VALIDATED:
"${currentQuestion}"

VALIDATION MODE: Step-by-step coaching (NOT final solution validation)

CRITICAL STEP-BY-STEP VALIDATION INSTRUCTIONS:
- VALIDATE ONLY if the student answered the CURRENT QUESTION above
- DO NOT check if the entire solution is complete
- DO NOT validate against the final complete solution
- DO NOT penalize for missing code that wasn't asked for in the current question
- Focus EXCLUSIVELY on: Did they implement what the CURRENT QUESTION asked for?
- If they correctly answered the current question (even partially), mark as correct and provide next step
- If they didn't answer the current question, provide targeted feedback ONLY about THIS question

EXAMPLES OF CORRECT STEP-BY-STEP VALIDATION:
- Question: "What sliding window variables will you initialize?"
  Student writes: "left = 0; char_count = {}"
  Validation: ✅ CORRECT - They initialized the variables asked for. Provide next step.

- Question: "How would you iterate through the string?"
  Student writes: "for i in range(len(s)):"
  Validation: ✅ CORRECT - They added the iteration asked for. Provide next step.

- Question: "What condition would you check to expand the window?"
  Student writes: "if char_count[s[right]] < k:"
  Validation: ✅ CORRECT - They added the condition. Provide next step.

${studentResponse && studentResponse.trim() && studentResponse !== "Code validation from highlighted area"
      ? `STUDENT EXPLANATION: "${studentResponse}"

` : ""}VALIDATION REQUEST:
Did the student answer the CURRENT QUESTION ("${currentQuestion}")?

BREAK DOWN THE CURRENT QUESTION:
- Parse what SPECIFIC code elements the question is asking for
- Example: "How will you maintain a sliding window?" → Asking for: window variables (left, right) and loop structure
- Example: "What variables will you initialize?" → Asking for: variable declarations only
- Example: "How will you update the frequency?" → Asking for: freq[char] update logic only

VALIDATION APPROACH:
1. Identify the MINIMAL code that answers the current question
2. Check if student's code contains those minimal elements (FUNCTIONALLY, not exact placement)
3. If yes → Mark CORRECT and provide next step
4. If no → Mark INCORRECT with feedback about what's missing FOR THIS QUESTION ONLY

FUNCTIONAL CORRECTNESS - CRITICAL:
- Focus on WHAT the code does, not WHERE it's placed (unless order matters for correctness)
- If student's code achieves the same result, accept it even if placement differs
- Example: window_size calculation before or after max_num update is FINE if both work
- Don't be pedantic about code style or exact ordering unless it causes bugs
- If the logic is correct but just in different order, mark as CORRECT

COMMON VALIDATION MISTAKES TO AVOID:
❌ WRONG: Question asks "How will you maintain a sliding window?" → Expecting full window logic (update, shrink, etc.)
✅ RIGHT: Question asks "How will you maintain a sliding window?" → Just need window variables + loop structure

❌ WRONG: Question asks "What variables will you initialize?" → Expecting those variables to be used correctly
✅ RIGHT: Question asks "What variables will you initialize?" → Just need variable declarations

❌ WRONG: Checking if entire solution works
✅ RIGHT: Checking if THIS SPECIFIC STEP is present

❌ WRONG: Rejecting code because variable assignment is before instead of after another line (when order doesn't matter)
✅ RIGHT: Accepting code if it's functionally correct regardless of minor ordering differences

DETERMINE:
- What is the MINIMUM code the current question asks for?
- Did the student write that minimum code?
- If yes: isCorrect = true, provide nextStep
- If no: isCorrect = false, explain what's missing FOR THIS QUESTION ONLY

CHECKING IF SESSION SHOULD COMPLETE:
- Only mark session as complete (nextAction: "complete_session") if ALL of these are true:
  1. The solution has a proper return statement
  2. All algorithmic components are present (initialization, loop, logic, return)
  3. The code would actually solve the problem correctly
- DO NOT complete the session if:
  - Missing return statement
  - Missing key algorithmic steps
  - Code is incomplete or wouldn't work
- When checking if code already exists: Look at ACTUAL current code, not what you expect to see
- If student already implemented what the question asks, acknowledge it and move to next step

CONTEXT-AWARE CODE CORRECTION:
- Analyze existing code to identify SPECIFIC incorrect lines or logic
- Generate targeted fixes that REPLACE incorrect code with correct implementation
- Reference existing variables, functions, and patterns when possible (e.g., if student has 'nums' array, reference 'nums[i]')
- Focus on fixing ONE specific mistake at a time (wrong loop condition, incorrect assignment, missing logic)
- Must integrate seamlessly with existing code structure and indentation
- Never provide complete solutions or full function rewrites

CODE CORRECTION RULES (ONLY when student's answer is INCORRECT):
- Maximum 3-4 lines of corrected code that directly fixes the identified issue
- Must REPLACE incorrect logic, not just add to it
- Should fix the specific mistake mentioned in the feedback
- Use student's existing variable names and coding style
- Focus on correcting one issue: wrong loop condition, incorrect pointer updates, missing edge case handling
- Example corrections: Replace "curr = head" with "curr = head.next" or fix loop condition from "while curr" to "while curr.next"
- IMPORTANT: Provide the corrected version of the problematic code, not additional code
- **CRITICAL: If student answered the current question CORRECTLY, set codeToAdd to empty string ""**
- Only provide codeToAdd when student's answer is INCORRECT or incomplete for the current question

ANTI-LOOP SAFETY CHECK:
- Before marking code as incorrect, check if the student's code is FUNCTIONALLY equivalent to what you'd provide
- If student's code has the same logic but different ordering/style, mark as CORRECT instead
- DO NOT provide codeToAdd if the code you'd provide is already present (even if in different order)
- If you notice you're rejecting code that's essentially correct, accept it and move forward

NEXT STEP RULES - CRITICAL:
- **If isCorrect = true AND there are more steps needed**: Provide nextStep with the next question
- **If isCorrect = true AND solution is complete**: Set nextAction to "complete_session" and OMIT nextStep
- **If isCorrect = false**: Set nextStep to empty object {} or omit it entirely
- DO NOT provide nextStep when the student's answer is incorrect
- DO NOT provide nextStep when the solution is complete - use "complete_session" instead
- Student must answer the current question correctly before seeing the next question

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
  "codeToAdd": "corrected version of the specific incorrect code (ONLY if isCorrect = false)",
  "nextStep": {
    "question": "next guiding question (ONLY if isCorrect = true)",
    "expectedCodeType": "variable|loop|condition|expression|return|any (ONLY if isCorrect = true)",
    "hint": "helpful hint for the next step (ONLY if isCorrect = true)"
  }
}

IMPORTANT VALIDATION LOGIC:
- If isCorrect = true AND solution is INCOMPLETE → nextStep must be provided
- If isCorrect = true AND solution is COMPLETE → nextAction = "complete_session", OMIT nextStep
- If isCorrect = false → nextStep must be empty {} or omitted entirely
- Check if all required components exist before generating nextStep
- If student has all the logic needed, mark as complete instead of asking more questions

CRITICAL NEXT STEP GENERATION:
- Before generating nextStep question, analyze what code student already has
- DO NOT ask questions about code that already exists in the editor
- nextStep should ask about the NEXT missing piece, not existing code
- Example: If student has shrinking logic, don't ask "How will you shrink?" - ask about what comes NEXT
- **MOST IMPORTANT**: If all algorithmic components are present and solution is complete, set nextAction = "complete_session" and DO NOT provide nextStep
- Only provide nextStep if there is genuinely more work to be done
- Completing the solution should end the session, not generate another question`;

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
      const optimizationAnalysis = await analyzeOptimizationWithAI(currentEditorCode, problemDescription);
      (validation as any).isOptimizable = optimizationAnalysis.isOptimizable;
      (validation as any).hasAlternative = optimizationAnalysis.hasAlternative;
      (validation as any).optimizationAnalysis = optimizationAnalysis;
    } catch (error) {
      console.error("Optimization analysis failed:", error);
      // Conservative fallback
      (validation as any).isOptimizable = false;
      (validation as any).hasAlternative = false;
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

    // AUTO-TEST EXECUTION: If solution looks complete, run test cases
    if (validation.isCorrect && problemId && userId) {
      console.log("🧪 [validateCoachingSubmission] Solution looks complete, checking if we should run tests...");

      // Check if solution has return statement and looks complete
      const hasReturn = /return\s+/.test(currentEditorCode);
      const looksComplete = hasReturn && currentEditorCode.trim().length > 50;

      if (looksComplete) {
        console.log("🧪 [validateCoachingSubmission] Running test cases to verify solution...");

        try {
          // Fetch problem and test cases
          const { data: problem } = await supabaseAdmin
            .from("problems")
            .select("*, test_cases(*)")
            .eq("id", problemId)
            .single();

          if (problem && problem.test_cases && problem.test_cases.length > 0) {
            // Call code executor API
            const codeExecutorUrl = Deno.env.get("CODE_EXECUTOR_URL") || "http://localhost:3001";
            const testResponse = await fetch(`${codeExecutorUrl}/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: currentEditorCode,
                language: "python",
                problemId: problemId,
                testCases: problem.test_cases.map((tc: any) => ({
                  input: tc.input_json,
                  expected: tc.expected_json,
                })),
              }),
            });

            if (testResponse.ok) {
              const testResults = await testResponse.json();
              console.log("🧪 [validateCoachingSubmission] Test results:", testResults);

              // Check if all tests passed
              const allPassed = testResults.results?.every((r: any) => r.passed) || false;
              const passedCount = testResults.results?.filter((r: any) => r.passed).length || 0;
              const totalCount = testResults.results?.length || 0;

              if (allPassed) {
                console.log("✅ [validateCoachingSubmission] All tests passed! Checking for optimization opportunities...");

                // Check if solution can be optimized
                let isOptimizable = false;
                try {
                  const optimizationAnalysis = await analyzeOptimizationWithAI(
                    currentEditorCode,
                    problemDescription
                  );
                  isOptimizable = optimizationAnalysis.isOptimizable || optimizationAnalysis.hasAlternative || false;
                  console.log("🔍 [validateCoachingSubmission] Optimization analysis:", {
                    isOptimizable: optimizationAnalysis.isOptimizable,
                    hasAlternative: optimizationAnalysis.hasAlternative,
                    currentComplexity: optimizationAnalysis.currentComplexity,
                    targetComplexity: optimizationAnalysis.targetComplexity,
                  });
                } catch (optError) {
                  console.warn("⚠️ [validateCoachingSubmission] Optimization analysis failed:", optError);
                  // Default to false if analysis fails
                  isOptimizable = false;
                }

                // Override validation to mark as complete
                validation.nextAction = "complete_session";
                validation.feedback = `🎉 Excellent work! Your solution passes all ${totalCount} test cases and meets the complexity requirements. Well done!`;
                validation.nextStep = {}; // Clear next step
                validation.isOptimizable = isOptimizable; // Add optimization flag

              } else {
                console.log(`⚠️ [validateCoachingSubmission] Tests failed: ${passedCount}/${totalCount} passed`);

                // Provide feedback about failed tests
                const failedTests = testResults.results?.filter((r: any) => !r.passed) || [];
                const firstFailed = failedTests[0];

                validation.isCorrect = false;
                validation.nextAction = "retry";
                validation.feedback = `Your solution looks complete, but ${totalCount - passedCount} test case(s) failed. 

Test Case ${firstFailed?.testNumber || 1}:
Input: ${JSON.stringify(firstFailed?.input)}
Expected: ${JSON.stringify(firstFailed?.expected)}
Got: ${JSON.stringify(firstFailed?.actual)}

${firstFailed?.error || "Review your logic and try again."}`;
                validation.nextStep = {};
              }
            }
          }
        } catch (testError) {
          console.error("⚠️ [validateCoachingSubmission] Test execution failed:", testError);
          // Continue with AI validation if test execution fails
        }
      }
    }

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
      sessionUpdateData.current_question = "";

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

  const analysis = await analyzeOptimizationWithAI(currentCode, problemDescription);

  if (!analysis.isOptimizable && !analysis.hasAlternative) {
    return {
      sessionId,
      nextAction: "complete_optimization",
      message: "Solution already appears optimal. Great job!",
      currentComplexity: analysis.currentComplexity,
    };
  }

  const optimizationType = analysis.isOptimizable ? 'optimization' : 'alternative';
  const prompt = `You are an expert ${optimizationType} coach.

PROBLEM: ${problemDescription}

CURRENT CODE:
\`\`\`python
${currentCode || "# no code"}
\`\`\`

ANALYSIS CONTEXT:
- Current complexity: ${JSON.stringify(analysis.currentComplexity)}
- ${analysis.isOptimizable ? `Target complexity: ${JSON.stringify(analysis.targetComplexity)}` : 'Alternative approach available'}
- Type: ${analysis.optimizationType}
- Reason: ${analysis.reason}

GOAL:
${analysis.isOptimizable
      ? `- Show a concrete optimization step toward better complexity
     - Focus on algorithmic improvements that reduce time/space complexity`
      : `- Show an alternative approach with same complexity but different trade-offs
     - Explain the benefits of the alternative approach`}

Return JSON only:
{
  "question": "specific question about the ${optimizationType}",
  "hint": "helpful hint without giving away the solution",
  "targetComplexity": "${analysis.targetComplexity?.time || analysis.currentComplexity?.time}",
  "optimizationType": "${optimizationType}",
  "codeToAdd": "optional 1-2 line hint or empty string",
  "nextAction": "hint"
}`;

  const text = await llmText(prompt, { temperature: 0.3, maxTokens: 600 });
  return { sessionId, step: text, optimizationType };
}

/**
 * Validate optimization step
 */
export async function validateOptimizationStep(
  sessionId: string,
  currentEditorCode: string,
  problemDescription: string,
  previousStep?: {
    question: string;
    hint?: string;
    optimizationType?: string;
    codeToAdd?: string;
  },
) {
  const analysis = await analyzeOptimizationWithAI(currentEditorCode, problemDescription);

  if (!analysis.isOptimizable && !analysis.hasAlternative) {
    return {
      isCorrect: true,
      improved: true,
      currentComplexity: analysis.currentComplexity,
      feedback: "Solution is now optimal. Excellent work!",
      nextAction: "complete_optimization",
    };
  }

  const evalPrompt = `You are an optimization reviewer.

PROBLEM: ${problemDescription}

CURRENT CODE:
\`\`\`python
${currentEditorCode}
\`\`\`

OPTIMIZATION CONTEXT:
${JSON.stringify(analysis)}

${previousStep ? `PREVIOUS STEP: ${JSON.stringify(previousStep)}` : ''}

TASK: Evaluate if the student has made progress toward the optimization goal.

Return JSON:
{
  "isCorrect": boolean,
  "improved": boolean,
  "feedback": "specific feedback about progress",
  "nextAction": "hint|insert_and_continue|complete_optimization",
  "nextStep": {
    "question": "next question if continuing",
    "hint": "next hint if continuing"
  }
}`;

  const response = await llmJson(evalPrompt, { temperature: 0.2, maxTokens: 600 });
  return JSON.parse(response);
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

/**
 * AI-powered optimization analysis - replaces hardcoded heuristics
 */
async function analyzeOptimizationWithAI(
  code: string,
  problemDescription: string,
): Promise<{
  isOptimizable: boolean;
  hasAlternative: boolean;
  currentComplexity?: { time: string; space: string };
  targetComplexity?: { time: string; space: string };
  reason?: string;
  optimizationType?: 'time' | 'space' | 'both' | 'alternative';
}> {
  const analysisPrompt = `You are an expert algorithm analyst. Analyze this solution for optimization opportunities.

PROBLEM CONTEXT:
${problemDescription}

CURRENT SOLUTION:
\`\`\`python
${code}
\`\`\`

ANALYSIS TASK:
1. Determine the current time and space complexity
2. Check if there are BETTER complexity optimizations available (e.g., O(n²) → O(n), O(n) space → O(1) space)
3. Check if there are alternative approaches with same complexity but different trade-offs
4. Consider the problem's typical optimal complexities

RESPONSE FORMAT (JSON only):
{
  "isOptimizable": boolean,
  "hasAlternative": boolean,
  "currentComplexity": {
    "time": "O(...)",
    "space": "O(...)"
  },
  "targetComplexity": {
    "time": "O(...)",
    "space": "O(...)"
  },
  "reason": "brief explanation of optimization opportunity",
  "optimizationType": "time|space|both|alternative"
}

RULES:
- isOptimizable = true ONLY if there's a complexity improvement possible
- hasAlternative = true if same complexity but different approach exists
- If solution is already optimal, set isOptimizable = false
- Be conservative - don't suggest optimizations that don't exist`;

  try {
    const response = await llmJson(analysisPrompt, {
      temperature: 0.1,
      maxTokens: 400,
    });

    return JSON.parse(response);
  } catch (error) {
    console.error("AI optimization analysis failed:", error);
    // Fallback to conservative default
    return {
      isOptimizable: false,
      hasAlternative: false,
      reason: "Analysis unavailable"
    };
  }
}

export async function startAlternativeCoaching(
  problemId: string,
  userId: string,
  currentCode: string,
  problemDescription: string,
  difficulty: "beginner" | "intermediate" | "advanced" = "beginner",
) {
  const sessionId = crypto.randomUUID();

  const analysis = await analyzeOptimizationWithAI(currentCode, problemDescription);

  if (!analysis.hasAlternative) {
    return {
      sessionId,
      nextAction: "complete_optimization",
      message: "No clear alternative approach available. Current solution looks good!",
      currentComplexity: analysis.currentComplexity,
    };
  }

  const prompt = `You are an expert alternative approach coach.

PROBLEM: ${problemDescription}

CURRENT CODE:
\`\`\`python
${currentCode || "# no code"}
\`\`\`

ANALYSIS: ${analysis.reason}

GOAL: Show an alternative approach with same complexity but different trade-offs or implementation style.

Return JSON only:
{
  "question": "specific question about the alternative approach",
  "hint": "helpful hint about the different approach",
  "approach": "brief description of alternative method",
  "codeToAdd": "optional 1-2 line hint or empty string",
  "nextAction": "hint"
}`;

  const text = await llmText(prompt, { temperature: 0.3, maxTokens: 600 });
  return { sessionId, step: text, sessionType: 'alternative' };
}
