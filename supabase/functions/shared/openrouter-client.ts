/**
 * OpenRouter client setup and API interaction utilities
 * 
 * OpenRouter provides a unified API to access multiple LLMs including:
 * - Google Gemini 2.5 Flash
 * - GPT-4, GPT-5
 * - Claude, Llama, and many more
 * 
 * Usage:
 * 1. Set OPENROUTER_API_KEY in your environment
 * 2. Set OPENROUTER_MODEL to your desired model (e.g., "google/gemini-2.5-flash")
 * 3. Optionally set OPENROUTER_SITE_URL and OPENROUTER_APP_NAME for better analytics
 */

import OpenAI from "https://esm.sh/openai@4";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// Global OpenRouter client instance
let openrouterClient: OpenAI | null = null;

/**
 * Available OpenRouter models
 * Full list: https://openrouter.ai/models
 */
export const OPENROUTER_MODELS = {
    // Google Gemini
    GEMINI_2_5_FLASH: "google/gemini-2.5-flash",
    GEMINI_2_0_FLASH: "google/gemini-2.0-flash",
    GEMINI_PRO_1_5: "google/gemini-pro-1.5",

    // OpenAI
    GPT_5_MINI: "openai/gpt-5-mini",
    GPT_4O: "openai/gpt-4o",
    GPT_4O_MINI: "openai/gpt-4o-mini",
    O3_MINI: "openai/o3-mini",

    // Anthropic Claude
    CLAUDE_3_5_SONNET: "anthropic/claude-3.5-sonnet",
    CLAUDE_3_OPUS: "anthropic/claude-3-opus",

    // Meta Llama
    LLAMA_3_3_70B: "meta-llama/llama-3.3-70b-instruct",
    LLAMA_3_1_405B: "meta-llama/llama-3.1-405b-instruct",

    // DeepSeek
    DEEPSEEK_CHAT: "deepseek/deepseek-chat",

    // Mistral
    MISTRAL_LARGE: "mistralai/mistral-large",
} as const;

// Model selection via env var; default to Gemini 2.5 Flash if not set
const configuredModel = (
    Deno.env.get("OPENROUTER_MODEL") ||
    OPENROUTER_MODELS.GEMINI_2_5_FLASH
).trim();

const modelSource = Deno.env.get("OPENROUTER_MODEL")
    ? "OPENROUTER_MODEL env set"
    : "defaulted to gemini-2.5-flash (no OPENROUTER_MODEL)";

/**
 * Initialize OpenRouter client with API key validation
 */
export function initializeOpenRouter(): { success: boolean; error?: string } {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
        return {
            success: false,
            error: "OPENROUTER_API_KEY environment variable is not set",
        };
    }

    // Optional: Site URL and App Name for better analytics on OpenRouter
    const siteUrl = Deno.env.get("OPENROUTER_SITE_URL") || "https://simplyalgo.dev";
    const appName = Deno.env.get("OPENROUTER_APP_NAME") || "SimplyAlgo";

    // OpenRouter uses OpenAI-compatible API, so we can use the OpenAI SDK
    openrouterClient = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": siteUrl,
            "X-Title": appName,
        },
    });

    console.log(
        `[openrouter] Initialized: model=${configuredModel} | source=${modelSource} | site=${siteUrl}`
    );

    return { success: true };
}

/**
 * Get the OpenRouter client instance
 */
export function getOpenRouterClient(): OpenAI {
    if (!openrouterClient) {
        throw new Error("OpenRouter client not initialized. Call initializeOpenRouter() first.");
    }
    return openrouterClient;
}

/**
 * Get the configured model name
 */
export function getConfiguredModel(): string {
    return configuredModel;
}

/**
 * Check if a model supports streaming
 */
export function supportsStreaming(model: string): boolean {
    // Most OpenRouter models support streaming
    // Add exceptions here if needed
    return true;
}

/**
 * Get recommended parameters for a specific model
 */
export function getModelParameters(model: string): {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
} {
    // Gemini models
    if (model.includes("gemini")) {
        return {
            temperature: 0.7,
            maxTokens: 8192,
            topP: 0.95,
        };
    }

    // GPT models
    if (model.includes("gpt")) {
        return {
            temperature: 0.7,
            maxTokens: 4096,
        };
    }

    // Claude models
    if (model.includes("claude")) {
        return {
            temperature: 0.7,
            maxTokens: 4096,
        };
    }

    // Default parameters
    return {
        temperature: 0.7,
        maxTokens: 2048,
    };
}

/**
 * Unified LLM text generation
 */
export async function llmText(
    prompt: string,
    opts: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
        systemPrompt?: string;
    } = {}
): Promise<string> {
    const client = getOpenRouterClient();
    const model = opts.model || configuredModel;
    const defaultParams = getModelParameters(model);

    const messages: Array<{ role: string; content: string }> = [];

    if (opts.systemPrompt) {
        messages.push({ role: "system", content: opts.systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: opts.temperature ?? defaultParams.temperature,
        max_tokens: opts.maxTokens ?? defaultParams.maxTokens,
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Unified LLM JSON generation
 */
export async function llmJson(
    prompt: string,
    opts: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
        systemPrompt?: string;
    } = {}
): Promise<string> {
    const client = getOpenRouterClient();
    const model = opts.model || configuredModel;
    const defaultParams = getModelParameters(model);

    const messages: Array<{ role: string; content: string }> = [];

    if (opts.systemPrompt) {
        messages.push({ role: "system", content: opts.systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: opts.temperature ?? defaultParams.temperature,
        max_tokens: opts.maxTokens ?? defaultParams.maxTokens,
        response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Fast JSON helper: force a lightweight, fast model for tool-style calls
 */
export async function llmJsonFast(
    prompt: string,
    opts?: { maxTokens?: number }
): Promise<string> {
    // Use Gemini 2.5 Flash for fast responses
    return await llmJson(prompt, {
        maxTokens: opts?.maxTokens ?? 600,
        model: OPENROUTER_MODELS.GEMINI_2_5_FLASH,
        temperature: 0.3, // Lower temperature for more consistent JSON
    });
}

/**
 * Chat completion with conversation history
 */
export async function llmChat(
    messages: Array<{ role: string; content: string }>,
    opts: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
    } = {}
): Promise<string> {
    const client = getOpenRouterClient();
    const model = opts.model || configuredModel;
    const defaultParams = getModelParameters(model);

    const response = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: opts.temperature ?? defaultParams.temperature,
        max_tokens: opts.maxTokens ?? defaultParams.maxTokens,
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Streaming chat completion
 */
export async function* llmChatStream(
    messages: Array<{ role: string; content: string }>,
    opts: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
    } = {}
): AsyncGenerator<string, void, unknown> {
    const client = getOpenRouterClient();
    const model = opts.model || configuredModel;
    const defaultParams = getModelParameters(model);

    const stream = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: opts.temperature ?? defaultParams.temperature,
        max_tokens: opts.maxTokens ?? defaultParams.maxTokens,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;
        }
    }
}
