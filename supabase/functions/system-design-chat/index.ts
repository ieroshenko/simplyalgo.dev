import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";
import { SystemDesignRequest, SystemDesignResponse, DesignEvaluation } from "./types.ts";

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

// OpenAI client instance
let openaiInstance: OpenAI | null = null;

function initializeOpenAI(): OpenAI {
  if (openaiInstance) return openaiInstance;
  
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  
  openaiInstance = new OpenAI({ apiKey: openaiKey });
  return openaiInstance;
}

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    throw new Error("OpenAI client not initialized");
  }
  return openaiInstance;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

/**
 * Generate system prompt for system design coaching
 */
function generateSystemPrompt(spec: any): string {
  return `You are an expert System Design interviewer and mentor.
Guide the student step-by-step through designing: ${spec.title || 'this system'}

PROBLEM CONTEXT:
- Summary: ${spec.summary || 'N/A'}
- Functional Requirements: ${JSON.stringify(spec.functional_requirements || [])}
- Nonfunctional Requirements: ${JSON.stringify(spec.nonfunctional_requirements || [])}
- Assumptions: ${JSON.stringify(spec.assumptions || [])}
- Scale Estimates: ${JSON.stringify(spec.scale_estimates || {})}
- Rubric Axes: ${JSON.stringify(spec.rubric?.axes || [])}
- Expected Topics: ${JSON.stringify(spec.expected_topics || [])}

SESSION RULES:
1. View user's architecture diagram as JSON (nodes, edges)
2. Ask Socratic, incremental questions
3. Avoid giving full designs - offer hints/trade-offs
4. Reference components by label or type
5. Keep tone professional and inquisitive
6. When evaluating, output structured JSON with score, strengths, weaknesses, suggestions
7. Board Change Reactions: When reacting to board updates, focus on:
   - New components added (ask about their purpose)
   - Connections made (validate data flow)
   - Missing critical components (gently suggest)
   - Architecture patterns (acknowledge good choices)`;
}

/**
 * Convert board state to human-readable description
 */
function describeBoardState(boardState: any): string {
  if (!boardState || !boardState.nodes || boardState.nodes.length === 0) {
    return "The canvas is currently empty - no components have been added yet.";
  }

  const nodes = boardState.nodes || [];
  const edges = boardState.edges || [];

  // Separate text/annotation nodes from component nodes
  const textNodes = nodes.filter((n: any) => n.type === "text");
  const componentNodes = nodes.filter((n: any) => n.type !== "text");

  // Group component nodes by type
  const nodesByType: Record<string, any[]> = {};
  componentNodes.forEach((node: any) => {
    const type = node.type || "unknown";
    if (!nodesByType[type]) {
      nodesByType[type] = [];
    }
    nodesByType[type].push(node);
  });

  // Build description
  let description = `The user has created a diagram with ${nodes.length} component(s) and ${edges.length} connection(s).\n\n`;

  // Describe system components
  if (componentNodes.length > 0) {
    description += "SYSTEM COMPONENTS:\n";
    for (const [type, nodeList] of Object.entries(nodesByType)) {
      description += `- ${type} (${nodeList.length}): `;
      const nodeDescriptions = nodeList.map((n: any) => {
        const label = n.data?.label || "unlabeled";
        const pos = n.position ? `(at x:${Math.round(n.position.x)}, y:${Math.round(n.position.y)})` : "";
        return `${label} ${pos}`;
      });
      description += nodeDescriptions.join(", ") + "\n";
    }
  }

  // Describe standalone text/annotations (notes the user added)
  if (textNodes.length > 0) {
    description += "\nTEXT ANNOTATIONS/NOTES:\n";
    textNodes.forEach((node: any) => {
      const text = node.data?.label || "[empty text]";
      const pos = node.position ? `at position (x:${Math.round(node.position.x)}, y:${Math.round(node.position.y)})` : "";
      description += `- "${text}" ${pos}\n`;
    });
  }

  // Describe connections
  if (edges.length > 0) {
    description += "\nCONNECTIONS:\n";
    edges.forEach((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      const sourceLabel = sourceNode?.data?.label || edge.source;
      const targetLabel = targetNode?.data?.label || edge.target;
      description += `- ${sourceLabel} → ${targetLabel}\n`;
    });
  } else {
    description += "\nCONNECTIONS: None yet - components are not connected.\n";
  }

  return description;
}

/**
 * Start a new design session or resume existing one
 */
async function startDesignSession(
  problemId: string,
  userId: string,
): Promise<SystemDesignResponse> {
  try {
    // Check for existing incomplete session
    const { data: existingSession } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("is_completed", false)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (existingSession && existingSession.context_thread_id) {
      // Resume existing session - don't return a message since frontend loads all messages from DB
      const { data: board } = await supabaseAdmin
        .from("system_design_boards")
        .select("board_state")
        .eq("session_id", existingSession.id)
        .single();

      return {
        sessionId: existingSession.id,
        contextThreadId: existingSession.context_thread_id,
        boardState: board?.board_state,
        // Don't return message - frontend loads all messages from database
      };
    }

    // Fetch problem and system_design_specs
    const { data: problem } = await supabaseAdmin
      .from("problems")
      .select("*, system_design_specs(*)")
      .eq("id", problemId)
      .single();

    if (!problem || !problem.system_design_specs) {
      throw new Error("Problem or system design specs not found");
    }

    const spec = Array.isArray(problem.system_design_specs)
      ? problem.system_design_specs[0]
      : problem.system_design_specs;

    // Create new session
    const sessionId = crypto.randomUUID();
    const { error: sessionError } = await supabaseAdmin
      .from("system_design_sessions")
      .insert({
        id: sessionId,
        user_id: userId,
        problem_id: problemId,
      });

    if (sessionError) throw sessionError;

    // Initialize board
    await supabaseAdmin
      .from("system_design_boards")
      .insert({
        session_id: sessionId,
        board_state: spec.starter_canvas || { nodes: [], edges: [] },
      });

    // Generate initial AI message
    const openai = initializeOpenAI();
    const systemPrompt = generateSystemPrompt(spec);
    
    const initialPrompt = `${systemPrompt}

Generate a welcoming first message that introduces the problem and asks an initial guiding question about the system design. Keep it concise and engaging.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: initialPrompt }],
      max_completion_tokens: 300,
    });

    const firstMessage = response.choices[0]?.message?.content || 
      `Let's design ${problem.title}. What's your entry point for handling incoming traffic?`;

    // Save first message
    await supabaseAdmin
      .from("system_design_responses")
      .insert({
        session_id: sessionId,
        message_role: "assistant",
        content: firstMessage,
      });

    return {
      sessionId,
      message: firstMessage,
    };
  } catch (error) {
    console.error("Error starting design session:", error);
    throw error;
  }
}

/**
 * Update board state
 */
async function updateBoardState(
  sessionId: string,
  boardState: SystemDesignRequest["boardState"],
): Promise<SystemDesignResponse> {
  try {
    const { error } = await supabaseAdmin
      .from("system_design_boards")
      .upsert({
        session_id: sessionId,
        board_state: boardState || { nodes: [], edges: [] },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "session_id",
      });

    if (error) throw error;

    return { sessionId };
  } catch (error) {
    console.error("Error updating board state:", error);
    throw error;
  }
}

/**
 * React to board changes (delayed AI reaction)
 */
async function reactToBoardChanges(
  sessionId: string,
  boardState: SystemDesignRequest["boardState"],
): Promise<SystemDesignResponse> {
  try {
    const { data: session } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*, problems(*, system_design_specs(*))")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    const spec = Array.isArray(session.problems.system_design_specs)
      ? session.problems.system_design_specs[0]
      : session.problems.system_design_specs;

    const openai = initializeOpenAI();
    const systemPrompt = generateSystemPrompt(spec);

    const reactionPrompt = `${systemPrompt}

CURRENT BOARD STATE:
${JSON.stringify(boardState, null, 2)}

Analyze the recent changes to the board and provide a brief, contextual comment or question. Focus on:
- New components added
- Connections made
- Missing critical components
- Architecture patterns

Keep your response concise (1-2 sentences).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: reactionPrompt }],
      max_completion_tokens: 200,
    });

    const reaction = response.choices[0]?.message?.content || "";

    if (reaction) {
      await supabaseAdmin
        .from("system_design_responses")
        .insert({
          session_id: sessionId,
          message_role: "assistant",
          content: reaction,
        });
    }

    return {
      sessionId,
      message: reaction,
    };
  } catch (error) {
    console.error("Error reacting to board changes:", error);
    throw error;
  }
}

/**
 * Handle coach message
 */
async function coachMessage(
  sessionId: string,
  message: string,
): Promise<SystemDesignResponse> {
  try {
    // Save user message
    await supabaseAdmin
      .from("system_design_responses")
      .insert({
        session_id: sessionId,
        message_role: "user",
        content: message,
      });

    // Get session and context
    const { data: session } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*, problems(*, system_design_specs(*))")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    const spec = Array.isArray(session.problems.system_design_specs)
      ? session.problems.system_design_specs[0]
      : session.problems.system_design_specs;

    // Get current board state
    const { data: board } = await supabaseAdmin
      .from("system_design_boards")
      .select("board_state")
      .eq("session_id", sessionId)
      .single();

    const boardState = board?.board_state || { nodes: [], edges: [] };

    // Get chat history
    const { data: messages } = await supabaseAdmin
      .from("system_design_responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    const openai = initializeOpenAI();
    const systemPrompt = generateSystemPrompt(spec);

    // Create board state description
    const boardDescription = describeBoardState(boardState);

    // Enhanced system prompt with board state
    const enhancedSystemPrompt = `${systemPrompt}

CURRENT ARCHITECTURE DIAGRAM:
${boardDescription}

You can see the user's current diagram above. When answering questions, refer to the specific components they've added and guide them based on what's currently on their canvas.`;

    const conversationHistory = (messages || []).slice(-10).map((m: any) => ({
      role: m.message_role,
      content: m.content,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      max_completion_tokens: 500,
    });

    const aiResponse = response.choices[0]?.message?.content || "";

    await supabaseAdmin
      .from("system_design_responses")
      .insert({
        session_id: sessionId,
        message_role: "assistant",
        content: aiResponse,
      });

    return {
      sessionId,
      message: aiResponse,
    };
  } catch (error) {
    console.error("Error handling coach message:", error);
    throw error;
  }
}

/**
 * Evaluate final design
 */
async function evaluateFinalDesign(
  sessionId: string,
  boardState: SystemDesignRequest["boardState"],
): Promise<SystemDesignResponse> {
  try {
    const { data: session } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*, problems(*, system_design_specs(*))")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    const spec = Array.isArray(session.problems.system_design_specs)
      ? session.problems.system_design_specs[0]
      : session.problems.system_design_specs;

    const openai = initializeOpenAI();
    const systemPrompt = generateSystemPrompt(spec);

    const evaluationPrompt = `${systemPrompt}

FINAL BOARD STATE TO EVALUATE:
${JSON.stringify(boardState, null, 2)}

RUBRIC CRITERIA:
${JSON.stringify(spec.rubric, null, 2)}

Evaluate this system design and provide a structured JSON response:
{
  "score": <0-100>,
  "summary": "<brief summary>",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvement_suggestions": ["suggestion1", "suggestion2"]
}

Be thorough but fair. Consider scalability, reliability, availability, and the rubric criteria.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: evaluationPrompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const evaluationText = response.choices[0]?.message?.content || "{}";
    const evaluation: DesignEvaluation = JSON.parse(evaluationText);

    // Update session
    await supabaseAdmin
      .from("system_design_sessions")
      .update({
        is_completed: true,
        score: evaluation.score,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return {
      sessionId,
      evaluation,
    };
  } catch (error) {
    console.error("Error evaluating design:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    initializeOpenAI();
    
    const body: SystemDesignRequest = await req.json();
    const { action } = body;

    let result: SystemDesignResponse;

    switch (action) {
      case "start_design_session":
        if (!body.problemId || !body.userId) {
          throw new Error("Missing problemId or userId");
        }
        result = await startDesignSession(body.problemId, body.userId);
        break;

      case "update_board_state":
        if (!body.sessionId || !body.boardState) {
          throw new Error("Missing sessionId or boardState");
        }
        result = await updateBoardState(body.sessionId, body.boardState);
        break;

      case "react_to_board_changes":
        if (!body.sessionId || !body.boardState) {
          throw new Error("Missing sessionId or boardState");
        }
        result = await reactToBoardChanges(body.sessionId, body.boardState);
        break;

      case "coach_message":
        if (!body.sessionId || !body.message) {
          throw new Error("Missing sessionId or message");
        }
        result = await coachMessage(body.sessionId, body.message);
        break;

      case "evaluate_final_design":
        if (!body.sessionId || !body.boardState) {
          throw new Error("Missing sessionId or boardState");
        }
        result = await evaluateFinalDesign(body.sessionId, body.boardState);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

