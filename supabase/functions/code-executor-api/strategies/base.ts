/* eslint-disable @typescript-eslint/no-explicit-any */
// Base interface for all problem strategies
export interface ProblemStrategy {
    /**
     * Prepare user code for execution (add imports, helper functions, etc.)
     */
    prepareCode(code: string, language: string): string;

    /**
     * Generate the test execution code for a specific test case
     */
    generateTestCall(
        testCase: any,
        params: string[],
        functionName: string,
        language: string
    ): string;

    /**
     * Parse the output from code execution
     */
    parseResult(output: string): any;

    /**
     * Get the problem type identifier
     */
    getType(): ProblemType;
}

export enum ProblemType {
    STANDARD = 'standard',
    LINKED_LIST = 'linked_list',
    BINARY_TREE = 'binary_tree',
    GRAPH = 'graph',
    CLASS_BASED = 'class_based',
    ENCODE_DECODE = 'encode_decode',
    SERIALIZE_DESERIALIZE = 'serialize_deserialize',
}

// Base abstract class with common functionality
export abstract class BaseProblemStrategy implements ProblemStrategy {
    abstract getType(): ProblemType;

    abstract prepareCode(code: string, language: string): string;

    abstract generateTestCall(
        testCase: any,
        params: string[],
        functionName: string,
        language: string
    ): string;

    parseResult(output: string): any {
        try {
            return JSON.parse(output);
        } catch {
            return output;
        }
    }

    /**
     * Helper to detect if code has 'self' parameter (indicates class method)
     */
    protected hasSelfParam(code: string): boolean {
        return /def\s+\w+\s*\([^)]*self[^)]*\)/.test(code);
    }

    /**
     * Helper to extract function name from code
     */
    protected extractFunctionName(code: string): string | null {
        const allFunctionMatches = [...code.matchAll(/def\s+(\w+)\s*\(/g)];
        const validFunctions = allFunctionMatches
            .map((match) => match[1])
            .filter((name) => !name.startsWith("__"));

        return validFunctions.length > 0 ? validFunctions[0] : null;
    }
}
