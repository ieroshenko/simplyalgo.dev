import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmWithSessionContext } from "../ai-chat/lib/openai-client.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const { deckId, problemId, solutionCode, userNotes } = await req.json();

        if (!deckId || !problemId || !solutionCode) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Fetch problem details
        const { data: problem, error: problemError } = await supabaseClient
            .from("problems")
            .select("title, description, examples, constraints")
            .eq("id", problemId)
            .single();

        if (problemError || !problem) {
            return new Response(
                JSON.stringify({ error: "Problem not found" }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Generate AI summary
        const prompt = `Analyze this coding problem solution and create a flashcard summary for active recall.

PROBLEM: ${problem.title}
${problem.description}

USER'S SOLUTION:
\`\`\`
${solutionCode}
\`\`\`

USER'S NOTES:
${userNotes || "No notes provided"}

Generate a JSON response with:
1. "summary": 2-3 sentence explanation of the approach (focus on the "aha!" moment and key technique)
2. "keyInsights": Array of 2-3 key insights from the solution (what makes this solution work)
3. "notesHighlight": If user notes exist, extract the single most important insight (1 sentence max). If no notes, return null.
4. "codeSkeleton": The solution code with strategic blanks (use "___" for blanks) replacing:
   - Data structure initializations (e.g., hash maps, queues)
   - Key variable assignments
   - Critical method calls (e.g., queue.pop(), append())
   - Return statements
   Aim for 5-7 blanks total. Keep the structure and comments intact.
5. "hints": Object with keys "blank_1", "blank_2", etc., each containing a short hint (5-8 words)

Focus on what helps RECALL the solution, not teaching from scratch.
Use the user's notes to personalize the summary if available.
Keep the code skeleton readable - don't remove too much.

Return ONLY valid JSON, no markdown formatting.`;

        const aiResponse = await llmWithSessionContext({
            systemPrompt: "You are an expert at creating effective flashcards for coding interview preparation. Focus on active recall and spaced repetition principles.",
            userMessage: prompt,
            maxTokens: 2000,
        });

        console.log("AI Response:", aiResponse);

        // Parse AI response
        let summaryData;
        try {
            // Clean the response - remove markdown code blocks if present
            let cleanResponse = aiResponse.trim();
            if (cleanResponse.startsWith("```json")) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
            } else if (cleanResponse.startsWith("```")) {
                cleanResponse = cleanResponse.replace(/```\n?/g, "");
            }

            summaryData = JSON.parse(cleanResponse);
        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            console.error("Raw response:", aiResponse);
            return new Response(
                JSON.stringify({
                    error: "Failed to parse AI response",
                    details: parseError.message,
                    rawResponse: aiResponse.substring(0, 500)
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validate response structure
        if (!summaryData.summary || !summaryData.keyInsights || !summaryData.codeSkeleton || !summaryData.hints) {
            return new Response(
                JSON.stringify({
                    error: "Invalid AI response structure",
                    received: Object.keys(summaryData)
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Update flashcard deck with AI-generated data
        const { error: updateError } = await supabaseClient
            .from("flashcard_decks")
            .update({
                ai_summary: summaryData.summary,
                ai_key_insights: summaryData.keyInsights,
                ai_code_skeleton: summaryData.codeSkeleton,
                ai_hints: summaryData.hints,
                notes_highlight: summaryData.notesHighlight,
            })
            .eq("deck_id", deckId);

        if (updateError) {
            console.error("Failed to update flashcard deck:", updateError);
            return new Response(
                JSON.stringify({ error: "Failed to save AI summary", details: updateError.message }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: summaryData
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Error in generate-flashcard-summary:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
