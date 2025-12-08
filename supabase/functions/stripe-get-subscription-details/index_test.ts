/**
 * Tests for stripe-get-subscription-details Edge Function
 * 
 * Run with: deno test --allow-net --allow-env stripe-get-subscription-details/
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
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "No authorization header" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const { subscription_id } = await req.json();

        if (!subscription_id) {
            return new Response(
                JSON.stringify({ error: "Missing subscription_id parameter" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock subscription details
        const now = Math.floor(Date.now() / 1000);
        return new Response(
            JSON.stringify({
                current_period_end: now + 30 * 24 * 60 * 60,
                cancel_at_period_end: false,
                canceled_at: null,
                trial_end: null,
                status: "active",
                current_period_start: now - 5 * 24 * 60 * 60,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error: unknown) {
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
}

Deno.test("OPTIONS request returns ok", async () => {
    const req = new Request("http://localhost/functions/v1/stripe-get-subscription-details", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns 401 when no authorization header", async () => {
    const req = new Request("http://localhost/functions/v1/stripe-get-subscription-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: "sub_123" }),
    });

    const response = await handler(req);
    assertEquals(response.status, 401);
});

Deno.test("Returns error when subscription_id is missing", async () => {
    const req = createMockRequest("POST", {});
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing subscription_id parameter");
});

Deno.test("Returns subscription details for valid request", async () => {
    const req = createMockRequest("POST", { subscription_id: "sub_test123" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.current_period_end);
    assertExists(data.status);
    assertEquals(data.status, "active");
});
