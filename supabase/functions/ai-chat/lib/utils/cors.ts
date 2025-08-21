// CORS utilities for the ai-chat edge function

/**
 * CORS headers for all responses
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(): Response {
  return new Response("ok", { headers: corsHeaders });
}

/**
 * Create a JSON response with CORS headers
 */
export function createJsonResponse(
  data: unknown,
  options: { status?: number } = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create an error response with CORS headers
 */
export function createErrorResponse(
  error: string | { error: string; details?: string; errorType?: string },
  status: number = 500
): Response {
  const errorData = typeof error === "string" ? { error } : error;
  return createJsonResponse(errorData, { status });
}