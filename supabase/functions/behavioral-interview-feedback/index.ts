/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error - Deno URL import
import OpenAI from "https://esm.sh/openai@4";

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
const useOpenRouter = !!Deno.env.get("OPENROUTER_API_KEY");
const openrouterModel = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-3-flash-preview";
const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

// Model selection via env var
const configuredModel = (useOpenRouter ? openrouterModel : openaiModel).trim();

// LLM client instance (OpenRouter or OpenAI)
let llmInstance: OpenAI | null = null;

function initializeLLM(): OpenAI {
  if (llmInstance) return llmInstance;

  // Try OpenRouter first
  if (useOpenRouter) {
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (openrouterKey) {
      const siteUrl = Deno.env.get("OPENROUTER_SITE_URL") || "https://simplyalgo.dev";
      const appName = Deno.env.get("OPENROUTER_APP_NAME") || "SimplyAlgo";

      console.log(`[behavioral-interview-feedback] Using OpenRouter: model=${configuredModel}`);

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

  console.log(`[behavioral-interview-feedback] Using OpenAI (fallback): model=${configuredModel}`);
  llmInstance = new OpenAI({ apiKey: openaiKey });
  return llmInstance;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

/**
 * Generate system prompt for behavioral interview feedback
 */
function generateFeedbackPrompt(
  question: string,
  evaluationType: 'star' | 'none' | 'custom' = 'star',
  customEvaluationPrompt?: string,
  story?: any
): string {
  const storyContext = story
    ? `\n\nUSER'S STORY CONTEXT (for reference):
Title: ${story.title}
${story.description ? `Description: ${story.description}` : ''}
${story.situation ? `Situation: ${story.situation}` : ''}
${story.task ? `Task: ${story.task}` : ''}
${story.action ? `Action: ${story.action}` : ''}
${story.result ? `Result: ${story.result}` : ''}
${story.metrics ? `Metrics: ${story.metrics}` : ''}
`
    : "";

  let evaluationCriteria = "";

  if (evaluationType === 'custom' && customEvaluationPrompt) {
    // Use custom evaluation prompt
    evaluationCriteria = `EVALUATION CRITERIA (as specified by the user):
${customEvaluationPrompt}

Please evaluate the answer according to these specific criteria. Provide scores and feedback that align with the custom evaluation framework provided above.

IMPORTANT: Based on the custom criteria, create custom_metrics with metric names as keys and scores (0-100) or descriptive strings as values. For example, if the criteria mentions "Technical Depth" and "Problem-solving Approach", your custom_metrics should include:
{
  "technical_depth": 85,
  "problem_solving_approach": 90,
  ...
}`;
  } else if (evaluationType === 'none') {
    // General feedback only, no structured scoring
    evaluationCriteria = `EVALUATION APPROACH:
Provide general, holistic feedback on the answer. Focus on overall quality, clarity, and effectiveness without using structured scoring frameworks.`;
  } else {
    // Default STAR method
    evaluationCriteria = `EVALUATION CRITERIA:

1. STAR Structure (0-100 each):
   - Situation: Clear context and background provided?
   - Task: Objective clearly stated?
   - Action: Specific actions taken (uses "I" not "we"), shows personal contribution?
   - Result: Measurable outcomes included? Shows learning/impact?

2. Content Quality (0-100):
   - Specificity: Concrete examples vs. vague statements
   - Relevance: Does it answer the question asked?
   - Quantification: Numbers/metrics included?
   - Learning: Shows growth/reflection?

3. Delivery (0-100):
   - Clarity: Easy to understand?
   - Conciseness: Right length (not too long/short)?
   - Confidence: Professional tone?
   - Engagement: Compelling narrative?`;
  }

  const scoringGuidelines = evaluationType === 'none' 
    ? `FEEDBACK APPROACH:
- Provide general, constructive feedback
- Focus on what works well and what could be improved
- Keep feedback actionable and specific`
    : `SCORING GUIDELINES:
- 90-100: Excellent - exceeds expectations
- 80-89: Good - meets expectations with minor improvements
- 70-79: Acceptable - needs improvement in some areas
- 60-69: Below average - significant improvements needed
- Below 60: Poor - major restructuring needed`;

  const feedbackRequirements = `FEEDBACK REQUIREMENTS:
- Provide 2-3 specific strengths
- Provide 2-4 actionable improvements
- Include specific examples of what to improve
- Suggest next steps for practice`;

  let jsonStructure = '';
  
  if (evaluationType === 'none') {
    jsonStructure = `{
  "content_score": <number 0-100>,
  "delivery_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "feedback": {
    "strengths": ["strength 1", "strength 2", ...],
    "improvements": ["improvement 1", "improvement 2", ...],
    "specific_examples": ["example 1", "example 2", ...],
    "next_steps": ["step 1", "step 2", ...]
  }
}`;
  } else if (evaluationType === 'custom') {
    jsonStructure = `{
  "content_score": <number 0-100>,
  "delivery_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "custom_metrics": {
    "<metric_name_1>": <number 0-100 or string>,
    "<metric_name_2>": <number 0-100 or string>,
    ...
  },
  "feedback": {
    "strengths": ["strength 1", "strength 2", ...],
    "improvements": ["improvement 1", "improvement 2", ...],
    "specific_examples": ["example 1", "example 2", ...],
    "next_steps": ["step 1", "step 2", ...]
  }
}`;
  } else {
    // STAR method
    jsonStructure = `{
  "star_score": {
    "situation": <number 0-100>,
    "task": <number 0-100>,
    "action": <number 0-100>,
    "result": <number 0-100>
  },
  "content_score": <number 0-100>,
  "delivery_score": <number 0-100>,
  "overall_score": <number 0-100, weighted average>,
  "feedback": {
    "strengths": ["strength 1", "strength 2", ...],
    "improvements": ["improvement 1", "improvement 2", ...],
    "specific_examples": ["example 1", "example 2", ...],
    "next_steps": ["step 1", "step 2", ...]
  }
}`;
  }

  return `You are an expert behavioral interview coach specializing in technical engineering interviews.

Your task is to evaluate a candidate's answer to a behavioral interview question and provide detailed, actionable feedback.

QUESTION: ${question}
${storyContext}

${evaluationCriteria}

${scoringGuidelines}

${feedbackRequirements}

Return your evaluation as JSON with this exact structure:
${jsonStructure}`;
}

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
    const { question, answer, story, evaluationType, customEvaluationPrompt } = body;

    if (!question || !answer) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: question and answer" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate feedback using LLM
    const systemPrompt = generateFeedbackPrompt(
      question,
      evaluationType || 'star',
      customEvaluationPrompt,
      story
    );

    const completionParams: unknown = {
      model: configuredModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Evaluate this answer:\n\n${answer}`,
        },
      ],
      response_format: { type: "json_object" },
    };

    // Only add temperature for non-GPT-5 models
    if (!configuredModel.startsWith("gpt-5")) {
      completionParams.temperature = 0.3; // Lower temperature for more consistent scoring
    }

    const completion = await llm.chat.completions.create(completionParams);

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    // Parse JSON response
    const feedback = JSON.parse(responseContent);

    // Validate and ensure all required fields
    const evalType = evaluationType || 'star';
    const validatedFeedback: unknown = {
      content_score: Math.max(0, Math.min(100, feedback.content_score || 0)),
      delivery_score: Math.max(0, Math.min(100, feedback.delivery_score || 0)),
      overall_score: Math.max(0, Math.min(100, feedback.overall_score || 0)),
      feedback: {
        strengths: Array.isArray(feedback.feedback?.strengths)
          ? feedback.feedback.strengths
          : [],
        improvements: Array.isArray(feedback.feedback?.improvements)
          ? feedback.feedback.improvements
          : [],
        specific_examples: Array.isArray(feedback.feedback?.specific_examples)
          ? feedback.feedback.specific_examples
          : [],
        next_steps: Array.isArray(feedback.feedback?.next_steps)
          ? feedback.feedback.next_steps
          : [],
      },
    };

    // Include STAR scores only for 'star' evaluation type
    if (evalType === 'star' && feedback.star_score) {
      validatedFeedback.star_score = {
        situation: Math.max(0, Math.min(100, feedback.star_score?.situation || 0)),
        task: Math.max(0, Math.min(100, feedback.star_score?.task || 0)),
        action: Math.max(0, Math.min(100, feedback.star_score?.action || 0)),
        result: Math.max(0, Math.min(100, feedback.star_score?.result || 0)),
      };
    }

    // Include custom metrics only for 'custom' evaluation type
    if (evalType === 'custom' && feedback.custom_metrics) {
      validatedFeedback.custom_metrics = feedback.custom_metrics;
    }

    // Calculate overall score if not provided
    if (!feedback.overall_score) {
      if (evalType === 'none') {
        // Simple average for 'none' type
        validatedFeedback.overall_score = Math.round(
          (validatedFeedback.content_score + validatedFeedback.delivery_score) / 2
        );
      } else if (validatedFeedback.star_score) {
        // Weighted average for STAR method
        const starAvg =
          (validatedFeedback.star_score.situation +
            validatedFeedback.star_score.task +
            validatedFeedback.star_score.action +
            validatedFeedback.star_score.result) /
          4;
        validatedFeedback.overall_score = Math.round(
          starAvg * 0.4 + validatedFeedback.content_score * 0.35 + validatedFeedback.delivery_score * 0.25,
        );
      } else {
        // Fallback: simple average
        validatedFeedback.overall_score = Math.round(
          (validatedFeedback.content_score + validatedFeedback.delivery_score) / 2
        );
      }
    }

    return new Response(JSON.stringify(validatedFeedback), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in behavioral-interview-feedback:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate feedback",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

