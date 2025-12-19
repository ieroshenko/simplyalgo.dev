/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseProblemStrategy, ProblemType } from "./base.ts";

/**
 * Strategy for standard function-based problems
 * Examples: Two Sum, Valid Palindrome, etc.
 */
export class StandardStrategy extends BaseProblemStrategy {
    getType(): ProblemType {
        return ProblemType.STANDARD;
    }

    prepareCode(code: string, language: string): string {
        if (language === "python" || language === "python3") {
            return this.preparePythonCode(code);
        } else if (language === "javascript") {
            return this.prepareJavaScriptCode(code);
        } else if (language === "java") {
            return this.prepareJavaCode(code);
        }
        return code;
    }

    private preparePythonCode(code: string): string {
        let processedCode = code;

        // Add typing imports if needed
        const needsTyping = /\b(List|Dict|Set|Tuple|Optional|Union)\b/.test(code);
        if (needsTyping && !code.includes("from typing import")) {
            processedCode = `from typing import List, Dict, Set, Tuple, Optional, Union\n${processedCode}`;
        }

        // Add collections import if needed
        const needsCollections = /\b(deque|defaultdict|Counter)\b/.test(code);
        if (needsCollections && !code.includes("from collections import")) {
            processedCode = `from collections import deque, defaultdict, Counter\n${processedCode}`;
        }

        // Wrap in Solution class if has self param but no class
        if (this.hasSelfParam(code) && !code.includes("class Solution")) {
            processedCode = this.wrapInSolutionClass(processedCode);
        }

        return processedCode;
    }

    private prepareJavaScriptCode(code: string): string {
        // JavaScript doesn't need much preprocessing for standard problems
        return code;
    }

    private prepareJavaCode(code: string): string {
        // Ensure class structure
        if (!code.includes("class Solution")) {
            return `class Solution {\n${this.indentCode(code, 4)}\n}`;
        }
        return code;
    }

    private wrapInSolutionClass(code: string): string {
        const lines = code.split("\n");
        const imports: string[] = [];
        const userCodeLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith("from ") || line.startsWith("import ")) {
                imports.push(line);
            } else {
                userCodeLines.push(line);
            }
        }

        const indentedUserCode = userCodeLines
            .map((line) => {
                if (line.trim() === "") return line;
                return "    " + line;
            })
            .join("\n");

        return imports.length > 0
            ? `${imports.join("\n")}\n\nclass Solution:\n${indentedUserCode}`
            : `class Solution:\n${indentedUserCode}`;
    }

    private indentCode(code: string, spaces: number): string {
        const indent = " ".repeat(spaces);
        return code
            .split("\n")
            .map((line) => (line.trim() === "" ? line : indent + line))
            .join("\n");
    }

    generateTestCall(
        testCase: any,
        params: string[],
        functionName: string,
        language: string
    ): string {
        if (language === "python" || language === "python3") {
            return this.generatePythonTestCall(testCase, params, functionName);
        } else if (language === "javascript") {
            return this.generateJavaScriptTestCall(testCase, params, functionName);
        } else if (language === "java") {
            return this.generateJavaTestCall(testCase, params, functionName);
        }
        return "";
    }

    private generatePythonTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        const className = "Solution";

        if (params.length === 0) {
            return `${className}().${functionName}()`;
        } else if (params.length === 1) {
            return `${className}().${functionName}(tc["${params[0]}"])`;
        } else if (params.length === 2) {
            return `${className}().${functionName}(tc["${params[0]}"], tc["${params[1]}"])`;
        } else {
            const paramList = params.map((p) => `tc["${p}"]`).join(", ");
            return `${className}().${functionName}(${paramList})`;
        }
    }

    private generateJavaScriptTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        if (params.length === 0) {
            return `${functionName}()`;
        } else if (params.length === 1) {
            return `${functionName}(tc.${params[0]})`;
        } else if (params.length === 2) {
            return `${functionName}(tc.${params[0]}, tc.${params[1]})`;
        } else {
            const paramList = params.map((p) => `tc.${p}`).join(", ");
            return `${functionName}(${paramList})`;
        }
    }

    private generateJavaTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        const className = "Solution";

        if (params.length === 0) {
            return `new ${className}().${functionName}()`;
        } else if (params.length === 1) {
            return `new ${className}().${functionName}(tc.${params[0]})`;
        } else if (params.length === 2) {
            return `new ${className}().${functionName}(tc.${params[0]}, tc.${params[1]})`;
        } else {
            const paramList = params.map((p) => `tc.${p}`).join(", ");
            return `new ${className}().${functionName}(${paramList})`;
        }
    }
}
