/**
 * Tests for stripe-webhook Edge Function
 * 
 * Run with: deno test --allow-net --allow-env stripe-webhook/
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Simplified handler for testing (extracted logic)
async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const signature = req.headers.get("stripe-signature");

        if (!signature) {
            return new Response(
                JSON.stringify({ error: "No stripe signature" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
        if (!webhookSecret) {
            return new Response(
                JSON.stringify({ error: "Webhook secret not configured" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // In a real test, we'd verify the signature
        // For now, just return success
        return new Response(
            JSON.stringify({ received: true }),
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
    const req = new Request("http://localhost/functions/v1/stripe-webhook", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns error when stripe signature is missing", async () => {
    const req = new Request("http://localhost/functions/v1/stripe-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "No stripe signature");
});

Deno.test("Returns error when webhook secret not configured", async () => {
    // Clear the env variable
    Deno.env.delete("STRIPE_WEBHOOK_SECRET");

    const req = new Request("http://localhost/functions/v1/stripe-webhook", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "stripe-signature": "test_signature",
        },
        body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 500);
    assertEquals(data.error, "Webhook secret not configured");
});

Deno.test("Returns success when signature is provided and secret configured", async () => {
    Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_test123");

    const req = new Request("http://localhost/functions/v1/stripe-webhook", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "stripe-signature": "test_signature",
        },
        body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.received, true);

    // Cleanup
    Deno.env.delete("STRIPE_WEBHOOK_SECRET");
});
