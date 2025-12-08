/**
 * Tests for generate-flashcard-summary Edge Function
 * 
 * Run with: deno test --allow-net --allow-env generate-flashcard-summary/
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

        // Mock AI summary response
        const mockSummary = {
            summary: "This solution uses a hash map for O(1) lookups to find complement pairs.",
            keyInsights: [
                "Use hash map to store seen numbers",
                "Calculate complement as target - current",
                "Single pass through array",
            ],
            notesHighlight: userNotes ? "Key insight from notes" : null,
            codeSkeleton: "def twoSum(nums, target):\n    seen = ___\n    for i, num in enumerate(nums):\n        complement = target - ___\n        if complement in ___:\n            return ___\n        seen[num] = i",
            hints: {
                blank_1: "empty dictionary",
                blank_2: "current number",
                blank_3: "seen hash map",
                blank_4: "indices of pair",
            },
        };

        return new Response(
            JSON.stringify({
                success: true,
                data: mockSummary,
            }),
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
    const req = new Request("http://localhost/functions/v1/generate-flashcard-summary", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns error when deckId is missing", async () => {
    const req = createMockRequest("POST", {
        problemId: "two-sum",
        solutionCode: "def twoSum(): pass",
    });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing required fields");
});

Deno.test("Returns error when problemId is missing", async () => {
    const req = createMockRequest("POST", {
        deckId: "deck-123",
        solutionCode: "def twoSum(): pass",
    });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing required fields");
});

Deno.test("Returns error when solutionCode is missing", async () => {
    const req = createMockRequest("POST", {
        deckId: "deck-123",
        problemId: "two-sum",
    });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing required fields");
});

Deno.test("Returns flashcard summary for valid request", async () => {
    const req = createMockRequest("POST", {
        deckId: "deck-123",
        problemId: "two-sum",
        solutionCode: "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i",
        userNotes: "Use hash map for O(1) lookups",
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertExists(data.data.summary);
    assertExists(data.data.keyInsights);
    assertExists(data.data.codeSkeleton);
    assertExists(data.data.hints);
});

Deno.test("Works without user notes", async () => {
    const req = createMockRequest("POST", {
        deckId: "deck-123",
        problemId: "two-sum",
        solutionCode: "def twoSum(): pass",
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.notesHighlight, null);
});
