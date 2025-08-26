import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmText, getOpenAI, llmWithSessionContext, clearSessionContext } from "./openai-utils.ts";
import { CoachingSession, CoachingValidation, CoachingStep, ContextualResponse } from "./types.ts";

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
 * Start an interactive coaching session - generates first question
 */
export async function startInteractiveCoaching(
  problemId: string,
  userId: string,
  currentCode: string,
  problemDescription: string,
  difficulty: "beginner" | "intermediate" | "advanced"
) {
  console.log("🎯 [startInteractiveCoaching] Starting context-aware coaching...", { problemId, userId, difficulty });
  const sessionId = crypto.randomUUID();
  
  // Analyze current code to determine correct line numbers
  const codeLines = (currentCode || "def countBits(self, n: int) -> List[int]:").split('\n');
  const nextLineNumber = Math.max(2, codeLines.length + 1);

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

CURRENT STUDENT CODE STATE:
\`\`\`python
${currentCode || "def countBits(self, n: int) -> List[int]:"}
\`\`\`

ALGORITHM-FOCUSED COACHING APPROACH:
- Examine existing algorithm implementation (ignore signatures)
- If they have data structures initialized, guide to the next algorithmic step  
- Focus on core logic: iteration patterns, bit manipulation, counting, etc.
- Ask about algorithmic approach, not code formatting or imports
- Reference line ${nextLineNumber} for where they should add algorithm code
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
    console.log("🎯 [startInteractiveCoaching] Creating initial coaching context...");
    
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

    console.log("🎯 [startInteractiveCoaching] Context created successfully");
    console.log(`🎯 [startInteractiveCoaching] Response ID: ${contextualResponse.responseId}`);
    console.log(`🎯 [startInteractiveCoaching] Is new context: ${contextualResponse.isNewContext}`);

    const rawContent = contextualResponse.content;
    let cleanContent = rawContent.trim();
    
    console.log("🎯 [startInteractiveCoaching] Raw AI response:", rawContent);
    
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/```$/m, "")
        .trim();
    }

    console.log("🎯 [startInteractiveCoaching] Cleaned response:", cleanContent);
    
    if (!cleanContent || cleanContent === "{}") {
      console.error("🚨 [startInteractiveCoaching] Empty response from AI");
      throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
    }
    
    stepData = JSON.parse(cleanContent);
    console.log("🎯 [startInteractiveCoaching] Parsed step data:", stepData);
    
    // Validate required fields
    if (!stepData.question || !stepData.highlightArea) {
      console.error("🚨 [startInteractiveCoaching] Missing required fields:", stepData);
      throw new Error("Invalid coaching step data");
    }
  } catch (error) {
    console.error("🚨 [startInteractiveCoaching] AI generation failed:", error);
    throw error;
  }

  // Only create database session AFTER successful AI step generation
  try {
    console.log("🎯 [startInteractiveCoaching] Creating database session...");
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
      console.error("🚨 [startInteractiveCoaching] Database error:", sessionError);
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
    
    console.log("🎯 [startInteractiveCoaching] Session created successfully with response_id:", contextualResponse.responseId);
    console.log(`🎯 [startInteractiveCoaching] Tokens potentially saved in future requests: ${contextualResponse.tokensSaved || 'N/A (initial context)'}`);
    
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
    console.error("🚨 [startInteractiveCoaching] Database operation failed:", dbError);
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
  console.log("🎯 [generateNextCoachingStep] Generating step...");
  
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

STUDENT'S CURRENT CODE STATE:
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

QUESTION REQUIREMENTS (ALGORITHM-FOCUSED):
- Ask about SPECIFIC algorithmic steps: "What data structure would store your results?" or "How would you process each number?"
- Focus on core algorithm logic: loops, conditions, data manipulation
- Reference their ACTUAL algorithm implementation with specific line numbers
- Include hints that guide algorithmic discovery, not boilerplate code

FOR HIGHLIGHTING: Use EXACT line numbers from their algorithm code (ignore function signature lines)

Return ONLY a JSON object with this structure:
{
  "question": "[Specific question about next code to write]",
  "hint": "[Hint that guides them to the answer without giving it away]", 
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
    console.log("🎯 [generateNextCoachingStep] Initializing OpenAI...");
    const openai = getOpenAI();
    
    console.log("🎯 [generateNextCoachingStep] Making API call to gpt-5-mini...");
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 800,
    });

    console.log("🎯 [generateNextCoachingStep] API call successful");
    const rawContent = response.choices[0]?.message?.content || "{}";
    let cleanContent = rawContent.trim();
    
    console.log("🎯 [generateNextCoachingStep] Raw AI response:", rawContent);
    console.log("🎯 [generateNextCoachingStep] Response choices:", response.choices);
    console.log("🎯 [generateNextCoachingStep] Response usage:", response.usage);
    console.log("🎯 [generateNextCoachingStep] Response model:", response.model);
    console.log("🎯 [generateNextCoachingStep] Full response object keys:", Object.keys(response));
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/```$/m, "")
        .trim();
    }
    
    console.log("🎯 [generateNextCoachingStep] Cleaned response:", cleanContent);
    
    if (!cleanContent || cleanContent === "{}") {
      console.error("🚨 [generateNextCoachingStep] Empty or invalid response from AI");
      console.error("🚨 [generateNextCoachingStep] Raw response was:", JSON.stringify(rawContent));
      console.error("🚨 [generateNextCoachingStep] Response choices length:", response.choices?.length);
      console.error("🚨 [generateNextCoachingStep] First choice:", JSON.stringify(response.choices?.[0], null, 2));
      console.error("🚨 [generateNextCoachingStep] API response object:", JSON.stringify(response, null, 2));
      
      
      throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
    }
    
    const step = JSON.parse(cleanContent);
    console.log("🎯 [generateNextCoachingStep] Parsed step:", step);
    
    // Validate required fields
    if (!step.question || !step.hint) {
      console.error("🚨 [generateNextCoachingStep] Missing required fields:", step);
      throw new Error("Step missing required fields");
    }
    
    console.log("✅ [generateNextCoachingStep] Step generation successful");
    return step;
  } catch (error) {
    console.error("🚨 [generateNextCoachingStep] Error:", error);
    
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
  const contextContinuationPrompt = `STUDENT CODE UPDATE:
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
    "efficiency": "optimal" | "acceptable" | "inefficient"
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

STUDENT'S CURRENT CODE STATE:
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

