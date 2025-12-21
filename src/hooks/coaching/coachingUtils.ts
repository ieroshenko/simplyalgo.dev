/**
 * Utility functions for coaching
 */

/**
 * Normalize code by removing comments and collapsing whitespace
 * Used for comparing code snippets
 */
export const normalizeCode = (code: string): string =>
    code
        .replace(/#.*$/gm, "") // strip inline comments
        .replace(/\s+/g, " ") // collapse whitespace
        .trim();

/**
 * Check if full code already contains a snippet (normalized comparison)
 */
export const codeContainsSnippet = (full: string, snippet: string): boolean => {
    const normalizedFull = normalizeCode(full);
    const normalizedSnippet = normalizeCode(snippet);
    return normalizedFull.includes(normalizedSnippet);
};

/**
 * Strip markdown code fences from code string
 * e.g. ```python\ncode\n``` -> code
 */
export const stripCodeFences = (code: string): string =>
    code.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();

/**
 * Check if code looks like a large insertion (function definition, class, etc.)
 */
export const isLargeInsertion = (code: string): boolean => {
    const lines = code.split('\n').filter(l => l.trim().length > 0);
    const looksLarge = lines.length > 8 || /\b(def\s+\w+\s*\(|class\s+\w+|if\s+__name__\s*==)/.test(code);
    return looksLarge;
};

/**
 * Calculate fallback screen position when editor is unavailable
 */
export const getFallbackPosition = (): { x: number; y: number } => ({
    x: 100,
    y: Math.min(window.innerHeight - 220, 180)
});

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

/**
 * Create a code snippet object for AI insertion
 */
export const createCodeSnippet = (code: string, id?: string) => ({
    id: id || `coaching-${Date.now()}`,
    code,
    language: "python", // TODO: detect from problem
    isValidated: true,
    insertionType: "smart" as const,
    insertionHint: {
        type: "statement",
        scope: "function",
        description: "AI coaching generated code"
    }
});
