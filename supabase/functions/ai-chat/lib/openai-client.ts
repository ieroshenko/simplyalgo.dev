// OpenAI client setup and API interaction utilities

import OpenAI from "https://esm.sh/openai@4";
import type { ResponsesApiRequest, ResponsesApiResponse } from "./utils/types.ts";

// Ambient declaration for Deno types (for editor/TS tooling)
declare const Deno: { env: { get(name: string): string | undefined } };

// Global OpenAI client instance
let openai: OpenAI;

// Model selection via env var; default to o3-mini if not set
const configuredModel = (Deno.env.get("OPENAI_MODEL") || "o3-mini").trim();
const modelSource = Deno.env.get("OPENAI_MODEL")
  ? "OPENAI_MODEL env set"
  : "defaulted to o3-mini (no OPENAI_MODEL)";
const useResponsesApi = /^(gpt-5|o3)/i.test(configuredModel);

/**
 * Initialize OpenAI client with API key validation
 */
export function initializeOpenAI(): { success: boolean; error?: string } {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return {
      success: false,
      error: "OPENAI_API_KEY environment variable is not set",
    };
  }

  openai = new OpenAI({ apiKey: openaiKey });
  console.log(
    `[ai-chat] Model selection: model=${configuredModel} | api=${
      useResponsesApi ? "Responses" : "Chat"
    } | source=${modelSource}`
  );

  return { success: true };
}

/**
 * Get the OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openai) {
    throw new Error("OpenAI client not initialized. Call initializeOpenAI() first.");
  }
  return openai;
}

// ---- Responses API helpers ----

function buildResponsesRequest(
  model: string,
  prompt: string,
  opts: { maxTokens?: number; responseFormat?: "json_object" | undefined }
): ResponsesApiRequest {
  const req: any = {
    model,
    input: prompt,
    max_output_tokens: typeof opts.maxTokens === "number" ? opts.maxTokens : undefined,
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

function extractResponsesText(response: ResponsesApiResponse): string {
  // 1) Direct output_text
  const direct = typeof response?.output_text === "string" ? response.output_text : "";
  if (direct) return direct;
  
  // 2) Traverse output[].content[] for output_text/text
  const output = Array.isArray(response?.output) ? response.output : [];
  let text = "";
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      const type = c?.type;
      const textField = (c as { text?: { value?: string } | string })?.text as unknown;
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

// Unified LLM callers (supports Responses API for gpt-5/o3 and falls back to Chat Completions)
export async function llmText(
  prompt: string,
  opts: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | undefined;
  }
): Promise<string> {
  const model = configuredModel;
  if (useResponsesApi) {
    // Try configured Responses model first, then o3-mini, then fall back to Chat API
    const responseModels = [model, "o3-mini"].filter((v, i, a) => a.indexOf(v) === i);
    for (const respModel of responseModels) {
      try {
        console.log(`[ai-chat] Using Responses API with model=${respModel}`);
        const req = buildResponsesRequest(respModel, prompt, {
          maxTokens: opts.maxTokens,
          responseFormat: opts.responseFormat,
        });
        const response = await openai.responses.create(req as unknown as ResponsesApiResponse);
        const finalText = extractResponsesText(response).toString();
        if (finalText.trim().length > 0) {
          return finalText;
        }
        console.warn(
          `[ai-chat] Responses API returned empty text for model=${respModel}; trying next option...`
        );
        continue;
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        console.warn(
          `[ai-chat] Responses API failed for model=${respModel}. ${err?.name || ""}: ${
            err?.message || ""
          }`
        );
        continue;
      }
    }
    console.warn(`[ai-chat] All Responses API attempts failed; falling back to Chat Completions.`);
  }
  
  const chatModel = useResponsesApi ? "gpt-5-mini" : model;
  console.log(
    `[ai-chat] Using Chat Completions API with model=${chatModel} (fallback=${
      useResponsesApi ? "yes" : "no"
    })`
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

  const chat = await openai.chat.completions.create(
    chatRequestParams as unknown as { choices: Array<{ message?: { content?: string } }> }
  );
  return chat.choices[0]?.message?.content || "";
}

export async function llmJson(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return await llmText(prompt, {
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    responseFormat: "json_object",
  });
}

/**
 * Fast JSON helper: force a lightweight, fast model for tool-style calls
 */
export async function llmJsonFast(
  prompt: string,
  opts?: { maxTokens?: number }
): Promise<string> {
  // Prefer Responses API for gpt-5-mini, fall back to Chat Completions with gpt-5-mini
  try {
    console.log("[ai-chat] llmJsonFast using Responses API with model=gpt-5-mini");
    const req: any = {
      model: "gpt-5-mini",
      input: prompt,
      max_output_tokens: typeof opts?.maxTokens === "number" ? opts.maxTokens : 600,
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
      }
    );
    let text: string = (response as unknown as { output_text?: string }).output_text || "";
    const output: Array<{
      content?: Array<{ type?: string; text?: { value?: string } | string }>;
    }> = (
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
          const textField = (c as { text?: { value?: string } | string })?.text as unknown;
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
      err
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