import { LanguageExecutor } from "./base.ts";
import { PythonExecutor } from "./python.ts";
import { JavaScriptExecutor } from "./javascript.ts";
import { JavaExecutor } from "./java.ts";

/**
 * Registry for language executors
 */
export class ExecutorRegistry {
    private executors: Map<string, LanguageExecutor>;

    constructor() {
        this.executors = new Map();

        // Register executors
        const pythonExecutor = new PythonExecutor();
        this.executors.set("python", pythonExecutor);
        this.executors.set("python3", pythonExecutor);

        const jsExecutor = new JavaScriptExecutor();
        this.executors.set("javascript", jsExecutor);
        this.executors.set("js", jsExecutor);

        const javaExecutor = new JavaExecutor();
        this.executors.set("java", javaExecutor);
    }

    /**
     * Get executor for a language
     */
    getExecutor(language: string): LanguageExecutor {
        const executor = this.executors.get(language.toLowerCase());
        if (!executor) {
            throw new Error(`Unsupported language: ${language}. Supported languages: ${this.getSupportedLanguages().join(", ")}`);
        }
        return executor;
    }

    /**
     * Get list of supported languages
     */
    getSupportedLanguages(): string[] {
        return Array.from(new Set(this.executors.keys()));
    }

    /**
     * Check if a language is supported
     */
    isSupported(language: string): boolean {
        return this.executors.has(language.toLowerCase());
    }
}
