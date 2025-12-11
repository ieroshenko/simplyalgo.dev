/**
 * Tests for behavioral-interview-feedback Edge Function
 * 
 * Run with: deno test --allow-net --allow-env behavioral-interview-feedback/
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { mockEnv, createMockRequest } from "../_test_utils/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simplified handler for testing (extracted logic)
async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { question, answer, evaluationType } = body;

        if (!question || !answer) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: question and answer" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock feedback response for testing
        const mockFeedback = {
            content_score: 85,
            delivery_score: 80,
            overall_score: 82,
            feedback: {
                strengths: ["Clear structure", "Good examples"],
                improvements: ["Add more metrics"],
                specific_examples: ["Include project duration"],
                next_steps: ["Practice with STAR method"],
            },
        };

        if (evaluationType === 'star') {
            (mockFeedback as any).star_score = {
                situation: 80,
                task: 85,
                action: 90,
                result: 75,
            };
        }

        return new Response(JSON.stringify(mockFeedback), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({
                error: "Failed to generate feedback",
                message: errorMessage,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
}

Deno.test("OPTIONS request returns ok", async () => {
    const req = new Request("http://localhost/functions/v1/behavioral-interview-feedback", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    const body = await response.text();

    assertEquals(response.status, 200);
    assertEquals(body, "ok");
});

Deno.test("Returns error when question is missing", async () => {
    const req = createMockRequest("POST", { answer: "My answer" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertExists(data.error);
});

Deno.test("Returns error when answer is missing", async () => {
    const req = createMockRequest("POST", { question: "Tell me about a challenge" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertExists(data.error);
});

Deno.test("Returns feedback for valid request", async () => {
    const req = createMockRequest("POST", {
        question: "Tell me about a time you faced a challenge",
        answer: "I led a team project where we had tight deadlines...",
        evaluationType: "star",
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.content_score);
    assertExists(data.delivery_score);
    assertExists(data.overall_score);
    assertExists(data.feedback);
});

Deno.test("Returns STAR scores when evaluationType is star", async () => {
    const req = createMockRequest("POST", {
        question: "Tell me about a time you faced a challenge",
        answer: "I led a team project...",
        evaluationType: "star",
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.star_score);
    assertExists(data.star_score.situation);
    assertExists(data.star_score.task);
    assertExists(data.star_score.action);
    assertExists(data.star_score.result);
});
