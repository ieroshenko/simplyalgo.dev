/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import modular components
import {
  RequestBody,
  AIResponse,
  CodeSnippet,
  ChatMessage
} from "./types.ts";
import { logger } from "./utils/logger.ts";
import {
  initializeOpenAI,
  configuredModel,
  modelSource,
  useResponsesApi,
  llmJson,
} from "./openai-utils.ts";
import {
  startInteractiveCoaching,
  validateCoachingSubmission,
  generateNextCoachingStep,
  startOptimizationCoaching,
  validateOptimizationStep,
} from "./coaching.ts";
import {
  maybeGenerateDiagram,
  explainMermaid
} from "./diagrams.ts";
import {
  generateConversationResponse,
  analyzeCodeSnippets,
  insertSnippetSmart,
  generateVisualizationComponent
} from "./code-analysis.ts";
import { validateCoachingMode } from "./prompts.ts";

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
 * CORS headers for all responses
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize OpenAI client
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
      previousResponseId,
      userId,
      problem,
      problemId,
      difficulty,
      stepId,
      userResponse,
      studentCode,
      currentEditorCode,
      coachingMode,
    } = body;

    // Validate coaching mode and ensure fallback to comprehensive for invalid/missing mode
    const validatedCoachingMode = validateCoachingMode(coachingMode);

    // NOTE: AI access control is now handled on the frontend for zero latency.
    // The frontend uses useAIAccessStatus hook to check restrictions before making requests.
    // Usage logging happens async after successful responses (non-blocking).

    // Initialize OpenAI client with error handling
    try {
      initializeOpenAI();
    } catch (error) {
      logger.error("Failed to initialize OpenAI", error, { function: 'ai-chat', action: 'init' });
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

    // Start interactive coaching session action
    if (req.method === "POST" && action === "start_interactive_coaching") {
      logger.coaching("Generate session request", {
        problemId,
        userId,
        hasCurrentCode: !!currentCode,
        difficulty,
        action: 'start_interactive_coaching'
      });

      if (!problemId || !userId || !currentCode) {
        return new Response(
          JSON.stringify({
            error: "Missing problemId, userId, or currentCode for start_interactive_coaching action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Ensure we have a problem description for coaching
      if (!problemDescription) {
        return new Response(
          JSON.stringify({
            error: "Missing problemDescription for start_interactive_coaching action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        logger.coaching("Starting interactive coaching session", {
          problemId,
          userId,
          difficulty: difficulty || "beginner"
        });
        const coachingSession = await startInteractiveCoaching(
          problemId,
          userId,
          currentCode || "",
          problemDescription || "",
          difficulty || "beginner"
        );
        logger.coaching("Interactive session started", {
          problemId,
          userId,
          sessionId: coachingSession?.sessionId
        });

        return new Response(JSON.stringify(coachingSession), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        logger.error("Error generating coaching session", error, {
          problemId,
          userId,
          action: 'start_interactive_coaching',
          errorName: (error as Error)?.name,
          errorCause: (error as unknown as { cause?: unknown })?.cause
        });

        // Check if this is an AI service unavailable error
        const errorMessage = (error as Error)?.message || "Unknown error";
        if (errorMessage.includes("AI_SERVICE_UNAVAILABLE")) {
          return new Response(
            JSON.stringify({
              error: "AI_SERVICE_UNAVAILABLE",
              message: "AI Coach is temporarily unavailable. We're working on a fix and will have it back online soon.",
              userFriendlyMessage: "🤖 AI Coach is taking a quick break! We're working on getting it back online. Please try again in a few minutes.",
            }),
            {
              status: 503,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: "Failed to generate coaching session",
            details: errorMessage,
            errorType: (error as Error)?.name || "UnknownError"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Validate interactive coaching submission action
    if (req.method === "POST" && action === "validate_coaching_submission") {
      logger.coaching("Validate submission request", {
        sessionId,
        hasStudentCode: !!studentCode,
        hasCurrentEditorCode: !!currentEditorCode,
        action: 'validate_coaching_submission'
      });

      if (!sessionId || !studentCode || !currentEditorCode) {
        return new Response(
          JSON.stringify({
            error: "Missing sessionId, studentCode, or currentEditorCode for validate_coaching_submission action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        console.log("🎯 [COACHING] Validating submission...");
        const validation = await validateCoachingSubmission(
          sessionId,
          studentCode,
          userResponse || "",
          currentEditorCode,
          problemId, // Pass problemId for test execution
          userId     // Pass userId for test execution
        );
        console.log("🎯 [COACHING] Validation result:", validation);

        return new Response(JSON.stringify(validation), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("🚨 [COACHING] Error validating submission:", error);
        console.error("🚨 [COACHING] Error stack:", (error as Error)?.stack);

        // Check if this is an AI service unavailable error
        const errorMessage = (error as Error)?.message || "Unknown error";
        if (errorMessage.includes("AI_SERVICE_UNAVAILABLE")) {
          return new Response(
            JSON.stringify({
              error: "AI_SERVICE_UNAVAILABLE",
              message: "AI Coach is temporarily unavailable. We're working on a fix and will have it back online soon.",
              userFriendlyMessage: "🤖 AI Coach is taking a quick break! We're working on getting it back online. Please try again in a few minutes.",
            }),
            {
              status: 503,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: "Failed to validate coaching submission",
            details: errorMessage,
            errorType: (error as Error)?.name || "UnknownError"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Start optimization coaching action
    if (req.method === "POST" && action === "start_optimization_coaching") {
      if (!problemId || !userId || !currentCode || !problemDescription) {
        return new Response(
          JSON.stringify({ error: "Missing fields for start_optimization_coaching" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      try {
        const result = await startOptimizationCoaching(
          problemId,
          userId,
          currentCode,
          problemDescription,
          difficulty || "beginner",
        );
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("[OPTIMIZATION] start failed:", e);
        return new Response(JSON.stringify({ error: "Failed to start optimization" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Validate optimization step action
    if (req.method === "POST" && action === "validate_optimization_step") {
      if (!sessionId || !currentEditorCode || !problemDescription) {
        return new Response(
          JSON.stringify({ error: "Missing fields for validate_optimization_step" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      try {
        const result = await validateOptimizationStep(sessionId, currentEditorCode, problemDescription);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("[OPTIMIZATION] validate failed:", e);
        return new Response(JSON.stringify({ error: "Failed to validate optimization" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Generate next coaching step action
    if (req.method === "POST" && action === "generate_next_coaching_step") {
      const { sessionId, currentCode, previousResponse, problemDescription, difficulty } = body;

      if (!sessionId || !currentCode) {
        return new Response(
          JSON.stringify({
            error: "Missing sessionId or currentCode for generate_next_coaching_step action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        const nextStep = await generateNextCoachingStep(
          sessionId,
          currentCode,
          previousResponse || "",
          problemDescription || "",
          difficulty || "medium"
        );

        return new Response(JSON.stringify(nextStep), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error generating next coaching step:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to generate next coaching step",
            details: (error as Error)?.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

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
        const visualizationComponent = await generateVisualizationComponent(problem);

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

    // Validate required fields for normal chat operations (not for action requests)
    if (!action && (!message || !problemDescription)) {
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
      console.log("[ai-chat] insert_snippet request received");
      console.log("[ai-chat] code length:", code?.length || 0);
      console.log("[ai-chat] snippet:", snippet);

      if (!code || !snippet?.code) {
        console.error("[ai-chat] Missing required fields - code:", !!code, "snippet.code:", !!snippet?.code);
        return new Response(
          JSON.stringify({
            error: "Missing code or snippet.code for insert_snippet action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        console.log("[ai-chat] Calling insertSnippetSmart...");
        console.log("[ai-chat] Code preview:", code?.substring(0, 100));
        console.log("[ai-chat] Snippet preview:", snippet?.code?.substring(0, 100));
        const result = await insertSnippetSmart(
          code,
          snippet,
          problemDescription || "",
          cursorPosition,
          message || ""
        );
        console.log("[ai-chat] insertSnippetSmart completed successfully");
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error inserting snippet:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to insert snippet",
            details: (error as Error).message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Analyze complexity action
    if (req.method === "POST" && action === "analyze_complexity") {
      console.log("[ai-chat] complexity analysis request received");

      if (!code) {
        return new Response(
          JSON.stringify({
            error: "Missing code for analyze_complexity action",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        // Normalize problem fields from camelCase or snake_case
        const pid = (body as any).problemId || (body as any).problem_id || problemId || '';
        const pdesc =
          (body as any).problemDescription ||
          (body as any).problem_description ||
          problemDescription ||
          '';

        // Optionally fetch recommended complexities from DB
        let recommendedTime = '';
        let recommendedSpace = '';
        if (pid) {
          try {
            const { data: prob } = await supabase
              .from('problems')
              .select('title, recommended_time_complexity, recommended_space_complexity')
              .eq('id', pid)
              .single();
            if (prob) {
              recommendedTime = prob.recommended_time_complexity || '';
              recommendedSpace = prob.recommended_space_complexity || '';
            }
          } catch (_) {
            // Non-fatal if metadata missing
          }
        }

        // Guard against extremely large code blocks causing truncation
        const MAX_LINES = 300;
        const codeLines = code.split("\n");
        const trimmedCode =
          codeLines.length > MAX_LINES
            ? codeLines.slice(0, MAX_LINES).join("\n") + "\n# ... trimmed ..."
            : code;

        const prompt = `Analyze the time and space complexity of this code solution for the following problem.

Problem: ${pdesc || "No description provided"}

${recommendedTime || recommendedSpace ? `Target (recommended) complexity for this problem:\n- Time: ${recommendedTime || 'unknown'}\n- Space: ${recommendedSpace || 'unknown'}\n` : ''}

Code to analyze (trimmed if too long):
\`\`\`python
${trimmedCode}
\`\`\`

Please provide concise, teacher-friendly explanations (no fluff), and explicitly say if the solution meets the target complexity when targets are provided.

Respond in JSON format:
{
  "timeComplexity": "O(...)",
  "timeExplanation": "Short, clear reason a student would understand",
  "spaceComplexity": "O(...)", 
  "spaceExplanation": "Short, clear reason a student would understand",
  "meetsRecommendedTime": ${recommendedTime ? 'true|false' : 'null'},
  "meetsRecommendedSpace": ${recommendedSpace ? 'true|false' : 'null'},
  "overallAnalysis": "One or two short sentences: does it meet targets and why"
}`;

        // Use the same LLM pipeline/utilities as chat endpoints
        // This respects configuredModel and Responses API usage automatically
        const responseText = await llmJson(prompt, { maxTokens: 600 });

        // Parse the JSON response
        let complexityAnalysis;
        try {
          complexityAnalysis = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse AI response as JSON:", responseText);
          // Last resort: attempt to extract JSON object via regex
          const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
          if (jsonMatch) {
            try {
              complexityAnalysis = JSON.parse(jsonMatch[0]);
            } catch {
              // If parsing still fails, return a safe fallback instead of 500
              complexityAnalysis = {
                timeComplexity: "Unknown",
                timeExplanation:
                  "Could not parse the analysis output. Please retry.",
                spaceComplexity: "Unknown",
                spaceExplanation:
                  "Could not parse the analysis output. Please retry.",
                overallAnalysis:
                  "Temporary parsing issue from the analysis service.",
              };
            }
          } else {
            complexityAnalysis = {
              timeComplexity: "Unknown",
              timeExplanation:
                "The analysis service returned an empty response. Please retry or refine the code snippet.",
              spaceComplexity: "Unknown",
              spaceExplanation:
                "The analysis service returned an empty response. Please retry or refine the code snippet.",
              overallAnalysis:
                "Unable to determine complexity due to a temporary AI response issue.",
            };
          }
        }

        return new Response(
          JSON.stringify({ complexityAnalysis }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error) {
        console.error("Error analyzing complexity:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to analyze complexity",
            details: (error as Error).message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Flashcard conversation action
    if (req.method === "POST" && action === "flashcard_conversation") {
      console.log("[ai-chat] flashcard conversation request received");

      const {
        problemId,
        problemDescription,
        solutionCode,
        solutionTitle,
        conversationHistory,
        currentQuestionIndex = 0,
        questionType = "initial"
      } = body;

      console.log("[ai-chat] flashcard request details:", {
        problemId,
        problemDescriptionLength: problemDescription?.length || 0,
        problemDescriptionPreview: problemDescription?.substring(0, 100) + "...",
        solutionCodeLength: solutionCode?.length || 0,
        solutionTitle,
        questionType
      });

      if (!problemId || !problemDescription || !solutionCode) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields for flashcard conversation",
            required: ["problemId", "problemDescription", "solutionCode"]
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const openai = initializeOpenAI();
        if (!openai) {
          throw new Error("OpenAI client initialization failed");
        }

        // Generate conversation based on question type
        let systemPrompt = "";
        let questionPrompt = "";

        if (questionType === "initial") {
          systemPrompt = `You are an AI tutor helping a student recall the core solution technique for a coding problem. Your goal is to test if they remember the key insight/approach that makes this problem solvable.

Guidelines:
- Ask about the core technique, pattern, or key insight (not implementation details)
- Focus on the "aha moment" or main strategy
- Be encouraging and supportive
- Don't give away the answer - help them recall the technique
- Keep it focused on the essential problem-solving approach

Problem: ${problemDescription}
Solution to review: ${solutionTitle || "User's solution"}`;

          questionPrompt = `Ask the student to recall the core technique or key insight they used to solve this problem. What was the main strategy or pattern that made this problem solvable? Focus on the essential approach, not implementation details.`;
        } else if (questionType === "followup") {
          systemPrompt = `You are helping a student recall the core technique for a coding problem. Based on their previous response, decide if they understood the core technique or need more help.

IMPORTANT DECISION LOGIC:
- If they correctly identified the core technique (even if incomplete), respond with "MOVE_TO_EDGE_CASES:" followed by an edge cases question
- If they got both the core technique AND edge cases in their first answer, respond with "COMPLETE:" followed by positive feedback
- If they were completely wrong or vague, provide ONE specific hint and ask them to try again
- Be generous - if they show understanding of the main idea, move to edge cases
- Keep it concise - maximum 2 follow-ups before moving to edge cases

Problem: ${problemDescription}
Solution: ${solutionTitle || "User's solution"}
Previous conversation: ${JSON.stringify(conversationHistory)}`;

          questionPrompt = `Evaluate the student's response about the core technique. Be generous in your assessment:
- If they show understanding of the main approach (even if not perfect), start with "MOVE_TO_EDGE_CASES:" and ask about edge cases
- If they got both technique AND edge cases, start with "COMPLETE:" and give positive feedback
- If they were too vague or wrong, give ONE specific hint and ask them to try again
- Keep responses concise and focused.`;
        } else if (questionType === "edge_cases") {
          systemPrompt = `The student has successfully recalled the core technique. Now evaluate their response about edge cases.

IMPORTANT DECISION LOGIC:
- If they mentioned ANY relevant edge cases, respond with "COMPLETE:" followed by positive feedback
- If they missed ALL edge cases, provide a brief hint about 1-2 key edge cases, then respond with "COMPLETE:"
- Be generous - any reasonable edge case thinking should be considered sufficient
- Keep feedback concise and positive

Problem: ${problemDescription}
Solution: ${solutionTitle || "User's solution"}
Previous conversation: ${JSON.stringify(conversationHistory)}`;

          questionPrompt = `Evaluate their response about edge cases. Be generous:
- If they mentioned any relevant edge cases, start with "COMPLETE:" and give positive feedback
- If they missed edge cases, briefly mention 1-2 key ones, then start with "COMPLETE:" and positive feedback
- Keep it concise and encouraging.`;
        } else if (questionType === "evaluation") {
          systemPrompt = `You are wrapping up a flashcard review session. The student has gone through the core technique and edge cases. Provide encouraging feedback.

Problem: ${problemDescription}
Conversation: ${JSON.stringify(conversationHistory)}`;

          questionPrompt = `Provide positive, encouraging feedback on their recall. Acknowledge what they remembered well and gently mention any key points they might want to review. Keep it brief and supportive.`;
        }

        const completionParams = {
          model: configuredModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: questionPrompt }
          ],
          max_completion_tokens: 1000, // Increased to account for GPT-5 reasoning tokens
        };

        // Only add temperature for non-GPT-5 models
        if (!configuredModel.startsWith("gpt-5")) {
          completionParams.temperature = 0.7;
        }

        console.log("[ai-chat] calling OpenAI with params:", {
          model: completionParams.model,
          systemPromptLength: completionParams.messages[0].content.length,
          questionPromptLength: completionParams.messages[1].content.length,
          hasTemperature: 'temperature' in completionParams,
          maxTokens: completionParams.max_completion_tokens,
          temperature: completionParams.temperature
        });

        console.log("[ai-chat] Full system prompt:", completionParams.messages[0].content);
        console.log("[ai-chat] Full question prompt:", completionParams.messages[1].content);

        const completion = await openai.chat.completions.create(completionParams);

        console.log("[ai-chat] OpenAI completion result:", {
          choices: completion.choices?.length || 0,
          contentLength: completion.choices[0]?.message?.content?.length || 0,
          finishReason: completion.choices[0]?.finish_reason,
          usage: completion.usage,
          model: completion.model,
          id: completion.id
        });

        const response = completion.choices[0]?.message?.content || "";
        console.log("[ai-chat] Extracted response content:", {
          length: response.length,
          preview: response.substring(0, 200),
          isEmpty: !response || response.trim() === ""
        });

        if (!response || response.trim() === "") {
          console.error("[ai-chat] Empty response from OpenAI for flashcard conversation");
          console.error("[ai-chat] Full completion object:", JSON.stringify(completion, null, 2));
          console.error("[ai-chat] System prompt was:", systemPrompt.substring(0, 200) + "...");
          console.error("[ai-chat] Question prompt was:", questionPrompt);
        }

        return new Response(
          JSON.stringify({
            response,
            questionIndex: currentQuestionIndex,
            nextQuestionType: currentQuestionIndex < 2 ? "followup" : "evaluation"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );

      } catch (error) {
        console.error("Error in flashcard conversation:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to generate flashcard conversation",
            details: (error as Error).message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generate or retrieve chat session ID for context continuity
    const chatSessionId = sessionId || `chat_${userId || 'anonymous'}_${problemId || Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    console.log(`[ai-chat] Using chat session: ${chatSessionId}`);

    // Default chat behavior: generate conversation + analyze snippets + opportunistic diagram
    const [conversationResponse, userCodeSnippets, diagram] = await Promise.all(
      [
        generateConversationResponse(
          (message || "").slice(0, 800),
          (problemDescription || "").slice(0, 1200),
          conversationHistory || [],
          testCases,
          (currentCode || "").slice(0, 3000),
          chatSessionId, // Pass session ID for context management
          {
            previousResponseId: typeof previousResponseId === 'string' ? previousResponseId : null,
            coachingMode: validatedCoachingMode,
          },
          userId ? { userId, feature: "ai_chat" } : undefined,
        ),
        analyzeCodeSnippets(
          (message || "").slice(0, 800),
          conversationHistory || [],
          (problemDescription || "").slice(0, 1200),
          testCases,
          (currentCode || "").slice(0, 3000),
        ),
        maybeGenerateDiagram(
          (message || "").slice(0, 800),
          (problemDescription || "").slice(0, 1200),
          conversationHistory || [],
          false,
          preferredEngines,
        ),
      ],
    );

    // Analyze AI response for code snippets to enable "Add to Editor" buttons in chat
    const aiCodeSnippets = await analyzeCodeSnippets(
      conversationResponse,
      conversationHistory || [],
      (problemDescription || "").slice(0, 1200),
      testCases,
      (currentCode || "").slice(0, 3000),
    );
    console.log(
      `[Main] AI response analysis complete: ${aiCodeSnippets.length} snippets found`,
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
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
