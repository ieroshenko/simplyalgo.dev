// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno URL import
import OpenAI from "https://esm.sh/openai@4";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

// Initialize OpenAI client
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
    // Initialize OpenAI
    const openai = initializeOpenAI();

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate 4 behavioral interview questions for this candidate.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
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

