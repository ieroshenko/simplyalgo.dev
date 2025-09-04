import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

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
  useResponsesApi 
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
    } = body;

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
          currentEditorCode
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
        const result = await insertSnippetSmart(
          code,
          snippet,
          problemDescription || "",
          cursorPosition,
          message || ""
        );
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
        const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
        
        const prompt = `Analyze the time and space complexity of this code solution for the following problem:

Problem: ${problemDescription || "No description provided"}

Code to analyze:
\`\`\`python
${code}
\`\`\`

Please provide:
1. Time complexity in Big O notation
2. Detailed explanation of why this is the time complexity
3. Space complexity in Big O notation  
4. Detailed explanation of why this is the space complexity
5. Overall analysis summary

Respond in JSON format:
{
  "timeComplexity": "O(...)",
  "timeExplanation": "Detailed explanation of time complexity",
  "spaceComplexity": "O(...)", 
  "spaceExplanation": "Detailed explanation of space complexity",
  "overallAnalysis": "Summary of the algorithm's efficiency and characteristics"
}`;

        const completionParams = {
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert algorithm analyst. Analyze code complexity accurately and provide clear, educational explanations. Always respond with valid JSON format."
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          max_completion_tokens: 1000,
        };

        // Only add temperature for non-GPT-5 models
        if (!"gpt-5-mini".startsWith("gpt-5")) {
          completionParams.temperature = 0.1;
        }

        const completion = await openai.chat.completions.create(completionParams);

        const responseText = completion.choices[0]?.message?.content || "{}";
        if (!responseText || responseText.trim() === "{}") {
          console.error("Empty or invalid AI response for complexity analysis:", {
            choices: completion.choices,
            usage: completion.usage,
            model: completion.model
          });
          throw new Error("No valid response from AI for complexity analysis");
        }

        // Parse the JSON response
        let complexityAnalysis;
        try {
          complexityAnalysis = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse AI response as JSON:", responseText);
          throw new Error("Invalid response format from AI");
        }

        return new Response(
          JSON.stringify({ complexityAnalysis }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
          },
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
