import { BaseLanguageExecutor } from "./base.ts";

/**
 * Python executor for Judge0
 */
export class PythonExecutor extends BaseLanguageExecutor {
    getLanguageId(): number {
        return 71; // Python 3.8.1 (Judge0 CE)
    }

    getLanguageName(): string {
        return "python3";
    }

    processCode(code: string, testCases: unknown[], functionName: string): string {
        // Convert test cases to Python format
        let testCasesJson = JSON.stringify(testCases, null, 2);
        testCasesJson = this.convertBooleans(testCasesJson, "python");

        return `
import sys
import json

# Read test case index from stdin
test_case_index = int(sys.stdin.read().strip())

# Dynamic test cases from database/API
test_cases = ${testCasesJson}

# User code
${code}

# Execute test case
if 0 <= test_case_index < len(test_cases):
    tc = test_cases[test_case_index]
    result = Solution().${functionName}(tc["input"])
    print(json.dumps(result))
else:
    print("Invalid test case index")
`;
    }
}
