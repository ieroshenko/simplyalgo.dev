/**
 * Tests for upload-resume Edge Function
 * 
 * Run with: deno test --allow-net --allow-env upload-resume/
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simplified handler for testing
async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            {
                status: 405,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return new Response(
                JSON.stringify({ error: "No file uploaded" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return new Response(
                JSON.stringify({ error: "File size must be less than 10MB" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validate file type
        const allowedExtensions = [".pdf", ".docx", ".txt"];
        const fileName = file.name.toLowerCase();
        const fileExt = fileName.substring(fileName.lastIndexOf("."));

        if (!allowedExtensions.includes(fileExt)) {
            return new Response(
                JSON.stringify({ error: "Only PDF, DOCX, and TXT files are allowed" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mock text extraction
        const mockText =
            "John Doe\nSoftware Engineer\n5 years of experience at Google...";

        return new Response(
            JSON.stringify({ text: mockText }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({
                error: "Failed to parse resume",
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
    const req = new Request("http://localhost/functions/v1/upload-resume", {
        method: "OPTIONS",
    });

    const response = await handler(req);
    assertEquals(response.status, 200);
});

Deno.test("Returns 405 for GET request", async () => {
    const req = new Request("http://localhost/functions/v1/upload-resume", {
        method: "GET",
    });

    const response = await handler(req);
    assertEquals(response.status, 405);
});

Deno.test("Returns error when no file uploaded", async () => {
    const formData = new FormData();
    const req = new Request("http://localhost/functions/v1/upload-resume", {
        method: "POST",
        body: formData,
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "No file uploaded");
});

Deno.test("Returns error for invalid file type", async () => {
    const formData = new FormData();
    formData.append("file", new File([""], "resume.exe", { type: "application/octet-stream" }));

    const req = new Request("http://localhost/functions/v1/upload-resume", {
        method: "POST",
        body: formData,
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.error, "Only PDF, DOCX, and TXT files are allowed");
});

Deno.test("Returns extracted text for valid PDF", async () => {
    const formData = new FormData();
    formData.append("file", new File(["dummy content"], "resume.pdf", { type: "application/pdf" }));

    const req = new Request("http://localhost/functions/v1/upload-resume", {
        method: "POST",
        body: formData,
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.text);
});

Deno.test("Accepts .txt files", async () => {
    const formData = new FormData();
    formData.append("file", new File(["My resume content"], "resume.txt", { type: "text/plain" }));

    const req = new Request("http://localhost/functions/v1/upload-resume", {
        method: "POST",
        body: formData,
    });

    const response = await handler(req);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.text);
});
