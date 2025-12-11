/**
 * Tests for openrouter-usage Edge Function
 * 
 * Run with: deno test --allow-net --allow-env supabase/functions/openrouter-usage/
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { mockEnv, mockFetch, createMockRequest } from "../_test_utils/mod.ts";

// Import the handler logic (we'll need to refactor the function slightly)
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

// Handler function extracted for testing
async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        if (!OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY not configured");
        }

        const response = await fetch("https://openrouter.ai/api/v1/credits", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        const totalCredits = data.data?.total_credits || 0;
        const usedCredits = data.data?.total_usage || 0;
        const remainingCredits = totalCredits - usedCredits;

        return new Response(
            JSON.stringify({
                credits_remaining: remainingCredits,
                credits_total: totalCredits,
                credits_used: usedCredits,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({
                error: errorMessage,
                credits_remaining: 0,
                credits_total: 0,
                credits_used: 0,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
}

// Tests
Deno.test("OPTIONS request returns ok", async () => {
    const req = new Request("http://localhost/functions/v1/openrouter-usage", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    const body = await response.text();

    assertEquals(response.status, 200);
    assertEquals(body, "ok");
    assertExists(response.headers.get("Access-Control-Allow-Origin"));
});

Deno.test("Returns error when API key not configured", async () => {
    const cleanup = mockEnv({ OPENROUTER_API_KEY: "" });

    try {
        Deno.env.delete("OPENROUTER_API_KEY");

        const req = createMockRequest("GET");
        const response = await handler(req);
        const data = await response.json();

        assertEquals(response.status, 500);
        assertEquals(data.credits_remaining, 0);
        assertExists(data.error);
    } finally {
        cleanup();
    }
});

Deno.test("Returns credits when API call succeeds", async () => {
    const cleanupEnv = mockEnv({ OPENROUTER_API_KEY: "test-api-key" });

    const mockResponses = new Map<string, { status: number; body: unknown }>();
    mockResponses.set("openrouter.ai/api/v1/credits", {
        status: 200,
        body: {
            data: {
                total_credits: 100,
                total_usage: 25.5,
            },
        },
    });

    const cleanupFetch = mockFetch(mockResponses);

    try {
        const req = createMockRequest("GET");
        const response = await handler(req);
        const data = await response.json();

        assertEquals(response.status, 200);
        assertEquals(data.credits_total, 100);
        assertEquals(data.credits_used, 25.5);
        assertEquals(data.credits_remaining, 74.5);
    } finally {
        cleanupEnv();
        cleanupFetch();
    }
});

Deno.test("Handles API error gracefully", async () => {
    const cleanupEnv = mockEnv({ OPENROUTER_API_KEY: "test-api-key" });

    const mockResponses = new Map<string, { status: number; body: unknown }>();
    mockResponses.set("openrouter.ai/api/v1/credits", {
        status: 401,
        body: { error: "Unauthorized" },
    });

    const cleanupFetch = mockFetch(mockResponses);

    try {
        const req = createMockRequest("GET");
        const response = await handler(req);
        const data = await response.json();

        assertEquals(response.status, 500);
        assertEquals(data.credits_remaining, 0);
        assertExists(data.error);
    } finally {
        cleanupEnv();
        cleanupFetch();
    }
});

Deno.test("Handles missing data fields gracefully", async () => {
    const cleanupEnv = mockEnv({ OPENROUTER_API_KEY: "test-api-key" });

    const mockResponses = new Map<string, { status: number; body: unknown }>();
    mockResponses.set("openrouter.ai/api/v1/credits", {
        status: 200,
        body: { data: {} }, // Empty data object
    });

    const cleanupFetch = mockFetch(mockResponses);

    try {
        const req = createMockRequest("GET");
        const response = await handler(req);
        const data = await response.json();

        assertEquals(response.status, 200);
        assertEquals(data.credits_total, 0);
        assertEquals(data.credits_used, 0);
        assertEquals(data.credits_remaining, 0);
    } finally {
        cleanupEnv();
        cleanupFetch();
    }
});
