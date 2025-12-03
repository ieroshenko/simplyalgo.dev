/**
 * EXAMPLE: How to integrate the new Strategy Pattern architecture
 * 
 * This shows how to use the new executor in index.ts
 * Can be enabled via feature flag for gradual rollout
 */

import { StrategyRegistry } from "./strategies/registry.ts";
import { ExecutorRegistry } from "./executors/registry.ts";

// Initialize registries (do this once at startup)
const strategyRegistry = new StrategyRegistry();
const executorRegistry = new ExecutorRegistry();

/**
 * New execution flow using Strategy Pattern
 */
export async function executeCodeWithStrategy(
    language: string,
    code: string,
    problemId: string,
    testCases: any[],
    functionSignature?: string
) {
    console.log(`[NEW EXECUTOR] Processing ${language} code for problem ${problemId}`);

    // Step 1: Select the right strategy based on problem characteristics
    const strategy = strategyRegistry.selectStrategy(problemId, code, functionSignature);
    console.log(`[NEW EXECUTOR] Selected strategy: ${strategy.getType()}`);

    // Step 2: Get the language executor
    const executor = executorRegistry.getExecutor(language);
    console.log(`[NEW EXECUTOR] Using executor: ${executor.getLanguageName()}`);

    // Step 3: Prepare code with strategy (adds helpers, imports, etc.)
    const preparedCode = strategy.prepareCode(code, language);
    console.log(`[NEW EXECUTOR] Code prepared (${preparedCode.length} chars)`);

    // Step 4: For each test case, generate test execution code
    const submissions = testCases.map((testCase, index) => {
        // Extract function name from code
        const functionNameMatch = code.match(/def\s+(\w+)\s*\(/) ||
            code.match(/function\s+(\w+)\s*\(/) ||
            code.match(/public\s+\w+\s+(\w+)\s*\(/);
        const functionName = functionNameMatch ? functionNameMatch[1] : "solution";

        // Get parameter names from test case
        const params = Object.keys(testCase.input || {});

        // Generate test call for this specific test case
        const testCall = strategy.generateTestCall(testCase, params, functionName, language);

        // Build complete test harness
        const fullCode = executor.processCode(preparedCode, [testCase], functionName);

        return {
            language_id: executor.getLanguageId(),
            source_code: btoa(fullCode), // Base64 encode
            stdin: btoa(String(index)),
            expected_output: testCase.expected ? btoa(JSON.stringify(testCase.expected)) : undefined,
        };
    });

    console.log(`[NEW EXECUTOR] Generated ${submissions.length} test submissions`);

    return {
        submissions,
        strategy: strategy.getType(),
        executor: executor.getLanguageName(),
    };
}

/**
 * Example usage in main handler
 */
export function exampleUsageInIndex() {
    // In your POST handler:

    const { language, code, problemId, testCases } = requestBody;

    // Feature flag for gradual rollout
    const useNewExecutor = Deno.env.get("USE_NEW_EXECUTOR") === "true";

    if (useNewExecutor) {
        // Use new Strategy Pattern architecture
        const result = await executeCodeWithStrategy(
            language,
            code,
            problemId,
            testCases,
            problem?.function_signature
        );

        // Submit to Judge0 as before
        const response = await fetch(`${JUDGE0_API_URL}/submissions/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissions: result.submissions }),
        });

        // ... rest of existing logic
    } else {
        // Use old monolithic code (fallback)
        // ... existing code
    }
}

/**
 * Language-specific examples
 */

// Example 1: Python Linked List
const pythonLinkedList = `
def reverseList(self, head: ListNode) -> ListNode:
    prev = None
    while head:
        next_node = head.next
        head.next = prev
        prev = head
        head = next_node
    return prev
`;

const pythonLinkedListStrategy = strategyRegistry.selectStrategy(
    "reverse-linked-list",
    pythonLinkedList
);
// Auto-selects LinkedListStrategy
// Adds ListNode definition and helpers

// Example 2: JavaScript Two Sum
const jsTwoSum = `
function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}
`;

const jsTwoSumStrategy = strategyRegistry.selectStrategy("two-sum", jsTwoSum);
// Auto-selects StandardStrategy
// No special preprocessing needed

// Example 3: Java Binary Search
const javaBinarySearch = `
class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`;

const javaBinarySearchStrategy = strategyRegistry.selectStrategy(
    "binary-search",
    javaBinarySearch
);
// Auto-selects StandardStrategy
// Preserves class structure

/**
 * Migration checklist for index.ts:
 * 
 * 1. ✅ Add imports for registries
 * 2. ✅ Initialize registries at startup
 * 3. ✅ Add feature flag check
 * 4. ✅ Call executeCodeWithStrategy() in new flow
 * 5. ✅ Keep old code as fallback
 * 6. ✅ Test with Python, JS, and Java
 * 7. ✅ Monitor error rates
 * 8. ✅ Gradually increase traffic to new flow
 * 9. ⏳ Remove old code once stable
 */
