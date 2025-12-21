/**
 * Utility functions for Problem Solver feature
 */

// Re-export common utilities from shared location
export { getDifficultyColor, formatRelativeTime } from "@/utils/uiUtils";

/**
 * Render a value as a displayable string
 * Handles null, undefined, primitives, JSON strings, and objects
 */
export const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean") return String(value);

    if (typeof value === "string") {
        const trimmed = value.trim();
        // Try to parse and re-stringify JSON for consistent formatting
        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return JSON.stringify(JSON.parse(trimmed));
            } catch {
                return value;
            }
        }
        return value;
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value as Record<string, unknown>);
        } catch {
            return String(value);
        }
    }

    return String(value);
};

/**
 * Get the platform-specific modifier key symbol
 */
export const getModifierKey = (): string => {
    return /(Mac|iPhone|iPad|iPod)/i.test(navigator.platform || "") ? "⌘" : "Ctrl";
};
