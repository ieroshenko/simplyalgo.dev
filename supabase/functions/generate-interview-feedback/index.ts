import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPEN_AI_API_KEY");

    console.log("[Feedback] Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasOpenAIKey: !!openaiKey
    });

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Feedback] Generating feedback for session: ${sessionId}`);

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from("behavioral_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    // Fetch transcripts
    const { data: transcripts, error: transcriptError } = await supabase
      .from("behavioral_interview_transcripts")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    console.log("[Feedback] Transcripts fetched:", {
      count: transcripts?.length || 0,
      error: transcriptError
    });

    if (transcriptError) {
      console.error("[Feedback] Transcript fetch error:", transcriptError);
      throw transcriptError;
    }

    if (!transcripts || transcripts.length === 0) {
      throw new Error("No transcripts found for this session");
    }

    // Build conversation for analysis
    const conversation = transcripts
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n\n");

    // Generate feedback using OpenAI
    const prompt = `You are an expert interview coach analyzing a behavioral interview session for a Software Engineering position.

CANDIDATE'S RESUME:
${session.resume_text}

INTERVIEW TRANSCRIPT:
${conversation}

Please analyze this interview and provide structured feedback in the following JSON format:

{
  "overall_score": <number 0-100>,
  "communication_score": <number 0-100>,
  "technical_competence_score": <number 0-100>,
  "problem_solving_score": <number 0-100>,
  "teamwork_score": <number 0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_for_improvement": ["area 1", "area 2", "area 3"],
  "detailed_feedback": "A comprehensive paragraph analyzing the candidate's performance, covering their answers, communication style, and how well they demonstrated relevant skills and experiences.",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Scoring guidelines:
- 90-100: Excellent - Outstanding performance with clear examples
- 75-89: Good - Solid performance with room for minor improvements
- 60-74: Fair - Acceptable but needs development in key areas
- Below 60: Needs Improvement - Significant gaps in responses

Be constructive, specific, and actionable in your feedback.`;

    console.log("[Feedback] Calling OpenAI for analysis...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interview coach. Provide structured, actionable feedback in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const feedbackText = completion.choices[0].message.content;
    if (!feedbackText) {
      throw new Error("No feedback generated");
    }

    const feedback = JSON.parse(feedbackText);

    console.log("[Feedback] Generated feedback:", feedback);

    // Save feedback to database
    const { error: insertError } = await supabase
      .from("behavioral_interview_feedback")
      .insert({
        session_id: sessionId,
        overall_score: feedback.overall_score,
        communication_score: feedback.communication_score,
        technical_competence_score: feedback.technical_competence_score,
        problem_solving_score: feedback.problem_solving_score,
        teamwork_score: feedback.teamwork_score,
        strengths: feedback.strengths,
        areas_for_improvement: feedback.areas_for_improvement,
        detailed_feedback: feedback.detailed_feedback,
        recommendations: feedback.recommendations,
      });

    if (insertError) {
      throw insertError;
    }

    // Update session to mark feedback as generated
    await supabase
      .from("behavioral_interview_sessions")
      .update({ feedback_generated: true })
      .eq("id", sessionId);

    console.log("[Feedback] Feedback saved successfully");

    return new Response(JSON.stringify({ success: true, feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Feedback] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
