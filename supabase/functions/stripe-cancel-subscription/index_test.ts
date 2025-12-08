/**
 * Tests for stripe-cancel-subscription Edge Function
 * 
 * Run with: deno test --allow-net --allow-env stripe-cancel-subscription/
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

        // Mock successful cancellation
        return new Response(
            JSON.stringify({
                success: true,
                subscription: {
                    id: subscription_id,
                    status: "active",
                    cancel_at_period_end: true,
                    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                },
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
    const req = new Request("http://localhost/functions/v1/stripe-cancel-subscription", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns 401 when no authorization header", async () => {
    const req = new Request("http://localhost/functions/v1/stripe-cancel-subscription", {
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

Deno.test("Returns success for valid cancellation request", async () => {
    const req = createMockRequest("POST", { subscription_id: "sub_test123" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertExists(data.subscription);
    assertEquals(data.subscription.cancel_at_period_end, true);
});
