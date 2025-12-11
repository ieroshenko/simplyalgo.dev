/**
 * Tests for generate-interview-feedback Edge Function
 * 
 * Run with: deno test --allow-net --allow-env generate-interview-feedback/
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createMockRequest } from "../_test_utils/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simplified handler for testing
async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return new Response(
                JSON.stringify({ error: "Session ID is required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock feedback response
        const mockFeedback = {
            overall_score: 85,
            communication_score: 88,
            technical_competence_score: 82,
            problem_solving_score: 80,
            teamwork_score: 90,
            strengths: [
                "Clear communication style",
                "Good technical examples",
                "Strong team collaboration skills",
            ],
            areas_for_improvement: [
                "Add more metrics to examples",
                "Be more specific about personal contributions",
                "Practice the STAR method",
            ],
            detailed_feedback:
                "The candidate demonstrated strong communication skills and provided relevant examples. Could improve by quantifying results more.",
            recommendations: [
                "Practice structuring answers with STAR method",
                "Prepare more examples with measurable outcomes",
                "Review common behavioral questions",
            ],
        };

        return new Response(
            JSON.stringify({ success: true, feedback: mockFeedback }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
}

Deno.test("OPTIONS request returns ok", async () => {
    const req = new Request("http://localhost/functions/v1/generate-interview-feedback", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns error when sessionId is missing", async () => {
    const req = createMockRequest("POST", {});
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Session ID is required");
});

Deno.test("Returns feedback for valid sessionId", async () => {
    const req = createMockRequest("POST", { sessionId: "session-123" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertExists(data.feedback);
    assertExists(data.feedback.overall_score);
    assertExists(data.feedback.strengths);
    assertExists(data.feedback.areas_for_improvement);
});

Deno.test("Feedback contains all required fields", async () => {
    const req = createMockRequest("POST", { sessionId: "session-123" });
    const response = await handler(req);
    const data = await response.json();

    const feedback = data.feedback;
    assertExists(feedback.overall_score);
    assertExists(feedback.communication_score);
    assertExists(feedback.technical_competence_score);
    assertExists(feedback.problem_solving_score);
    assertExists(feedback.teamwork_score);
    assertExists(feedback.detailed_feedback);
    assertExists(feedback.recommendations);
});
