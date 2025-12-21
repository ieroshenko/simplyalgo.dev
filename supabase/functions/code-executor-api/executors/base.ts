/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Base interface for language executors
 */
export interface LanguageExecutor {
    /**
     * Get the Judge0 language ID
     */
    getLanguageId(): number;

    /**
     * Process code before execution (add test harness, etc.)
     */
    processCode(code: string, testCases: unknown[], functionName: string): string;

    /**
     * Parse output from execution
     */
    parseOutput(stdout: string): any;

    /**
     * Get the language name
     */
    getLanguageName(): string;
}

/**
 * Base abstract class with common functionality
 */
export abstract class BaseLanguageExecutor implements LanguageExecutor {
    abstract getLanguageId(): number;
    abstract getLanguageName(): string;
    abstract processCode(code: string, testCases: unknown[], functionName: string): string;

    parseOutput(stdout: string): any {
        try {
            return JSON.parse(stdout);
        } catch {
            return stdout;
        }
    }

    /**
     * Helper to convert JavaScript/TypeScript booleans to language-specific format
     */
    protected convertBooleans(json: string, targetLang: string): string {
        if (targetLang === "python") {
            return json
                .replace(/\btrue\b/g, "True")
                .replace(/\bfalse\b/g, "False")
                .replace(/\bnull\b/g, "None");
        } else if (targetLang === "java") {
            return json; // Java uses lowercase true/false
        }
        return json;
    }
}
