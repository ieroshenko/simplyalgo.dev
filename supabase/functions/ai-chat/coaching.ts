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
  const prompt = `You are an expert coding coach for LeetCode problem: ${problemId}.

Problem: ${problemDescription}
Current code:
\`\`\`python
${currentCode || "def countBits(self, n: int) -> List[int]:"}
\`\`\`

Difficulty level: ${difficulty}

Analyze the current code and determine what the student needs to implement next. Look at what they already have and guide them to the next logical step.

IMPORTANT CONTEXT:
- The function signature, imports, and test cases are handled automatically by the Judge0 system
- Focus ONLY on the algorithm implementation and problem-solving steps
- Do NOT mention function signatures, imports, or test cases in your guidance
- The student only needs to focus on the core logic inside the function body

COACHING GUIDELINES:
- Carefully examine the existing code to see what's already implemented
- If they already have a result array (like "res = [0] * (n + 1)"), don't ask them to create it again
- Guide them to the next missing piece (like adding a loop, implementing the bit counting logic, etc.)
- Reference the correct line number where they should add code: line ${nextLineNumber}
- Generate SPECIFIC and ACTIONABLE questions and hints based on the actual code analysis
- Don't use generic placeholder text - be specific about what they need to implement
- Focus on algorithm logic, not boilerplate code

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
  
  const prompt = `You are an expert coding coach for a LeetCode-style platform. Generate a single, targeted coaching question.

CODING ENVIRONMENT CONTEXT:
- This is an online coding platform similar to LeetCode
- Students write Python code that gets executed with Judge0 (automatic test runner)
- All necessary imports (List, Optional, etc.) are handled automatically by the judge system
- Students only need to implement the algorithm logic inside the function body
- The platform tests their code against multiple test cases automatically

PROBLEM: ${problemDescription}

STUDENT'S CURRENT CODE STATE:
\`\`\`python
${currentCode || "# No code written yet"}
\`\`\`

${previousResponse ? `PREVIOUS STUDENT RESPONSE: ${previousResponse}` : ''}

STUDENT PROGRESS ANALYSIS:
${currentCode.trim() === "" || currentCode.includes("def ") && currentCode.split('\n').length === 1 
  ? "🔍 BEGINNER STATE: Student has empty editor or only function signature. They need guidance on algorithm approach and implementation steps."
  : "🔄 IN PROGRESS: Student has started implementing. Analyze their current logic for correctness, efficiency, and next steps."}

Difficulty level: ${difficulty}

COACHING STRATEGY:
1. If code is empty/minimal: Focus on problem understanding, algorithm approach, and first implementation steps
2. If code exists: Analyze current implementation, identify issues, and guide improvements  
3. Ask ONE specific question that helps them write 1-3 lines of code (not the whole solution)
4. Guide them to discover solutions rather than giving direct answers

QUESTION REQUIREMENTS:
- Ask about SPECIFIC next steps: "What data structure would store your results?" or "How would you iterate through the array?"
- Focus on writing small incremental code pieces
- Reference their ACTUAL code with specific line numbers if they have code
- Include helpful hints that guide discovery

FOR HIGHLIGHTING: Use EXACT line numbers from their code, or line 1 if they only have function signature

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

  const prompt = `You are an expert coding coach. Validate a student's code submission and provide feedback.

Current Problem: ${session.problemDescription}

Student's Current Code:
\`\`\`python
${currentEditorCode}
\`\`\`

Student's Response/Explanation: "${studentResponse}"

The student has written code in the highlighted area and is asking for validation. Analyze their current code implementation:

1. Check if the code logic is correct for solving the problem
2. Look for syntax errors, logical errors, or missing components
3. Determine if they're on the right track or need guidance
4. If correct, acknowledge their progress and suggest the next step
5. If incorrect, provide specific feedback and guidance

CRITICAL: Before providing "codeToAdd", check if that exact code already exists in their current editor code. If the code they need is already present, DO NOT include "codeToAdd" - instead guide them to the next step.

Return a JSON object with this exact structure:
{
  "isCorrect": boolean,
  "feedback": "string - specific feedback about their code implementation",
  "nextStep": {
    "question": "string - next coaching question to guide them",
    "hint": "string - helpful hint for the next step",
    "highlightArea": {
      "startLine": number,
      "endLine": number,
      "description": "string - what area of code to focus on next"
    }
  },
  "codeToAdd": "string - ONLY if they need NEW code that doesn't already exist in their editor. If the code already exists, omit this field entirely."
}

Be encouraging but accurate. Help them learn through discovery.`;

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
  
  const prompt = `You are an expert coding coach for a LeetCode-style platform. Analyze the student's current progress and generate targeted coaching steps.

CODING ENVIRONMENT CONTEXT:
- This is an online coding platform similar to LeetCode
- Students write Python code that gets executed with Judge0 (automatic test runner)
- All necessary imports (List, Optional, etc.) are handled automatically by the judge system
- Students only need to implement the algorithm logic inside the function body
- The platform tests their code against multiple test cases automatically

PROBLEM: ${problemDescription}

STUDENT'S CURRENT CODE STATE:
${"```"}python
${currentCode || "# No code written yet"}
${"```"}

STUDENT PROGRESS ANALYSIS:
${currentCode.trim() === "" || currentCode.includes("def ") && currentCode.split('\n').length === 1 
  ? "🔍 BEGINNER STATE: Student has empty editor or only function signature. They need guidance on algorithm approach and implementation steps."
  : "🔄 IN PROGRESS: Student has started implementing. Analyze their current logic for correctness, efficiency, and next steps."}

Difficulty level: ${difficulty}

COACHING STRATEGY:
1. If code is empty/minimal: Focus on problem understanding, algorithm approach, and first implementation steps
2. If code exists: Analyze current implementation, identify issues, and guide improvements
3. Always provide specific, actionable steps that build on their current progress
4. Ask questions that help them discover solutions rather than giving direct answers

Create 3-5 coaching steps that guide the student through improving their solution. Each step should:
1. Ask a specific question about their ACTUAL code (not generic questions)
2. Highlight the EXACT lines from their code that are relevant to the question
3. Include expected keywords in the student's response
4. Provide a helpful hint specific to their current implementation

CRITICAL: For highlightArea, use EXACT line numbers from the student's code:
- If they have only a function signature (1 line), highlight line 1
- If they have multiple lines, highlight the specific lines relevant to each question
- startLine and endLine should correspond to actual lines in their code
- Don't use placeholder numbers like "1-5" for everything

Return ONLY a JSON object with this structure:
{
  "sessionId": "${sessionId}",
  "steps": [
    {
      "id": "step-1", 
      "question": "[Question about their specific code]",
      "hint": "[Hint specific to what they've written]",
      "expectedKeywords": ["keyword1", "keyword2"],
      "highlightArea": {
        "startLine": [actual line number],
        "endLine": [actual line number], 
        "startColumn": 1,
        "endColumn": 50
      }
    }
  ]
}

Example: If they only have "def topKFrequent(self, nums, k):" on line 1, then highlight line 1 for that question.

Make each step build on their current progress and guide them toward implementing the missing parts.

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

