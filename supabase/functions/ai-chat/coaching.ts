import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmText, getOpenAI } from "./openai-utils.ts";
import { CoachingSession, CoachingValidation, CoachingStep } from "./types.ts";

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
  console.log("🎯 [startInteractiveCoaching] Starting...", { problemId, userId, difficulty });
  const sessionId = crypto.randomUUID();
  
  // Analyze current code to determine correct line numbers
  const codeLines = (currentCode || "def countBits(self, n: int) -> List[int]:").split('\n');
  const nextLineNumber = Math.max(2, codeLines.length + 1); // Start from line 2 (after function signature) or after existing code

  // Generate first coaching step using AI BEFORE creating database session
  const prompt = `You are an expert coding coach for a LeetCode-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT:
- This code runs on Judge0 servers (automatic execution like LeetCode)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY
- Students ONLY implement the core algorithm logic inside the function body
- NEVER mention function signatures, imports, or test case handling
- Focus EXCLUSIVELY on algorithm implementation and problem-solving logic

Problem: ${problemDescription}
Current code:
\`\`\`python
${currentCode || "def countBits(self, n: int) -> List[int]:"}
\`\`\`

Difficulty level: ${difficulty}

COACHING APPROACH:
- Analyze ONLY the algorithm logic and implementation
- Guide them through the problem-solving approach step by step
- Focus on data structures, loops, conditions, and algorithmic thinking
- Reference line ${nextLineNumber} for where they should add algorithm code
- Be specific about algorithmic steps, not boilerplate code

ALGORITHM-FOCUSED GUIDELINES:
- Examine existing algorithm implementation (ignore signatures)
- If they have data structures initialized, guide to the next algorithmic step
- Focus on core logic: iteration patterns, bit manipulation, counting, etc.
- Ask about algorithmic approach, not code formatting or imports
- Help them think through the problem-solving process

Return a JSON object with:
- A specific question about what algorithm step to implement next
- A concrete hint that guides them to the solution logic
- The correct highlight area for where they should add code

Required JSON format:
{
  "question": "[Specific question about what algorithm step to implement next based on current code]",
  "hint": "[Specific actionable hint - mention exact code patterns, variable names, or logic they should implement]",
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

  let stepData;
  try {
    console.log("🎯 [startInteractiveCoaching] Initializing OpenAI...");
    const openai = getOpenAI();
    
    console.log("🎯 [startInteractiveCoaching] Making API call...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    console.log("🎯 [startInteractiveCoaching] API call successful");

    const rawContent = response.choices[0].message.content || "{}";
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
      });
    
    console.log("🎯 [startInteractiveCoaching] Session created successfully");
    
    return {
      sessionId,
      question: stepData.question,
      hint: stepData.hint,
      highlightArea: stepData.highlightArea,
      difficulty: stepData.difficulty || difficulty,
      currentStepNumber: 1,
      awaitingSubmission: true,
      isCompleted: false,
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
  
  const prompt = `You are an expert coding coach for a LeetCode-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT:
- This code runs on Judge0 servers (automatic execution like LeetCode)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY
- Students ONLY implement the core algorithm logic inside the function body
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

  const prompt = `You are an expert coding coach for a LeetCode-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT:
- This code will be executed on Judge0 servers (like LeetCode)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY by the platform
- Students ONLY need to implement the core algorithm logic inside the function body
- DO NOT mention function signatures, imports, or test case handling in your feedback
- Focus ONLY on algorithm correctness and implementation logic

Current Problem: ${session.problemDescription}

Student's Current Code:
\`\`\`python
${currentEditorCode}
\`\`\`

${studentResponse && studentResponse.trim() && studentResponse !== "Code validation from highlighted area" 
  ? `Student's Explanation: "${studentResponse}"

` : ""}VALIDATION FOCUS:
1. Analyze ONLY the algorithm logic and implementation approach
2. Check for logical errors in the problem-solving approach  
3. Verify variable usage, loops, and data manipulation
4. Ignore any missing imports or function signature issues (platform handles these)
5. Focus on whether their core algorithm will produce correct results

FEEDBACK GUIDELINES:
- Comment ONLY on algorithm logic, not boilerplate code
- If they use built-in functions like bin(), count(), range() - that's perfectly fine
- Focus on algorithm correctness: loops, conditions, data structures, return logic
- Be specific about what algorithmic step needs improvement

CRITICAL: Before providing "codeToAdd", check if that exact code already exists in their current editor code. If the code they need is already present, DO NOT include "codeToAdd" - instead guide them to the next step.

Return a JSON object with this exact structure:
{
  "isCorrect": boolean,
  "feedback": "string - specific feedback about ALGORITHM LOGIC ONLY (not imports/signatures)",
  "nextStep": {
    "question": "string - next algorithmic coaching question to guide them",
    "hint": "string - algorithmic hint for the next step",
    "highlightArea": {
      "startLine": number,
      "endLine": number,
      "description": "string - what algorithmic area to focus on next"
    }
  },
  "codeToAdd": "string - ONLY if they need NEW algorithmic code that doesn't exist. Focus on core logic, not boilerplate."
}

Remember: Judge0 handles all execution setup. Focus purely on helping them implement the correct algorithm.`;

  try {
    console.log("🎯 [validateCoachingSubmission] Initializing OpenAI...");
    const openai = getOpenAI();
    
    console.log("🎯 [validateCoachingSubmission] Making API call to gpt-5-mini...");
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini", 
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1500,
      // GPT-5 doesn't support temperature, top_p, etc.
    });

    console.log("🎯 [validateCoachingSubmission] API call successful");

    // Check if response was truncated due to token limit
    const finishReason = response.choices[0].finish_reason;
    if (finishReason === "length") {
      console.error("🚨 [validateCoachingSubmission] Response truncated due to token limit");
      throw new Error("AI_RESPONSE_TRUNCATED: Response was truncated. Please try with shorter code or simpler validation.");
    }

    const rawContent = response.choices[0].message.content || "{}";
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
      console.error("🚨 [validateCoachingSubmission] Response choices:", response.choices);
      console.error("🚨 [validateCoachingSubmission] Response usage:", response.usage);
      console.error("🚨 [validateCoachingSubmission] Response model:", response.model);
      console.error("🚨 [validateCoachingSubmission] Full response object keys:", Object.keys(response));
      
      
      throw new Error("AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We're working on a fix.");
    }
    
    const validation = JSON.parse(cleanContent);
    console.log("🎯 [validateCoachingSubmission] Parsed validation:", validation);
    
    // Validate required fields
    if (!validation.feedback || !validation.nextStep) {
      console.error("🚨 [validateCoachingSubmission] Missing required fields:", validation);
      throw new Error("Validation missing required fields");
    }
    
    // Store the response in database
    await supabaseAdmin
      .from("coaching_responses")
      .insert({
        session_id: sessionId,
        step_number: session.current_step_number,
        question: session.current_question,
        student_response: studentResponse,
        submitted_code: studentCode,
        validation_result: validation,
        is_correct: validation.isCorrect
      });

    // Update session state
    if (validation.nextAction === "complete_session") {
      await supabaseAdmin
        .from("coaching_sessions")
        .update({
          is_completed: true,
          session_state: 'completed',
          awaiting_submission: false
        })
        .eq("id", sessionId);
    } else if (validation.isCorrect && validation.nextAction === "insert_and_continue") {
      await supabaseAdmin
        .from("coaching_sessions")
        .update({
          current_step_number: session.current_step_number + 1,
          current_question: validation.nextStep?.question || "",
          awaiting_submission: true
        })
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
  
  const prompt = `You are an expert coding coach for a LeetCode-style platform with Judge0 execution environment.

CRITICAL EXECUTION CONTEXT:
- This code runs on Judge0 servers (automatic execution like LeetCode)
- Function signatures, imports (List, Optional, etc.), and test cases are PROVIDED AUTOMATICALLY
- Students ONLY implement the core algorithm logic inside the function body
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

