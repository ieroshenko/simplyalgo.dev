/**
 * Tests for stripe-checkout Edge Function
 * 
 * Run with: deno test --allow-net --allow-env stripe-checkout/
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

// Simplified handler for testing (extracted logic)
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

        const { plan, return_url } = await req.json();

        if (!plan || !return_url) {
            return new Response(
                JSON.stringify({ error: "Missing required parameters" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (plan !== "monthly" && plan !== "yearly") {
            return new Response(
                JSON.stringify({ error: "Invalid plan" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock successful checkout session
        return new Response(
            JSON.stringify({
                sessionId: "cs_test_123",
                clientSecret: "cs_secret_123",
                url: "https://checkout.stripe.com/test",
                hasTrial: plan === "yearly",
                trialDays: plan === "yearly" ? 3 : undefined,
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
    const req = new Request("http://localhost/functions/v1/stripe-checkout", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns 401 when no authorization header", async () => {
    const req = new Request("http://localhost/functions/v1/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly", return_url: "http://localhost/callback" }),
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 401);
    assertEquals(data.error, "No authorization header");
});

Deno.test("Returns error when plan is missing", async () => {
    const req = createMockRequest("POST", { return_url: "http://localhost/callback" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing required parameters");
});

Deno.test("Returns error when return_url is missing", async () => {
    const req = createMockRequest("POST", { plan: "monthly" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing required parameters");
});

Deno.test("Returns error for invalid plan", async () => {
    const req = createMockRequest("POST", { plan: "invalid", return_url: "http://localhost/callback" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Invalid plan");
});

Deno.test("Returns checkout session for monthly plan", async () => {
    const req = createMockRequest("POST", { plan: "monthly", return_url: "http://localhost/callback" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.sessionId);
    assertExists(data.clientSecret);
    assertEquals(data.hasTrial, false);
});

Deno.test("Returns checkout session with trial for yearly plan", async () => {
    const req = createMockRequest("POST", { plan: "yearly", return_url: "http://localhost/callback" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.sessionId);
    assertEquals(data.hasTrial, true);
    assertEquals(data.trialDays, 3);
});
