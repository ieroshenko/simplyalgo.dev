import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        if (!OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY not configured");
        }

        console.log("Fetching OpenRouter credits...");

        // Fetch credits from OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/credits", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log("OpenRouter credits response:", data);

        // OpenRouter returns: { data: { total_credits: 5, total_usage: 3.554304105 } }
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
    } catch (error) {
        console.error("Error fetching OpenRouter credits:", error);

        return new Response(
            JSON.stringify({
                error: error.message,
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
});
