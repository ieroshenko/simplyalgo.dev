/**
 * Edge Function Test Utilities
 * 
 * Helper functions for testing Supabase Edge Functions with Deno
 */

// Mock environment variables
export function mockEnv(vars: Record<string, string>): () => void {
    const originals: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(vars)) {
        originals[key] = Deno.env.get(key);
        Deno.env.set(key, value);
    }

    // Return cleanup function
    return () => {
        for (const [key, value] of Object.entries(originals)) {
            if (value === undefined) {
                Deno.env.delete(key);
            } else {
                Deno.env.set(key, value);
            }
        }
    };
}

// Create a mock Request object
export function createMockRequest(
    method: string = "POST",
    body?: unknown,
    headers?: Record<string, string>
): Request {
    const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token",
    };

    return new Request("http://localhost:54321/functions/v1/test", {
        method,
        headers: { ...defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
    });
}

// Assert response status and parse JSON
export async function assertResponse(
    response: Response,
    expectedStatus: number
): Promise<unknown> {
    if (response.status !== expectedStatus) {
        const body = await response.text();
        throw new Error(
            `Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`
        );
    }

    return response.json();
}

// Mock fetch for external API calls
export function mockFetch(
    responses: Map<string, { status: number; body: unknown }>
): () => void {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        for (const [pattern, response] of responses) {
            if (url.includes(pattern)) {
                return new Response(JSON.stringify(response.body), {
                    status: response.status,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        // Fall through to original fetch for unmatched URLs
        return originalFetch(input, init);
    };

    // Return cleanup function
    return () => {
        globalThis.fetch = originalFetch;
    };
}
