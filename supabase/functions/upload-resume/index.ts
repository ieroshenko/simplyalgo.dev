// @ts-expect-error - Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Ambient declaration for Deno types
declare const Deno: { env: { get(name: string): string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

// Parse multipart/form-data manually
async function parseMultipartFormData(
  request: Request,
): Promise<{ file: File | null; error?: string }> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    return { file };
  } catch (error) {
    return {
      file: null,
      error: error instanceof Error ? error.message : "Failed to parse form data",
    };
  }
}

// Parse PDF using pdf-parse via npm specifier (works better in Deno)
async function parsePDF(buffer: Uint8Array): Promise<string> {
  // Import Buffer polyfill for Deno
  // @ts-expect-error - Dynamic import
  const { Buffer } = await import("https://deno.land/x/node_buffer@1.1.0/mod.ts");
  // @ts-expect-error - Dynamic import
  const pdfParse = await import("npm:pdf-parse@1.1.1");
  const data = await pdfParse.default(Buffer.from(buffer));
  return data.text || "";
}

// Parse DOCX using mammoth via npm specifier
async function parseDOCX(buffer: Uint8Array): Promise<string> {
  // Import Buffer polyfill for Deno
  // @ts-expect-error - Dynamic import
  const { Buffer } = await import("https://deno.land/x/node_buffer@1.1.0/mod.ts");
  // @ts-expect-error - Dynamic import
  const mammoth = await import("npm:mammoth@1.6.0");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value || "";
}

// Parse text file
async function parseTXT(buffer: Uint8Array): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Parse multipart form data
    const { file, error: parseError } = await parseMultipartFormData(req);

    if (parseError) {
      return new Response(
        JSON.stringify({ error: parseError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File size must be less than 10MB" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.substring(fileName.lastIndexOf("."));
    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.includes(fileExt);

    if (!hasValidType && !hasValidExtension) {
      return new Response(
        JSON.stringify({ error: "Only PDF, DOCX, and TXT files are allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[UploadResume] Processing: ${file.name}`);

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let text = "";

    // Parse based on file type
    if (file.type === "application/pdf" || fileExt === ".pdf") {
      text = await parsePDF(buffer);
      console.log(`[UploadResume] Extracted ${text.length} chars from PDF`);
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileExt === ".docx"
    ) {
      text = await parseDOCX(buffer);
      console.log(`[UploadResume] Extracted ${text.length} chars from DOCX`);
    } else {
      text = await parseTXT(buffer);
      console.log(`[UploadResume] Read ${text.length} chars from TXT`);
    }

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text extracted from file" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cleaned = text.trim();
    const preview = cleaned.slice(0, 500);
    console.log("[UploadResume] Text preview:", preview);
    if (cleaned.length > preview.length) {
      console.log("[UploadResume] Text preview truncated (showing first 500 characters)");
    }

    return new Response(
      JSON.stringify({ text: cleaned }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[UploadResume] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to parse resume",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

