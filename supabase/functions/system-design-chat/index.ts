import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";
import { SystemDesignRequest, SystemDesignResponse, DesignEvaluation, CompletenessAnalysis } from "./types.ts";
import type { SystemDesignSpec } from "../../../src/types/index.ts";
import type { SystemDesignBoardState as BoardState } from "../../../src/types/index.ts";

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

// LLM Provider Configuration
// Supports both OpenRouter (preferred) and OpenAI (fallback)
const useOpenRouter = !!Deno.env.get("OPENROUTER_API_KEY");
const openrouterModel = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-2.5-flash";
const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";

export const configuredModel = useOpenRouter ? openrouterModel : openaiModel;
export const modelSource = useOpenRouter
  ? `OpenRouter: ${openrouterModel}`
  : `OpenAI: ${openaiModel}`;

// LLM client instance (OpenRouter or OpenAI)
let llmClient: OpenAI | null = null;

function initializeLLMClient(): OpenAI {
  if (llmClient) return llmClient;

  // Try OpenRouter first
  if (useOpenRouter) {
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (openrouterKey) {
      const siteUrl = Deno.env.get("OPENROUTER_SITE_URL") || "https://simplyalgo.dev";
      const appName = Deno.env.get("OPENROUTER_APP_NAME") || "SimplyAlgo";

      console.log(`[system-design-chat] Using OpenRouter`);
      console.log(`[system-design-chat] Model: ${configuredModel}`);
      console.log(`[system-design-chat] Site: ${siteUrl}`);

      llmClient = new OpenAI({
        apiKey: openrouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": siteUrl,
          "X-Title": appName,
        },
      });
      return llmClient;
    }
  }

  // Fallback to OpenAI
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is set");
  }

  const keyPrefix = openaiKey.substring(0, 15);
  const keyLength = openaiKey.length;
  console.log(`[system-design-chat] Using OpenAI (fallback)`);
  console.log(`[system-design-chat] API Key: ${keyPrefix}... (length: ${keyLength})`);
  console.log(`[system-design-chat] Model: ${configuredModel}`);

  llmClient = new OpenAI({ apiKey: openaiKey });
  return llmClient;
}

function getLLMClient(): OpenAI {
  if (!llmClient) {
    throw new Error("LLM client not initialized");
  }
  return llmClient;
}

// Backward compatibility aliases
const initializeOpenAI = initializeLLMClient;
const getOpenAI = getLLMClient;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

/**
 * Generate system prompt for system design coaching
 */
function generateSystemPrompt(spec: SystemDesignSpec): string {
  return `You are a system design coach. Guide students through designing: ${spec.title || 'this system'}

COACHING APPROACH:
1. Ask questions FIRST to understand their thinking
2. Keep responses concise (1-3 sentences max)
3. Reference specific components they added to the diagram
4. When stuck, give brief targeted hints only
5. Probe their reasoning: "Why X?", "How does Y handle Z?", "What if A fails?"

COACHING GUARDRAILS:
- Do NOT introduce architecture components, technologies, or algorithms unless the student already mentioned them or the requirement absolutely mandates restating them.
- When the student asks for a direction, reflect the question back or offer a high-level tradeoff question instead of prescribing a solution.
- Clarify requirements and constraints using only the facts from the prompt/spec; avoid proposing specific implementations (e.g., exact algorithms, detailed policies).
- Never outline an end-to-end design or roadmap—focus on the next question that moves their thinking forward.

PROBLEM CONTEXT (share only when student asks):
- Summary: ${spec.summary || 'N/A'}
- Key Requirements: ${spec.functional_requirements?.slice(0, 3).join(', ') || 'N/A'}
- Scale: ${JSON.stringify(spec.scale_estimates || {})}
- Must-Have Components: ${spec.rubric?.must_have?.join(', ') || 'N/A'}

QUESTION PATTERNS:
- "What component handles [specific requirement]?"
- "How do [component A] and [component B] communicate?"
- "What happens when [failure scenario]?"
- "Why did you choose [specific design decision]?"
- "How does this scale to [scale requirement]?"

Keep all responses short and question-focused. Guide through discovery, not explanation.`;
}

function resolveFallbackModel(model: string | undefined): string {
  if (!model) return configuredModel;
  const normalized = model.toLowerCase();
  if (normalized.includes("gpt-5") && !normalized.includes("mini")) {
    return "gpt-5-mini";
  }
  if (normalized.includes("gpt-4.1") && !normalized.includes("mini")) {
    return "gpt-4.1-mini";
  }
  return model;
}

/**
 * Convert board state to human-readable description
 */
function describeBoardState(boardState: BoardState): string {
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
 * Analyze completeness of system design based on diagram and chat
 */
function analyzeCompleteness(
  boardState: BoardState,
  chatHistory: Array<{ role: string; content: string }>,
  spec: SystemDesignSpec,
): CompletenessAnalysis {
  const nodes = boardState?.nodes || [];
  const edges = boardState?.edges || [];
  const difficulty = spec.difficulty || "Medium";
  const mustHave = (spec.rubric?.must_have || []).map((m: string) => (m || "").toLowerCase());
  const expectedTopics = (spec.expected_topics || []).map((t: string) => (t || "").toLowerCase());

  // Extract component types and labels from nodes
  const componentTypes = new Set<string>();
  const componentLabels = new Set<string>();
  const textContent: string[] = [];

  nodes.forEach((node: any) => {
    const type = (node.type || "").toLowerCase();
    const label = (node.data?.label || "").toLowerCase();
    const note = (node.data?.note || "").toLowerCase();

    if (type && type !== "text") {
      componentTypes.add(type);
    }
    if (label) {
      componentLabels.add(label);
      textContent.push(label);
    }
    if (note) {
      textContent.push(note);
    }
  });

  // Extract chat content
  const chatContent = chatHistory
    .filter((m) => m.role === "user")
    .map((m) => (m.content || "").toLowerCase())
    .join(" ");

  const allTextContent = [...textContent, chatContent].join(" ");

  // Core components that should exist in most designs
  const coreComponents = ["api", "backend", "database", "db", "cache", "load balancer", "lb"];
  const advancedComponents = ["cdn", "queue", "metrics", "logging", "auth", "storage", "worker", "cron"];

  // Check for must_have components
  const foundMustHave = mustHave.filter((m) => {
    return componentLabels.has(m) ||
      componentTypes.has(m) ||
      Array.from(componentLabels).some((l) => l.includes(m)) ||
      Array.from(componentTypes).some((t) => t.includes(m));
  });

  const missingComponents = mustHave.filter((m) => !foundMustHave.includes(m));

  // Check for expected topics coverage
  const foundTopics = expectedTopics.filter((topic) => {
    return allTextContent.includes(topic) ||
      componentLabels.has(topic) ||
      Array.from(componentLabels).some((l) => l.includes(topic));
  });

  const missingTopics = expectedTopics.filter((t) => !foundTopics.includes(t));

  // Scoring logic
  let componentScore = 0;
  let connectionScore = 0;
  let topicScore = 0;

  // Component Score (0-50 points)
  if (difficulty === "Hard") {
    // Strict: All must_have must be present
    const mustHaveRatio = mustHave.length > 0 ? foundMustHave.length / mustHave.length : 1;
    componentScore = mustHaveRatio * 40;

    // Bonus for advanced components
    const advancedCount = advancedComponents.filter((c) =>
      componentTypes.has(c) || Array.from(componentLabels).some((l) => l.includes(c))
    ).length;
    componentScore += Math.min(advancedCount * 2, 10);
  } else {
    // Moderate: Core components + 60%+ of must_have
    const coreCount = coreComponents.filter((c) =>
      componentTypes.has(c) || Array.from(componentLabels).some((l) => l.includes(c))
    ).length;
    componentScore = (coreCount / coreComponents.length) * 20;

    const mustHaveRatio = mustHave.length > 0 ? foundMustHave.length / mustHave.length : 1;
    componentScore += mustHaveRatio * 20;

    // Bonus for having multiple components
    if (componentTypes.size >= 3) {
      componentScore += 10;
    }
  }

  // Connection Score (0-20 points)
  const connectionRatio = nodes.length > 0 ? edges.length / nodes.length : 0;
  connectionScore = Math.min(connectionRatio * 20, 20);
  if (edges.length >= 3) {
    connectionScore = Math.max(connectionScore, 15);
  }

  // Topic Coverage Score (0-30 points)
  if (difficulty === "Hard") {
    // Strict: All topics must be covered
    const topicRatio = expectedTopics.length > 0 ? foundTopics.length / expectedTopics.length : 1;
    topicScore = topicRatio * 25;

    // Bonus for discussing advanced concepts
    const advancedKeywords = ["scalability", "reliability", "availability", "consistency", "partitioning", "replication"];
    const advancedMentions = advancedKeywords.filter((k) => allTextContent.includes(k)).length;
    topicScore += Math.min(advancedMentions * 1, 5);
  } else {
    // Moderate: Main topics discussed
    const topicRatio = expectedTopics.length > 0 ? foundTopics.length / expectedTopics.length : 1;
    topicScore = topicRatio * 15;

    // Bonus for discussing key concepts
    const keyKeywords = ["scalability", "cache", "database", "api", "load", "balance"];
    const keyMentions = keyKeywords.filter((k) => allTextContent.includes(k)).length;
    topicScore += Math.min(keyMentions * 2, 15);
  }

  const totalConfidence = Math.round(componentScore + connectionScore + topicScore);
  const isComplete = totalConfidence >= 70;

  // Generate reasoning
  let reasoning = "";
  if (isComplete) {
    reasoning = `Design appears comprehensive with ${foundMustHave.length}/${mustHave.length} must-have components and ${foundTopics.length}/${expectedTopics.length} expected topics covered.`;
  } else {
    const issues: string[] = [];
    if (missingComponents.length > 0) {
      issues.push(`Missing components: ${missingComponents.slice(0, 3).join(", ")}`);
    }
    if (missingTopics.length > 0) {
      issues.push(`Missing topics: ${missingTopics.slice(0, 3).join(", ")}`);
    }
    if (edges.length < 2) {
      issues.push("Need more connections between components");
    }
    reasoning = issues.length > 0
      ? `Design needs improvement: ${issues.join("; ")}`
      : `Design is ${totalConfidence}% complete. Continue adding components and discussing architecture.`;
  }

  return {
    isComplete,
    confidence: totalConfidence,
    missingComponents,
    missingTopics,
    reasoning,
  };
}

/**
 * Start a new design session or resume existing one
 */
async function startDesignSession(
  problemId: string,
  userId: string,
): Promise<SystemDesignResponse> {
  try {
    console.log(`[startDesignSession] Entry: problemId=${problemId}, userId=${userId}`);

    // Check for existing incomplete session
    const { data: existingSession, error: existingSessionError } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("is_completed", false)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSessionError) {
      console.error(`[startDesignSession] Error checking for existing session:`, existingSessionError);
      // Continue to create new session even if check fails
    }

    if (existingSession && existingSession.context_thread_id) {
      console.log(`[startDesignSession] Resuming existing session: sessionId=${existingSession.id}`);

      // Check if there are any messages - if not, create a new session instead
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from("system_design_responses")
        .select("id")
        .eq("session_id", existingSession.id)
        .limit(1);

      if (messagesError) {
        console.error(`[startDesignSession] Error checking messages:`, messagesError);
      }

      // If no messages exist, treat this as a new session and generate initial message
      if (!messages || messages.length === 0) {
        console.log(`[startDesignSession] Existing session has no messages, creating new session instead`);
        // Fall through to create new session below
      } else {
        // Resume existing session - don't return a message since frontend loads all messages from DB
        const { data: board } = await supabaseAdmin
          .from("system_design_boards")
          .select("board_state")
          .eq("session_id", existingSession.id)
          .maybeSingle();

        console.log(`[startDesignSession] Resuming session with ${messages.length} existing messages`);
        return {
          sessionId: existingSession.id,
          contextThreadId: existingSession.context_thread_id,
          boardState: board?.board_state || { nodes: [], edges: [] },
          // Don't return message - frontend loads all messages from database
        };
      }
    }

    console.log(`[startDesignSession] Creating new session`);

    // Fetch problem and system_design_specs
    const { data: problem, error: problemError } = await supabaseAdmin
      .from("problems")
      .select("*, system_design_specs(*)")
      .eq("id", problemId)
      .maybeSingle();

    if (problemError) {
      console.error(`[startDesignSession] Error fetching problem:`, problemError);
      throw problemError;
    }

    if (!problem || !problem.system_design_specs) {
      console.error(`[startDesignSession] Problem or system design specs not found: problemId=${problemId}`);
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

Generate a welcoming first message that:
1. Welcomes the user to the system design session
2. Introduces the problem: ${spec.title}
3. Provides a brief summary: ${spec.summary || 'N/A'}
4. Asks if the user understands the problem and its requirements
5. Asks if the user has any clarifying questions about the problem statement, constraints, or scale estimates
6. Invites them to ask questions or confirm readiness
7. Keeps the summary to one sentence and avoids mentioning specific solutions, algorithms, or architectural choices

Keep it warm, professional, and engaging. Format it clearly with the two questions. Do NOT start asking technical design questions yet - wait for the user to confirm understanding or ask clarifying questions first.`;

    const completionParams: any = {
      model: configuredModel,
      messages: [{ role: "user", content: initialPrompt }],
      max_completion_tokens: 800, // Increased from 400 to handle longer welcome messages
    };

    // Only add temperature for non-GPT-5 models
    if (!configuredModel.startsWith("gpt-5")) {
      completionParams.temperature = 0.7;
    }

    console.log(`[startDesignSession] Generating initial message: model=${configuredModel}, promptLength=${initialPrompt.length}, maxTokens=${completionParams.max_completion_tokens}`);

    let response = await openai.chat.completions.create(completionParams);

    console.log(`[startDesignSession] OpenAI completion result:`, {
      choices: response.choices?.length || 0,
      contentLength: response.choices[0]?.message?.content?.length || 0,
      finishReason: response.choices[0]?.finish_reason,
      usage: response.usage,
      model: response.model,
    });

    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const finishReason = response.choices[0]?.finish_reason;
    console.log(`[startDesignSession] Initial message generated: promptTokens=${promptTokens}, completionTokens=${completionTokens}, finishReason=${finishReason}`);

    const firstMessage = response.choices[0]?.message?.content ||
      `Welcome to our system design session! Today, we'll be tackling the challenge of designing ${problem.title}.

${spec.summary || 'Let\'s work through this system design problem together.'}

Before we dive into the technical design, I'd like to make sure we're on the same page:
- Do you understand the problem and its requirements?
- Do you have any clarifying questions about the problem statement, constraints, or scale estimates?

Feel free to ask any questions, or let me know when you're ready to start designing!`;

    // Save first message
    const { error: saveMessageError } = await supabaseAdmin
      .from("system_design_responses")
      .insert({
        session_id: sessionId,
        message_role: "assistant",
        content: firstMessage,
      });

    if (saveMessageError) {
      console.error(`[startDesignSession] Error saving initial message:`, saveMessageError);
      throw saveMessageError;
    }

    console.log(`[startDesignSession] Initial message saved successfully, returning response with message length=${firstMessage.length}`);

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
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*, problems(*, system_design_specs(*))")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error(`[reactToBoardChanges] Error fetching session:`, sessionError);
      throw sessionError;
    }

    if (!session) {
      console.error(`[reactToBoardChanges] Session not found: sessionId=${sessionId}`);
      throw new Error("Session not found");
    }

    const spec = Array.isArray(session.problems.system_design_specs)
      ? session.problems.system_design_specs[0]
      : session.problems.system_design_specs;

    // Check if user has confirmed readiness to start designing
    const { data: messages } = await supabaseAdmin
      .from("system_design_responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    const hasConfirmedReadiness = (messages || []).some((m: any) =>
      m.message_role === "user" && /^(yes|yep|yeah|understood|ready|let'?s start|proceed|go ahead|sure|ok|okay|i understand|got it|sounds good|let'?s go|let'?s begin)/i.test(m.content.toLowerCase().trim())
    );

    // Don't auto-react if user hasn't confirmed readiness yet
    if (!hasConfirmedReadiness) {
      console.log("[reactToBoardChanges] User hasn't confirmed readiness yet, skipping auto-reaction");
      return { sessionId };
    }

    const openai = initializeOpenAI();
    const systemPrompt = generateSystemPrompt(spec);

    const boardDescription = describeBoardState(boardState as BoardState);

    const reactionPrompt = `${systemPrompt}

CURRENT BOARD STATE:
${boardDescription}

The student just made changes to their diagram. Comment briefly on what they added and ask ONE short question about it. Examples:
- "I see you added [component]. Why there?"
- "You connected [A] to [B]. How do they communicate?"
- "Good start. What handles [missing concern]?"

Keep it conversational and brief—1-2 sentences max.`;

    const completionParams: any = {
      model: configuredModel,
      messages: [{ role: "user", content: reactionPrompt }],
      max_completion_tokens: 200,
    };

    // Only add temperature for non-GPT-5 models
    if (!configuredModel.startsWith("gpt-5")) {
      completionParams.temperature = 0.7;
    }

    let response = await openai.chat.completions.create(completionParams);

    console.log(`[reactToBoardChanges] OpenAI completion result:`, {
      choices: response.choices?.length || 0,
      contentLength: response.choices[0]?.message?.content?.length || 0,
      finishReason: response.choices[0]?.finish_reason,
      usage: response.usage,
      model: response.model,
    });

    const reaction = response.choices[0]?.message?.content || "";
    const finishReason = response.choices[0]?.finish_reason;

    if (finishReason === "length") {
      console.warn(`[reactToBoardChanges] Response was truncated due to max_tokens limit.`);
    }

    if (!reaction || reaction.trim().length === 0) {
      console.warn(`[reactToBoardChanges] Empty reaction received (finish_reason: ${finishReason}), skipping`);
    }

    // Reuse messages already fetched above for completeness analysis
    const conversationHistory = (messages || []).slice(-10).map((m: any) => ({
      role: m.message_role,
      content: m.content,
    }));

    // Analyze completeness
    const completeness = analyzeCompleteness(
      boardState as BoardState,
      conversationHistory,
      spec,
    );

    // Append completeness suggestion if design becomes complete
    let finalReaction = reaction;
    if (completeness.isComplete && completeness.confidence >= 70) {
      finalReaction = reaction
        ? `${reaction}\n\n💡 I notice your design is looking more complete. Consider evaluating when ready!`
        : "💡 I notice your design is looking more complete. Consider evaluating when ready!";
    }

    if (finalReaction) {
      await supabaseAdmin
        .from("system_design_responses")
        .insert({
          session_id: sessionId,
          message_role: "assistant",
          content: finalReaction,
        });
    }

    return {
      sessionId,
      message: finalReaction,
      completeness,
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
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    console.log(`[coachMessage] Entry: sessionId=${sessionId}, messageLength=${message.length}, messagePreview="${message.substring(0, 100)}", timestamp=${timestamp}`);

    // Save user message
    const { error: insertError } = await supabaseAdmin
      .from("system_design_responses")
      .insert({
        session_id: sessionId,
        message_role: "user",
        content: message,
      });

    if (insertError) {
      console.error(`[coachMessage] Error saving user message:`, insertError);
      throw insertError;
    }
    console.log(`[coachMessage] User message saved successfully`);

    // Get session and context
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*, problems(*, system_design_specs(*))")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error(`[coachMessage] Error fetching session:`, sessionError);
      throw sessionError;
    }

    if (!session) {
      console.error(`[coachMessage] Session not found: sessionId=${sessionId}`);
      throw new Error("Session not found");
    }

    console.log(`[coachMessage] Session fetched: sessionId=${sessionId}, problemId=${session.problem_id}, userId=${session.user_id}`);

    const spec = Array.isArray(session.problems.system_design_specs)
      ? session.problems.system_design_specs[0]
      : session.problems.system_design_specs;

    console.log(`[coachMessage] Spec loaded: title="${spec?.title || 'N/A'}", hasFunctionalReqs=${!!spec?.functional_requirements?.length}`);

    // Get current board state
    const { data: board, error: boardError } = await supabaseAdmin
      .from("system_design_boards")
      .select("board_state")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (boardError) {
      console.error(`[coachMessage] Error fetching board state:`, boardError);
      throw boardError;
    }

    const boardState = board?.board_state || { nodes: [], edges: [] };
    const nodeCount = boardState?.nodes?.length || 0;
    const edgeCount = boardState?.edges?.length || 0;
    console.log(`[coachMessage] Board state fetched: nodes=${nodeCount}, edges=${edgeCount}`);

    // Get chat history
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("system_design_responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error(`[coachMessage] Error fetching chat history:`, messagesError);
      throw messagesError;
    }

    const totalMessages = messages?.length || 0;
    const userMessages = (messages || []).filter((m: any) => m.message_role === "user").length;
    const assistantMessages = (messages || []).filter((m: any) => m.message_role === "assistant").length;
    console.log(`[coachMessage] Chat history fetched: total=${totalMessages}, user=${userMessages}, assistant=${assistantMessages}`);

    const openai = initializeOpenAI();
    const systemPrompt = generateSystemPrompt(spec);

    // Detect user intent
    const userMessageLower = message.toLowerCase().trim();
    const isConfirmation = /^(yes|yep|yeah|understood|ready|let'?s start|proceed|go ahead|sure|ok|okay|i understand|got it|sounds good|let'?s go|let'?s begin)/i.test(userMessageLower);
    const isQuestion = message.includes('?') ||
      /\b(what|how|why|when|where|can you|could you|explain|clarify|tell me about|what about|i want to know)\b/i.test(userMessageLower);

    // Check if user has ever confirmed readiness to start designing
    // Initial phase continues until user explicitly says they're ready
    const hasConfirmedReadiness = (messages || []).some((m: any) =>
      m.message_role === "user" && /^(yes|yep|yeah|understood|ready|let'?s start|proceed|go ahead|sure|ok|okay|i understand|got it|sounds good|let'?s go|let'?s begin)/i.test(m.content.toLowerCase().trim())
    );
    const isInitialPhase = !hasConfirmedReadiness;

    const assistantMessageCount = (messages || []).filter((m: any) => m.message_role === "assistant").length;
    console.log(`[coachMessage] Intent detection: isInitialPhase=${isInitialPhase}, hasConfirmedReadiness=${hasConfirmedReadiness}, assistantMessageCount=${assistantMessageCount}, isConfirmation=${isConfirmation}, isQuestion=${isQuestion}`);

    // Create board state description
    const boardDescription = describeBoardState(boardState);

    let enhancedSystemPrompt = systemPrompt;
    let conversationHistory = (messages || []).slice(-10).map((m: any) => ({
      role: m.message_role,
      content: m.content,
    }));

    // Handle initial phase responses
    if (isInitialPhase) {
      if (isConfirmation && isQuestion) {
        // User confirms understanding AND asks one last question - answer then transition to Socratic mode
        enhancedSystemPrompt = `You are a system design coach. The student confirmed they're ready to start but asked one last clarifying question.

PROBLEM CONTEXT (use only to answer their specific question):
- Summary: ${spec.summary || 'N/A'}
- Functional Requirements: ${JSON.stringify(spec.functional_requirements || [])}
- Nonfunctional Requirements: ${JSON.stringify(spec.nonfunctional_requirements || [])}
- Assumptions: ${JSON.stringify(spec.assumptions || [])}
- Scale Estimates: ${JSON.stringify(spec.scale_estimates || {})}
- Constraints: ${JSON.stringify(spec.constraints || [])}

INSTRUCTIONS:
1. Answer their question briefly (1 sentence)
2. Then ask ONE simple guiding question to start the design
3. Keep total response to 2 sentences max

Example:
User: "Ready! Just to confirm - is this server-side?"
You: "Server-side. What component handles incoming requests?"

${systemPrompt}

CURRENT BOARD STATE:
${boardDescription}

Answer their question and guide them to start designing.`;
      } else if (isConfirmation && !isQuestion) {
        // User confirms understanding, transition to design phase
        enhancedSystemPrompt = `${systemPrompt}

The user has confirmed they understand the problem and are ready to start designing. Transition to technical coaching mode and ask the first guiding question about the system design. For example: "Great! Let's begin. What's your entry point for handling incoming traffic?" or similar question based on the problem context.

CURRENT ARCHITECTURE DIAGRAM:
${boardDescription}

The canvas is likely empty or just starting. Guide them to think about the core components and architecture.`;
      } else if (isQuestion) {
        // User asks clarifying questions during initial phase - just answer, no Socratic coaching yet
        enhancedSystemPrompt = `You are answering clarifying questions about a system design problem. The student is trying to understand the requirements before starting the design.

PROBLEM CONTEXT (use only to answer their specific question):
- Summary: ${spec.summary || 'N/A'}
- Functional Requirements: ${JSON.stringify(spec.functional_requirements || [])}
- Nonfunctional Requirements: ${JSON.stringify(spec.nonfunctional_requirements || [])}
- Assumptions: ${JSON.stringify(spec.assumptions || [])}
- Scale Estimates: ${JSON.stringify(spec.scale_estimates || {})}
- Constraints: ${JSON.stringify(spec.constraints || [])}

CRITICAL INSTRUCTIONS:
1. Answer ONLY the specific question asked
2. Keep answer to 1-2 sentences maximum
3. Do NOT add technical details they didn't ask for
4. Do NOT ask any follow-up questions
5. Do NOT suggest implementation approaches
6. Do NOT be Socratic or coaching - just factual answers

Examples:
User: "Is this server-side or client-side?"
You: "Server-side."

User: "Do we need to inform throttled users?"
You: "Yes."

User: "What's the expected request volume?"
You: "10,000 requests per second."

Answer the user's question now, following these rules strictly.`;
      } else {
        // Unclear response, ask for clarification
        enhancedSystemPrompt = `${systemPrompt}

The user's response is unclear. Gently ask if they understand the problem and if they have any clarifying questions, or if they're ready to start designing.`;
      }
    } else {
      // Normal coaching phase - conversational Socratic dialogue
      enhancedSystemPrompt = `${systemPrompt}

CURRENT ARCHITECTURE DIAGRAM:
${boardDescription}

COACHING STYLE:
- Have a natural conversation with the student
- When they explain something, comment on it (e.g., "Good thinking" or "That could work, but...")
- Answer their questions directly and factually
- Ask probing questions to test their understanding
- Point out gaps or concerns you notice
- React to what they're building on the canvas
- Don't give hints disguised as questions - either ask a real question or make a comment

Example dialogue:
Student: "I added a cache to reduce database load"
You: "Good idea. Why Redis over Memcached?"

Student: "Because Redis supports more data structures"
You: "True. How will you handle cache invalidation when data changes?"

Student: "What happens if the cache goes down?"
You: "Traffic hits the database directly. How will you prevent it from being overwhelmed?"`;
    }

    const completionParams: any = {
      model: configuredModel,
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      max_completion_tokens: 5000, // Increased from 500 to handle longer responses and GPT-5 reasoning tokens
    };

    // Only add temperature for non-GPT-5 models
    if (!configuredModel.startsWith("gpt-5")) {
      completionParams.temperature = 0.7;
    }

    const systemPromptLength = enhancedSystemPrompt.length;
    const conversationHistoryLength = conversationHistory.length;
    const totalMessagesCount = completionParams.messages.length;

    console.log(`[coachMessage] Before OpenAI call: model=${configuredModel}, systemPromptLength=${systemPromptLength}, conversationHistoryLength=${conversationHistoryLength}, totalMessages=${totalMessagesCount}, maxTokens=${completionParams.max_completion_tokens}, hasTemperature=${!!completionParams.temperature}`);

    let response = await openai.chat.completions.create(completionParams);

    // Log full response details for debugging
    console.log(`[coachMessage] OpenAI completion result:`, {
      choices: response.choices?.length || 0,
      contentLength: response.choices[0]?.message?.content?.length || 0,
      finishReason: response.choices[0]?.finish_reason,
      usage: response.usage,
      model: response.model,
      id: response.id,
    });

    let aiResponse = response.choices[0]?.message?.content || "";
    let finishReason = response.choices[0]?.finish_reason;
    const responseLength = aiResponse.length;
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;

    console.log(`[coachMessage] After OpenAI call: responseLength=${responseLength}, promptTokens=${promptTokens}, completionTokens=${completionTokens}, totalTokens=${totalTokens}, finishReason=${finishReason}, responsePreview="${aiResponse.substring(0, 100)}"`);

    // Check finish reason - if it's "length", the response was truncated
    if (finishReason === "length") {
      console.warn(`[coachMessage] Response was truncated due to max_tokens limit. Consider increasing max_completion_tokens.`);
    }

    if ((!aiResponse || aiResponse.trim().length === 0) && finishReason === "length") {
      console.warn(`[coachMessage] Empty AI response due to finish_reason=length. Retrying with fallback model.`);
      const fallbackParams: any = {
        ...completionParams,
        model: resolveFallbackModel(completionParams.model || configuredModel),
        max_completion_tokens: Math.max(
          400,
          Math.floor((completionParams.max_completion_tokens || 1000) * 0.8),
        ),
      };
      if (configuredModel.startsWith("gpt-5")) {
        fallbackParams.reasoning = { effort: "medium" };
      }

      console.log(`[coachMessage] Fallback completion params: model=${fallbackParams.model}, maxTokens=${fallbackParams.max_completion_tokens}`);
      response = await openai.chat.completions.create(fallbackParams);
      console.log(`[coachMessage] Fallback OpenAI completion result:`, {
        choices: response.choices?.length || 0,
        contentLength: response.choices[0]?.message?.content?.length || 0,
        finishReason: response.choices[0]?.finish_reason,
        usage: response.usage,
        model: response.model,
        id: response.id,
      });
      aiResponse = response.choices[0]?.message?.content || "";
      finishReason = response.choices[0]?.finish_reason;
    }

    // Validate response
    if (!aiResponse || aiResponse.trim().length === 0) {
      const fallbackMessage =
        "I'm hitting a token limit on that request. Could you restate the key point or tackle one requirement at a time?";
      console.error(`[coachMessage] Empty AI response even after fallback! Using safe fallback message. Response object:`, JSON.stringify({
        choices: response.choices,
        finishReason: finishReason,
        usage: response.usage,
        model: response.model,
      }, null, 2));
      aiResponse = fallbackMessage;
    }

    // Analyze completeness (only after initial phase)
    let completeness;
    let finalResponse = aiResponse;

    if (!isInitialPhase) {
      completeness = analyzeCompleteness(
        boardState as BoardState,
        conversationHistory,
        spec,
      );

      // Append completeness suggestion to AI response if design is complete
      if (completeness.isComplete && completeness.confidence >= 70) {
        finalResponse = `${aiResponse}\n\n💡 **Your design looks comprehensive!** You might be ready to evaluate. Would you like to proceed?`;
      }
    } else {
      // Don't analyze completeness during initial phase
      completeness = {
        isComplete: false,
        confidence: 0,
        missingComponents: [],
        missingTopics: [],
        reasoning: "Initial clarification phase",
      };
    }

    console.log(`[coachMessage] Before saving assistant response: responseLength=${finalResponse.length}, completeness=${completeness?.isComplete ? 'complete' : 'incomplete'}, confidence=${completeness?.confidence || 0}`);

    const { error: saveError } = await supabaseAdmin
      .from("system_design_responses")
      .insert({
        session_id: sessionId,
        message_role: "assistant",
        content: finalResponse,
      });

    if (saveError) {
      console.error(`[coachMessage] Error saving assistant response:`, saveError);
      throw saveError;
    }

    console.log(`[coachMessage] Assistant response saved successfully`);

    // Ensure message is always present
    if (!finalResponse || finalResponse.trim().length === 0) {
      console.error(`[coachMessage] CRITICAL: finalResponse is empty before returning!`);
      finalResponse = "I apologize, but I didn't receive a proper response. Could you please rephrase your question?";
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`[coachMessage] Returning result: sessionId=${sessionId}, messageLength=${finalResponse.length}, elapsedTime=${elapsedTime}ms, hasCompleteness=${!!completeness}`);

    const result: SystemDesignResponse = {
      sessionId,
      message: finalResponse,
      completeness,
    };

    console.log(`[coachMessage] Result object keys: ${Object.keys(result).join(', ')}, message present: ${!!result.message}`);

    return result;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[coachMessage] Error handling coach message (elapsedTime=${elapsedTime}ms):`, {
      error: error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
      cause: (error as Error).cause,
      sessionId: sessionId,
    });
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
    console.log(`[evaluateFinalDesign] Entry: sessionId=${sessionId}`);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("system_design_sessions")
      .select("*, problems(*, system_design_specs(*))")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error(`[evaluateFinalDesign] Error fetching session:`, sessionError);
      throw sessionError;
    }

    if (!session) {
      console.error(`[evaluateFinalDesign] Session not found: sessionId=${sessionId}`);
      throw new Error("Session not found");
    }

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

    const completionParams: any = {
      model: configuredModel,
      messages: [{ role: "user", content: evaluationPrompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    };

    // Only add temperature for non-GPT-5 models
    if (!configuredModel.startsWith("gpt-5")) {
      completionParams.temperature = 0.7;
    }

    const response = await openai.chat.completions.create(completionParams);

    console.log(`[evaluateFinalDesign] OpenAI completion result:`, {
      choices: response.choices?.length || 0,
      contentLength: response.choices[0]?.message?.content?.length || 0,
      finishReason: response.choices[0]?.finish_reason,
      usage: response.usage,
      model: response.model,
    });

    const evaluationText = response.choices[0]?.message?.content || "{}";
    const finishReason = response.choices[0]?.finish_reason;

    if (finishReason === "length") {
      console.warn(`[evaluateFinalDesign] Response was truncated due to max_tokens limit. Consider increasing max_completion_tokens.`);
    }

    if (!evaluationText || evaluationText.trim() === "{}") {
      console.error(`[evaluateFinalDesign] Empty or invalid evaluation received (finish_reason: ${finishReason})`);
      throw new Error(`Failed to generate evaluation (finish_reason: ${finishReason}). Please try again.`);
    }

    const evaluation: DesignEvaluation = JSON.parse(evaluationText);

    // Generate detailed feedback text for submissions
    const feedbackText = `## Overall Score: ${evaluation.score}/100

${evaluation.summary || "No summary available."}

### Strengths
${evaluation.strengths?.map((s: string) => `- ${s}`).join("\n") || "No strengths identified."}

### Areas for Improvement
${evaluation.weaknesses?.map((w: string) => `- ${w}`).join("\n") || "No weaknesses identified."}

### Suggestions
${evaluation.improvement_suggestions?.map((s: string) => `- ${s}`).join("\n") || "No suggestions provided."}`;

    // Update session with evaluation feedback
    await supabaseAdmin
      .from("system_design_sessions")
      .update({
        is_completed: true,
        score: evaluation.score,
        evaluation_feedback: feedbackText,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    const userId = session.user_id;
    const problemId = session.problem_id;

    const nodes = (boardState?.nodes || []) as any[];
    const labels = new Set(
      nodes
        .map((n) => (typeof n?.data?.label === "string" ? n.data.label.toLowerCase() : ""))
        .filter(Boolean)
    );
    const mustHave = (spec.rubric?.must_have || []).map((m: string) => (m || "").toLowerCase());
    const meetsMustHave = mustHave.every((m) => labels.has(m) || Array.from(labels).some((l) => l.includes(m)));
    const meetsScore = typeof evaluation.score === "number" && evaluation.score >= 75;

    if (userId && problemId && meetsScore && meetsMustHave) {
      const { data: existing } = await supabaseAdmin
        .from("user_problem_attempts")
        .select("id")
        .eq("user_id", userId)
        .eq("problem_id", problemId)
        .eq("status", "passed")
        .limit(1)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin
          .from("user_problem_attempts")
          .insert({
            user_id: userId,
            problem_id: problemId,
            code: JSON.stringify(boardState || {}),
            status: "passed",
            test_results: evaluation as unknown as Record<string, unknown>,
          });
      }
    }

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

    console.log(`[system-design-chat] Received request: action=${action}, timestamp=${new Date().toISOString()}`);

    if (action === "coach_message") {
      console.log(`[system-design-chat] coach_message request: sessionId=${body.sessionId}, messageLength=${body.message?.length || 0}, messagePreview=${body.message?.substring(0, 100) || 'N/A'}`);
    }

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

    console.log(`[system-design-chat] Request completed successfully: action=${action}, resultKeys=${Object.keys(result || {}).join(',')}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[system-design-chat] Edge function error:", {
      error: error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
      cause: (error as Error).cause,
    });
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
