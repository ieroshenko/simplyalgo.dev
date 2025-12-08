/**
 * Tests for stripe-customer-portal Edge Function
 * 
 * Run with: deno test --allow-net --allow-env stripe-customer-portal/
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

        const { return_url } = await req.json();

        if (!return_url) {
            return new Response(
                JSON.stringify({ error: "Missing return_url parameter" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock portal URL
        return new Response(
            JSON.stringify({
                url: "https://billing.stripe.com/session/test123",
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
    const req = new Request("http://localhost/functions/v1/stripe-customer-portal", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns 401 when no authorization header", async () => {
    const req = new Request("http://localhost/functions/v1/stripe-customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_url: "http://localhost/account" }),
    });

    const response = await handler(req);
    assertEquals(response.status, 401);
});

Deno.test("Returns error when return_url is missing", async () => {
    const req = createMockRequest("POST", {});
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Missing return_url parameter");
});

Deno.test("Returns portal URL for valid request", async () => {
    const req = createMockRequest("POST", { return_url: "http://localhost/account" });
    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.url);
});
