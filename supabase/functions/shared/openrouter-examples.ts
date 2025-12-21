/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Example: Using OpenRouter with Different Models
 *
 * This file demonstrates how to use different models for different use cases
 * when using OpenRouter in your Supabase Edge Functions.
 */

import OpenAI from "https://esm.sh/openai@4";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

/**
 * Initialize OpenRouter client
 */
function createOpenRouterClient(): OpenAI {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not set");
    }

    return new OpenAI({
        apiKey: apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "https://simplyalgo.dev",
            "X-Title": "SimplyAlgo",
        },
    });
}

/**
 * Example 1: Fast conversational responses (System Design Chat)
 * Use Gemini 2.5 Flash for quick, conversational AI coaching
 */
async function systemDesignCoaching(userMessage: string): Promise<string> {
    const client = createOpenRouterClient();

    const response = await client.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: [
            {
                role: "system",
                content: "You are a system design coach. Keep responses concise and ask probing questions.",
            },
            {
                role: "user",
                content: userMessage,
            },
        ],
        temperature: 0.7,
        max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Example 2: High-quality code generation
 * Use GPT-4o for best code quality
 */
async function generateCode(prompt: string): Promise<string> {
    const client = createOpenRouterClient();

    const response = await client.chat.completions.create({
        model: "openai/gpt-4o",
        messages: [
            {
                role: "system",
                content: "You are an expert programmer. Generate clean, well-documented code.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
        temperature: 0.3, // Lower temperature for more consistent code
        max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Example 3: Detailed feedback and analysis
 * Use Claude 3.5 Sonnet for thoughtful, detailed responses
 */
async function generateDetailedFeedback(
    code: string,
    context: string
): Promise<string> {
    const client = createOpenRouterClient();

    const response = await client.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
            {
                role: "system",
                content: "You are a senior engineer providing detailed code review feedback.",
            },
            {
                role: "user",
                content: `Context: ${context}\n\nCode:\n${code}\n\nProvide detailed feedback.`,
            },
        ],
        temperature: 0.5,
        max_tokens: 3000,
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Example 4: Fast JSON responses
 * Use Gemini 2.5 Flash with JSON mode for structured data
 */
async function extractStructuredData(text: string): Promise<any> {
    const client = createOpenRouterClient();

    const response = await client.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: [
            {
                role: "user",
                content: `Extract key information from this text as JSON: ${text}`,
            },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
}

/**
 * Example 5: Streaming responses
 * Use streaming for real-time chat experiences
 */
async function* streamingChat(
    messages: Array<{ role: string; content: string }>
): AsyncGenerator<string, void, unknown> {
    const client = createOpenRouterClient();

    const stream = await client.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;
        }
    }
}

/**
 * Example 6: Model fallback strategy
 * Try primary model, fallback to secondary if it fails
 */
async function generateWithFallback(prompt: string): Promise<string> {
    const client = createOpenRouterClient();

    const models = [
        "google/gemini-2.5-flash", // Primary: Fast and cheap
        "openai/gpt-5-mini", // Fallback 1: Reliable
        "anthropic/claude-3.5-sonnet", // Fallback 2: High quality
    ];

    for (const model of models) {
        try {
            console.log(`Trying model: ${model}`);

            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 1000,
            });

            const content = response.choices[0]?.message?.content;
            if (content && content.trim().length > 0) {
                console.log(`Success with model: ${model}`);
                return content;
            }
        } catch (error) {
            console.error(`Failed with model ${model}:`, error);
            // Continue to next model
        }
    }

    throw new Error("All models failed");
}

/**
 * Example 7: Dynamic model selection based on use case
 */
async function generateResponse(
    prompt: string,
    useCase: "fast" | "quality" | "balanced"
): Promise<string> {
    const client = createOpenRouterClient();

    // Select model based on use case
    const modelMap = {
        fast: "google/gemini-2.5-flash",
        quality: "openai/gpt-4o",
        balanced: "anthropic/claude-3.5-sonnet",
    };

    const model = modelMap[useCase];

    const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "";
}

/**
 * Example 8: Cost-aware model selection
 * Use cheaper models for simple tasks, expensive ones for complex tasks
 */
async function costAwareGeneration(
    prompt: string,
    complexity: "simple" | "medium" | "complex"
): Promise<string> {
    const client = createOpenRouterClient();

    const modelMap = {
        simple: "google/gemini-2.5-flash", // ~$0.075 per 1M tokens
        medium: "openai/gpt-5-mini", // ~$0.15 per 1M tokens
        complex: "openai/gpt-4o", // ~$2.50 per 1M tokens
    };

    const model = modelMap[complexity];
    console.log(`Using ${model} for ${complexity} task`);

    const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: complexity === "complex" ? 2000 : 1000,
    });

    return response.choices[0]?.message?.content || "";
}

// Export examples for use in Edge Functions
export {
    systemDesignCoaching,
    generateCode,
    generateDetailedFeedback,
    extractStructuredData,
    streamingChat,
    generateWithFallback,
    generateResponse,
    costAwareGeneration,
};
