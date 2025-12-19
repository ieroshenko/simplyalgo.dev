/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseProblemStrategy, ProblemType } from "./base.ts";

/**
 * Strategy for class-based problems
 * Examples: LRU Cache, MedianFinder, WordDictionary, Trie, etc.
 */
export class ClassBasedStrategy extends BaseProblemStrategy {
    getType(): ProblemType {
        return ProblemType.CLASS_BASED;
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

        // Add heapq import if needed
        const needsHeapq = /\b(heappush|heappop|heapify)\b/.test(code);
        if (needsHeapq && !code.includes("import heapq")) {
            processedCode = `import heapq\n${processedCode}`;
        }

        // Add helper function for class-based execution
        if (!code.includes("def execute_class_operations")) {
            const helperFunction = `
def execute_class_operations(operations, values):
    """Execute class-based operations for problems like MedianFinder, LRUCache, etc."""
    obj = None
    results = []
    
    for i, (op, val) in enumerate(zip(operations, values)):
        if i == 0:
            # First operation is always the constructor
            class_name = op
            # Try to get the class from global namespace
            try:
                cls = globals()[class_name]
            except KeyError:
                # If not found, it might be in Solution namespace (shouldn't happen but fallback)
                cls = globals().get('Solution', type(class_name, (), {}))
            
            # Initialize the class
            if val:
                obj = cls(*val) if isinstance(val, list) else cls(val)
            else:
                obj = cls()
            results.append(None)
        else:
            # Call the method with the provided arguments
            method = getattr(obj, op)
            if val:
                # If there are arguments, unpack them
                result = method(*val) if isinstance(val, list) else method(val)
            else:
                # No arguments
                result = method()
            results.append(result)
    
    return results

`;
            processedCode = helperFunction + processedCode;
        }

        return processedCode;
    }

    private prepareJavaScriptCode(code: string): string {
        // TODO: Add class operation helpers for JavaScript
        return code;
    }

    private prepareJavaCode(code: string): string {
        // TODO: Add class operation helpers for Java
        return code;
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
        // For class-based problems, testCase.input should have:
        // - operations: ["LRUCache", "put", "get", ...]
        // - values: [[2], [1, 1], [1], ...]

        return `execute_class_operations(tc["operations"], tc.get("values", tc.get("args", [])))`;
    }

    private generateJavaScriptTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement JavaScript test call generation
        return `executeClassOperations(tc.operations, tc.values)`;
    }

    private generateJavaTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement Java test call generation
        return `executeClassOperations(tc.operations, tc.values)`;
    }

    parseResult(output: string): any {
        try {
            const result = JSON.parse(output);
            // For class-based problems, result is usually an array of operation results
            return result;
        } catch {
            return output;
        }
    }
}
