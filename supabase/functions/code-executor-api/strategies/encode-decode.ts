/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseProblemStrategy, ProblemType } from "./base.ts";

/**
 * Strategy for encode/decode problems
 * Example: Encode and Decode Strings
 */
export class EncodeDecodeStrategy extends BaseProblemStrategy {
    getType(): ProblemType {
        return ProblemType.ENCODE_DECODE;
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

        // Wrap in Solution class if needed
        if (this.hasSelfParam(code) && !code.includes("class Solution")) {
            processedCode = this.wrapInSolutionClass(processedCode);
        }

        return processedCode;
    }

    private prepareJavaScriptCode(code: string): string {
        // TODO: Add preparations for JavaScript
        return code;
    }

    private prepareJavaCode(code: string): string {
        // TODO: Add preparations for Java
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

        // For encode/decode, we test round-trip: decode(encode(input))
        const param = params[0] || "strs";
        const arg = `tc.get("${param}", tc.get("strs"))`;

        return `${className}().decode(${className}().encode(${arg}))`;
    }

    private generateJavaScriptTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement JavaScript test call generation
        const param = params[0] || "strs";
        return `decode(encode(tc.${param}))`;
    }

    private generateJavaTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement Java test call generation
        const param = params[0] || "strs";
        return `new Solution().decode(new Solution().encode(tc.${param}))`;
    }
}
