// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno URL import
import OpenAI from "https://esm.sh/openai@4";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// LLM Provider Configuration
const useOpenRouter = !!Deno.env.get("OPENROUTER_API_KEY");
const openrouterModel = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-3-flash-preview";
const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

// Model selection via env var
const configuredModel = (useOpenRouter ? openrouterModel : openaiModel).trim();

// Initialize LLM client (OpenRouter or OpenAI)
let llmInstance: OpenAI | null = null;

function initializeLLM(): OpenAI {
  if (llmInstance) return llmInstance;

  // Try OpenRouter first
  if (useOpenRouter) {
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (openrouterKey) {
      const siteUrl = Deno.env.get("OPENROUTER_SITE_URL") || "https://simplyalgo.dev";
      const appName = Deno.env.get("OPENROUTER_APP_NAME") || "SimplyAlgo";

      console.log(`[generate-interview-questions] Using OpenRouter: model=${configuredModel}`);

      llmInstance = new OpenAI({
        apiKey: openrouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": siteUrl,
          "X-Title": appName,
        },
      });
      return llmInstance;
    }
  }

  // Fallback to OpenAI
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error(useOpenRouter
      ? "Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is set"
      : "OPENAI_API_KEY environment variable is not set");
  }

  console.log(`[generate-interview-questions] Using OpenAI (fallback): model=${configuredModel}`);
  llmInstance = new OpenAI({ apiKey: openaiKey });
  return llmInstance;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize LLM client
    const llm = initializeLLM();

    // Parse request body
    const body = await req.json();
    const { resumeText, role, company } = body;

    if (!resumeText || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: resumeText and role" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = `You are an expert behavioral interview coach specializing in technical engineering interviews.

Your task is to generate 4 behavioral interview questions tailored to a candidate's resume, target role, and target company.

RESUME CONTENT:
${resumeText}

TARGET ROLE: ${role}
TARGET COMPANY: ${company || "General tech company"}

Generate exactly 4 behavioral interview questions that:
1. Are relevant to the candidate's experience (based on their resume)
2. Are appropriate for the target role
3. Are typical questions asked by the target company (if specified) or general tech companies
4. Cover different aspects: technical leadership, problem-solving, collaboration, and impact/initiative
5. Are progressively challenging (start with foundational, end with more advanced)
6. Are specific and actionable (not generic)

Return your response as JSON with this exact structure:
{
  "questions": [
    {
      "question_text": "Question 1 text here",
      "category": ["category1", "category2"],
      "difficulty": "beginner|intermediate|advanced",
      "rationale": "Why this question is relevant for this candidate/role/company"
    },
    {
      "question_text": "Question 2 text here",
      "category": ["category1", "category2"],
      "difficulty": "beginner|intermediate|advanced",
      "rationale": "Why this question is relevant for this candidate/role/company"
    },
    {
      "question_text": "Question 3 text here",
      "category": ["category1", "category2"],
      "difficulty": "beginner|intermediate|advanced",
      "rationale": "Why this question is relevant for this candidate/role/company"
    },
    {
      "question_text": "Question 4 text here",
      "category": ["category1", "category2"],
      "difficulty": "beginner|intermediate|advanced",
      "rationale": "Why this question is relevant for this candidate/role/company"
    }
  ]
}

Categories should be from: general, technical_leadership, code_review_collaboration, debugging_problem_solving, system_design_architecture, technical_failure_recovery, technical_debt_prioritization, technical_communication, technical_initiative, learning_new_technologies, code_quality_best_practices, scaling_performance

Make sure the questions are diverse and cover different behavioral aspects relevant to the role.`;

    const completionParams: unknown = {
      model: configuredModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate 4 behavioral interview questions for this candidate.`,
        },
      ],
      response_format: { type: "json_object" },
    };

    // Only add temperature for non-GPT-5 models
    if (!configuredModel.startsWith("gpt-5")) {
      completionParams.temperature = 0.7;
    }

    const completion = await llm.chat.completions.create(completionParams);

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    // Parse JSON response
    const result = JSON.parse(responseContent);

    // Validate structure
    if (!result.questions || !Array.isArray(result.questions) || result.questions.length !== 4) {
      throw new Error("Invalid response format: expected 4 questions");
    }

    // Validate each question
    for (const q of result.questions) {
      if (!q.question_text || !q.category || !q.difficulty) {
        throw new Error("Invalid question format: missing required fields");
      }
      if (!["beginner", "intermediate", "advanced"].includes(q.difficulty)) {
        throw new Error("Invalid difficulty level");
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-interview-questions:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate questions",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

