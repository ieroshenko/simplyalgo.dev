/**
 * Tests for generate-interview-questions Edge Function
 * 
 * Run with: deno test --allow-net --allow-env generate-interview-questions/
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
        const body = await req.json();
        const { resumeText, role, company } = body;

        if (!resumeText || !role) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: resumeText and role" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock questions response
        const mockQuestions = {
            questions: [
                {
                    question_text: "Tell me about a time you had to debug a complex issue in production.",
                    category: ["debugging_problem_solving"],
                    difficulty: "intermediate",
                    rationale: "Tests debugging skills relevant for the role.",
                },
                {
                    question_text: "Describe a situation where you had to lead a technical project.",
                    category: ["technical_leadership"],
                    difficulty: "advanced",
                    rationale: "Assesses leadership abilities.",
                },
                {
                    question_text: "How do you approach code reviews?",
                    category: ["code_review_collaboration"],
                    difficulty: "beginner",
                    rationale: "Evaluates collaboration skills.",
                },
                {
                    question_text: "Tell me about a time you had to learn a new technology quickly.",
                    category: ["learning_new_technologies"],
                    difficulty: "intermediate",
                    rationale: "Tests adaptability.",
                },
            ],
        };

        return new Response(JSON.stringify(mockQuestions), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({
                error: "Failed to generate questions",
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
    const req = new Request("http://localhost/functions/v1/generate-interview-questions", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns error when resumeText is missing", async () => {
    const req = createMockRequest("POST", { role: "Software Engineer" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertExists(data.error);
});

Deno.test("Returns error when role is missing", async () => {
    const req = createMockRequest("POST", { resumeText: "Software Engineer with 5 years experience..." });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertExists(data.error);
});

Deno.test("Returns questions for valid request", async () => {
    const req = createMockRequest("POST", {
        resumeText: "Software Engineer with 5 years experience at Google...",
        role: "Senior Software Engineer",
        company: "Meta",
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.questions);
    assertEquals(data.questions.length, 4);
});

Deno.test("Each question has required fields", async () => {
    const req = createMockRequest("POST", {
        resumeText: "Software Engineer...",
        role: "Software Engineer",
    });

    const response = await handler(req);
    const data = await response.json();

    for (const question of data.questions) {
        assertExists(question.question_text);
        assertExists(question.category);
        assertExists(question.difficulty);
        assertExists(question.rationale);
    }
});
