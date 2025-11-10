// @ts-expect-error - Deno URL import
import OpenAI from "https://esm.sh/openai@4";
import { ResponsesApiRequest, ResponsesApiResponse, SessionContext, ContextualResponse } from "./types.ts";
import { logger } from "./utils/logger.ts";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// Model configuration
export const configuredModel = (Deno.env.get("OPENAI_MODEL") || "gpt-5-mini").trim();
export const modelSource = Deno.env.get("OPENAI_MODEL")
  ? "OPENAI_MODEL env set"
  : "defaulted to gpt-5-mini (no OPENAI_MODEL)";
export const useResponsesApi = /^(gpt-5|o3)/i.test(configuredModel);

// OpenAI client instance
let openaiInstance: OpenAI | null = null;

/**
 * Initialize OpenAI client with API key validation
 */
export function initializeOpenAI(): OpenAI {
  if (openaiInstance) return openaiInstance;
  
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  
  openaiInstance = new OpenAI({ apiKey: openaiKey });
  return openaiInstance;
}

/**
 * Get initialized OpenAI client
 */
export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    throw new Error("OpenAI client not initialized. Call initializeOpenAI() first.");
  }
  return openaiInstance;
}

/**
 * Build request for Responses API
 */
export function buildResponsesRequest(
  model: string,
  prompt: string,
  opts: { maxTokens?: number; responseFormat?: "json_object" | undefined },
): ResponsesApiRequest {
  const req: any = {
    model,
    input: prompt,
    max_output_tokens:
      typeof opts.maxTokens === "number" ? opts.maxTokens : undefined,
  };
  if (/^gpt-5/i.test(model)) {
    req.reasoning = { effort: "minimal" };
    req.text = {
      verbosity: opts.responseFormat ? "low" : "medium",
      ...(opts.responseFormat ? { format: { type: "json_object" } } : {}),
    };
  } else if (/^o3/i.test(model)) {
    req.reasoning = { effort: "medium" };
    // o3 may ignore text.verbosity; omit for safety
  }
  return req;
}

/**
 * Extract text from Responses API response
 */
export function extractResponsesText(response: ResponsesApiResponse): string {
  // 1) Direct output_text
  const direct =
    typeof response?.output_text === "string" ? response.output_text : "";
  if (direct) return direct;
  
  // 2) Traverse output[].content[] for output_text/text
  const output = Array.isArray(response?.output) ? response.output : [];
  let text = "";
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      const type = c?.type;
      const textField = (c as { text?: { value?: string } | string })
        ?.text as unknown;
      const nestedValue =
        textField &&
        typeof textField === "object" &&
        "value" in (textField as Record<string, unknown>)
          ? (textField as { value?: string }).value
          : undefined;
      if (type === "output_text" && typeof nestedValue === "string") {
        text += nestedValue;
      } else if (type === "text") {
        if (typeof textField === "string") text += textField;
        else if (typeof nestedValue === "string") text += nestedValue;
      }
    }
  }
  if (text) return text;
  
  // 3) Fallback to chat-like choices
  const choices = Array.isArray(response?.choices) ? response.choices : [];
  return choices?.[0]?.message?.content || "";
}

/**
 * Unified LLM text caller (supports Responses API for gpt-5/o3 and falls back to Chat Completions)
 */
export async function llmText(
  prompt: string,
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
  },
): Promise<string> {
  const openai = getOpenAI();
  const model = configuredModel;
  
  if (useResponsesApi) {
    // Try configured Responses model first, then gpt-5-mini, then fall back to Chat API
    const responseModels = [model, "gpt-5-mini"].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    for (const respModel of responseModels) {
      try {
        logger.llmCall(respModel, 0, { sessionId: 'unknown', type: 'responses_api' });
        const req = buildResponsesRequest(respModel, prompt, {
          maxTokens: opts.maxTokens,
          responseFormat: opts.responseFormat,
        });
        const response = await openai.responses.create(
          req as unknown as ResponsesApiResponse,
        );
        const finalText = extractResponsesText(response).toString();
        if (finalText.trim().length > 0) {
          return finalText;
        }
        console.warn(
          `[ai-chat] Responses API returned empty text for model=${respModel}; trying next option...`,
        );
        continue;
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        console.warn(
          `[ai-chat] Responses API failed for model=${respModel}. ${err?.name || ""}: ${err?.message || ""}`,
        );
        continue;
      }
    }
    console.warn(
      `[ai-chat] All Responses API attempts failed; falling back to Chat Completions.`,
    );
  }
  
  const chatModel = useResponsesApi ? "gpt-5-mini" : model;
  console.log(
    `[ai-chat] Using Chat Completions API with model=${chatModel} (fallback=${useResponsesApi ? "yes" : "no"})`,
  );
  
  const chatRequestParams: any = {
    model: chatModel,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: opts.maxTokens ?? 500,
    response_format: opts.responseFormat
      ? ({ type: opts.responseFormat } as { type: "json_object" })
      : undefined,
  };
  
  // Only add temperature for non-GPT-5 models
  if (!chatModel.startsWith("gpt-5")) {
    chatRequestParams.temperature = opts.temperature ?? 0.7;
  }
  
  const chat = await openai.chat.completions.create(chatRequestParams as unknown as { choices: Array<{ message?: { content?: string } }> });
  return chat.choices[0]?.message?.content || "";
}

/**
 * LLM JSON caller with response format
 */
export async function llmJson(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number },
): Promise<string> {
  return await llmText(prompt, {
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    responseFormat: "json_object",
  });
}

/**
 * Create initial context with response storage for session continuity
 */
export async function createInitialContext(
  prompt: string,
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
  },
): Promise<{ content: string; responseId: string }> {
  const openai = getOpenAI();
  const model = configuredModel;
  
  if (useResponsesApi) {
    // Try Responses API with store: true for context preservation
    const responseModels = [model, "gpt-5-mini"].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    
    for (const respModel of responseModels) {
      try {
        console.log(`[ai-chat] Creating initial context with model=${respModel}`);
        const req = {
          ...buildResponsesRequest(respModel, prompt, {
            maxTokens: opts.maxTokens,
            responseFormat: opts.responseFormat,
          }),
          store: true, // Enable context storage
        };
        
        const response = await openai.responses.create(
          req as unknown as ResponsesApiResponse,
        );
        
        const content = extractResponsesText(response);
        const responseId = (response as unknown as { id?: string }).id || '';
        
        if (content.trim().length > 0 && responseId) {
          console.log(`[ai-chat] Initial context created with response_id=${responseId}`);
          return { content, responseId };
        }
        
        console.warn(
          `[ai-chat] Initial context creation failed for model=${respModel}; trying next option...`,
        );
        continue;
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        console.warn(
          `[ai-chat] Initial context creation failed for model=${respModel}. ${err?.name || ""}: ${err?.message || ""}`,
        );
        continue;
      }
    }
    
    console.warn(
      `[ai-chat] All initial context attempts failed; falling back to Chat Completions.`,
    );
  }
  
  // Fallback to Chat Completions (no context storage)
  const content = await llmText(prompt, opts);
  return { content, responseId: '' };
}

/**
 * Continue conversation using previous response context
 */
export async function continueWithContext(
  prompt: string,
  previousResponseId: string,
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
  },
): Promise<{ content: string; responseId: string }> {
  const openai = getOpenAI();
  const model = configuredModel;
  
  if (useResponsesApi && previousResponseId) {
    const responseModels = [model, "gpt-5-mini"].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    
    for (const respModel of responseModels) {
      try {
        console.log(`[ai-chat] Continuing with context response_id=${previousResponseId}, model=${respModel}`);
        const req = {
          ...buildResponsesRequest(respModel, prompt, {
            maxTokens: opts.maxTokens,
            responseFormat: opts.responseFormat,
          }),
          previous_response_id: previousResponseId, // Continue from previous context
          store: true, // Continue storing context
        };
        
        const response = await openai.responses.create(
          req as unknown as ResponsesApiResponse,
        );
        
        const content = extractResponsesText(response);
        const responseId = (response as unknown as { id?: string }).id || previousResponseId;
        
        if (content.trim().length > 0) {
          console.log(`[ai-chat] Context continuation successful with response_id=${responseId}`);
          return { content, responseId };
        }
        
        console.warn(
          `[ai-chat] Context continuation failed for model=${respModel}; trying next option...`,
        );
        continue;
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        console.warn(
          `[ai-chat] Context continuation failed for model=${respModel}. ${err?.name || ""}: ${err?.message || ""}`,
        );
        continue;
      }
    }
    
    console.warn(
      `[ai-chat] All context continuation attempts failed; falling back to full context.`,
    );
  }
  
  // Fallback: if no previous context or continuation failed, create new context
  console.log(`[ai-chat] Creating new context due to continuation failure or missing response_id`);
  return await createInitialContext(prompt, opts);
}

/**
 * Smart LLM caller that automatically handles context continuity
 */
export async function llmWithContext(
  prompt: string,
  previousResponseId: string | null,
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
  },
): Promise<{ content: string; responseId: string }> {
  if (previousResponseId && previousResponseId.trim() !== '') {
    // Continue with existing context
    return await continueWithContext(prompt, previousResponseId, opts);
  } else {
    // Create new context
    return await createInitialContext(prompt, opts);
  }
}

// ================== SESSION CONTEXT MANAGEMENT ==================

// In-memory session context cache (for edge function lifetime)
const sessionContextCache = new Map<string, SessionContext>();

/**
 * Create or retrieve session context for coaching/chat sessions
 */
export function getOrCreateSessionContext(
  sessionId: string,
  contextType: 'chat' | 'coaching',
  initialCode: string = '',
  coachingMode?: string,
): SessionContext {
  // Include coaching mode in cache key for chat contexts to prevent mode mixing
  const cacheKey = contextType === 'chat' && coachingMode 
    ? `${sessionId}_${coachingMode}` 
    : sessionId;
  
  const existing = sessionContextCache.get(cacheKey);
  
  if (existing && existing.contextType === contextType) {
    // Update last used timestamp
    existing.lastUsedAt = new Date().toISOString();
    return existing;
  }
  
  // Create new session context
  const context: SessionContext = {
    sessionId,
    responseId: null,
    isInitialized: false,
    contextType,
    lastCodeState: initialCode,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };
  
  sessionContextCache.set(cacheKey, context);
  console.log(`[session-context] Created new context for ${contextType} session: ${cacheKey}`);
  
  return context;
}

/**
 * Update session context with new response ID and code state
 */
export function updateSessionContext(
  sessionId: string,
  responseId: string,
  codeState: string = '',
  coachingMode?: string,
): void {
  // Use same cache key logic as getOrCreateSessionContext
  const cacheKey = coachingMode ? `${sessionId}_${coachingMode}` : sessionId;
  const context = sessionContextCache.get(cacheKey);
  
  if (context) {
    context.responseId = responseId;
    context.isInitialized = true;
    context.lastCodeState = codeState;
    context.lastUsedAt = new Date().toISOString();
    
    console.log(`[session-context] Updated context ${sessionId} with response_id: ${responseId}`);
  } else {
    console.warn(`[session-context] Attempted to update non-existent context: ${sessionId}`);
  }
}

/**
 * Check if code has changed significantly enough to warrant context refresh
 */
export function hasSignificantCodeChange(
  oldCode: string,
  newCode: string,
  threshold: number = 0.3, // 30% change threshold
): boolean {
  if (!oldCode || !newCode) return true;
  
  const oldLines = oldCode.trim().split('\n').filter(line => line.trim() !== '');
  const newLines = newCode.trim().split('\n').filter(line => line.trim() !== '');
  
  // Simple diff based on line count and content
  const lineDiff = Math.abs(oldLines.length - newLines.length);
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  if (maxLines === 0) return false;
  
  // Check if change ratio exceeds threshold
  const changeRatio = lineDiff / maxLines;
  const hasSignificantChange = changeRatio > threshold;
  
  console.log(`[code-diff] Change ratio: ${changeRatio.toFixed(3)}, significant: ${hasSignificantChange}`);
  
  return hasSignificantChange;
}

/**
 * Smart context-aware LLM caller for coaching/chat sessions
 */
export async function llmWithSessionContext(
  sessionId: string,
  prompt: string,
  contextType: 'chat' | 'coaching',
  currentCode: string = '',
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
    forceNewContext?: boolean;
    coachingMode?: string;
  } = {},
): Promise<ContextualResponse> {
  const sessionContext = getOrCreateSessionContext(sessionId, contextType, currentCode, opts.coachingMode);
  
  // Determine if we need a new context
  const needsNewContext = 
    opts.forceNewContext ||
    !sessionContext.isInitialized ||
    !sessionContext.responseId ||
    hasSignificantCodeChange(sessionContext.lastCodeState, currentCode);
  
  let result: { content: string; responseId: string };
  let tokensSaved = 0;
  
  if (needsNewContext) {
    console.log(`[session-context] Creating new context for ${contextType} session: ${sessionId}`);
    result = await createInitialContext(prompt, opts);
    updateSessionContext(sessionId, result.responseId, currentCode, opts.coachingMode);
  } else {
    console.log(`[session-context] Continuing with existing context for ${contextType} session: ${sessionId}`);
    result = await continueWithContext(prompt, sessionContext.responseId!, opts);
    updateSessionContext(sessionId, result.responseId, currentCode, opts.coachingMode);
    
    // Estimate tokens saved (rough calculation)
    tokensSaved = Math.floor(prompt.length * 0.6); // Assuming 60% reduction
  }
  
  return {
    content: result.content,
    responseId: result.responseId,
    isNewContext: needsNewContext,
    tokensSaved,
  };
}

/**
 * Clear session context (useful for manual resets)
 */
export function clearSessionContext(sessionId: string): void {
  const deleted = sessionContextCache.delete(sessionId);
  if (deleted) {
    console.log(`[session-context] Cleared context for session: ${sessionId}`);
  } else {
    console.warn(`[session-context] Attempted to clear non-existent context: ${sessionId}`);
  }
}

/**
 * Get session context info (for debugging)
 */
export function getSessionContextInfo(sessionId: string): SessionContext | null {
  return sessionContextCache.get(sessionId) || null;
}

/**
 * Fast JSON helper: force a lightweight, fast model for tool-style calls
 */
export async function llmJsonFast(
  prompt: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  const openai = getOpenAI();
  
  // Prefer Responses API for gpt-5-mini, fall back to Chat Completions with gpt-5-mini
  try {
    console.log(
      "[ai-chat] llmJsonFast using Responses API with model=gpt-5-mini",
    );
    const req: any = {
      model: "gpt-5-mini",
      input: prompt,
      max_output_tokens:
        typeof opts?.maxTokens === "number" ? opts.maxTokens : 600,
      text: { verbosity: "low", format: { type: "json_object" } },
      reasoning: { effort: "minimal" },
    };
    const response = await openai.responses.create(
      req as unknown as {
        output_text?: string;
        output?: Array<{
          content?: Array<{
            type?: string;
            text?: { value?: string } | string;
          }>;
        }>;
      },
    );
    let text: string =
      (response as unknown as { output_text?: string }).output_text || "";
    const output: Array<{
      content?: Array<{ type?: string; text?: { value?: string } | string }>;
    }> =
      (
        response as unknown as {
          output?: Array<{
            content?: Array<{
              type?: string;
              text?: { value?: string } | string;
            }>;
          }>;
        }
      ).output || [];
    if (!text && Array.isArray(output)) {
      for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const c of content) {
          const type = (c as { type?: string })?.type;
          const textField = (c as { text?: { value?: string } | string })
            ?.text as unknown;
          const nestedValue =
            textField &&
            typeof textField === "object" &&
            "value" in (textField as Record<string, unknown>)
              ? (textField as { value?: string }).value
              : undefined;
          if (type === "output_text" && typeof nestedValue === "string") {
            text += nestedValue;
          } else if (type === "text") {
            if (typeof textField === "string") text += textField;
            else if (typeof nestedValue === "string") text += nestedValue;
          }
        }
      }
    }
    return text;
  } catch (err) {
    console.warn(
      "[ai-chat] llmJsonFast gpt-5-mini Responses failed; falling back to gpt-5-mini Chat. Error:",
      err,
    );
    const chat = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: opts?.maxTokens ?? 600,
      response_format: { type: "json_object" } as { type: "json_object" },
    } as unknown as { choices: Array<{ message?: { content?: string } }> });
    return chat.choices[0]?.message?.content || "";
  }
}
