// @ts-expect-error - Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeOpenAI } from "../ai-chat/openai-utils.ts";
import { logger } from "../ai-chat/utils/logger.ts";
import { maybeGenerateDiagram } from "../ai-chat/diagrams.ts";
import { AIResponse, RequestBody } from "./types.ts";
import { analyzeCodeSnippets, generateConversationResponse, generateVisualizationComponent, insertSnippetSmart } from "../ai-chat/code-analysis.ts";

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
        // Parse request body
        const body: RequestBody = await req.json();

        const {
            sessionId,
            userId,
            action,
            problem,
            code,
            snippet,
            problemDescription,
            cursorPosition,
            message,
            problemId,
            conversationHistory,
            testCases,
            currentCode,
            preferredEngines,
            previousResponseId,
            coachingMode,
        } = body;

        const validatedCoachingMode = (coachingMode === 'socratic' || coachingMode === 'comprehensive') ? coachingMode : 'socratic';

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
            /\b(visualize|diagram|flowchart|mermaid|draw)\b/i.test(message || "");
        const contextHints =
            /\b(linked list|two pointers|tree|graph|dfs|bfs|heap|priority queue|sliding window|dp|dynamic programming)\b/i.test(
                [message || "", ...(conversationHistory || []).slice(-2).map((m) => m.content)].join(
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
    }
    catch (error) {
        console.error("Error in ai-coach-chat function:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});