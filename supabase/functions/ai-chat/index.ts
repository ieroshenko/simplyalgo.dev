import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import modular components
import { 
  RequestBody, 
  AIResponse, 
  CodeSnippet,
  ChatMessage 
} from "./types.ts";
import { 
  initializeOpenAI, 
  configuredModel, 
  modelSource, 
  useResponsesApi 
} from "./openai-utils.ts";
import { 
  startInteractiveCoaching, 
  validateCoachingSubmission 
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
      console.error("Failed to initialize OpenAI:", error);
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
      console.log("🎯 [COACHING] Generate session request:", { problemId, userId, hasCurrentCode: !!currentCode, difficulty });
      
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
        console.log("🎯 [COACHING] Starting interactive coaching session...");
        const coachingSession = await startInteractiveCoaching(
          problemId,
          userId,
          currentCode || "",
          problemDescription || "",
          difficulty || "beginner"
        );
        console.log("🎯 [COACHING] Interactive session started:", coachingSession);
        
        return new Response(JSON.stringify(coachingSession), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("🚨 [COACHING] Error generating coaching session:", error);
        console.error("🚨 [COACHING] Error stack:", (error as Error)?.stack);
        console.error("🚨 [COACHING] Error details:", {
          name: (error as Error)?.name,
          message: (error as Error)?.message,
          cause: (error as unknown as { cause?: unknown })?.cause
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
      console.log("🎯 [COACHING] Validate submission request");
      
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

      try {
        const result = await insertSnippetSmart(code, snippet, cursorPosition);
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
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
