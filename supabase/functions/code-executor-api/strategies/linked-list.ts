/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseProblemStrategy, ProblemType } from "./base.ts";

/**
 * Strategy for linked list problems
 * Examples: Reverse Linked List, Merge Two Sorted Lists, etc.
 */
export class LinkedListStrategy extends BaseProblemStrategy {
    getType(): ProblemType {
        return ProblemType.LINKED_LIST;
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

        // Add ListNode definition if needed
        if (/\bListNode\b/.test(code) && !code.includes("class ListNode")) {
            const listNodeDef = `# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

`;
            processedCode = listNodeDef + processedCode;
        }

        // Add helper functions
        if (/\bListNode\b/.test(code) && !code.includes("def array_to_listnode")) {
            const helperFunctions = `# Helper functions for ListNode operations
def array_to_listnode(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for val in arr[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

def listnode_to_array(head):
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

`;
            processedCode = helperFunctions + processedCode;
        }

        // Wrap in Solution class if needed
        if (this.hasSelfParam(code) && !code.includes("class Solution")) {
            processedCode = this.wrapInSolutionClass(processedCode);
        }

        return processedCode;
    }

    private prepareJavaScriptCode(code: string): string {
        let processedCode = code;

        // Add ListNode definition
        if (/\bListNode\b/.test(code) && !code.includes("function ListNode")) {
            const listNodeDef = `// Definition for singly-linked list
function ListNode(val, next) {
    this.val = (val===undefined ? 0 : val);
    this.next = (next===undefined ? null : next);
}

// Helper functions
function arrayToListNode(arr) {
    if (!arr || arr.length === 0) return null;
    const head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}

function listNodeToArray(head) {
    const result = [];
    let current = head;
    while (current) {
        result.push(current.val);
        current = current.next;
    }
    return result;
}

`;
            processedCode = listNodeDef + processedCode;
        }

        return processedCode;
    }

    private prepareJavaCode(code: string): string {
        let processedCode = code;

        // Add ListNode definition
        if (/\bListNode\b/.test(code) && !code.includes("class ListNode")) {
            const listNodeDef = `// Definition for singly-linked list
class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

// Helper functions
class ListNodeHelper {
    static ListNode arrayToListNode(int[] arr) {
        if (arr == null || arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode current = head;
        for (int i = 1; i < arr.length; i++) {
            current.next = new ListNode(arr[i]);
            current = current.next;
        }
        return head;
    }

    static int[] listNodeToArray(ListNode head) {
        java.util.List<Integer> list = new java.util.ArrayList<>();
        ListNode current = head;
        while (current != null) {
            list.add(current.val);
            current = current.next;
        }
        return list.stream().mapToInt(i -> i).toArray();
    }
}

`;
            processedCode = listNodeDef + processedCode;
        }

        return processedCode;
    }

    private wrapInSolutionClass(code: string): string {
        const lines = code.split("\n");
        const imports: string[] = [];
        const definitions: string[] = [];
        const userCodeLines: string[] = [];

        let inDefinition = false;
        for (const line of lines) {
            if (line.startsWith("from ") || line.startsWith("import ")) {
                imports.push(line);
            } else if (line.includes("class ListNode") || line.includes("def array_to_listnode") || line.includes("def listnode_to_array")) {
                inDefinition = true;
                definitions.push(line);
            } else if (inDefinition && (line.startsWith("class ") || line.startsWith("def ") || (line.trim() === "" && definitions.length > 0))) {
                if (line.startsWith("class ") || line.startsWith("def ")) {
                    inDefinition = false;
                    userCodeLines.push(line);
                } else {
                    definitions.push(line);
                }
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

        const sections: string[] = [];
        if (imports.length > 0) sections.push(imports.join("\n"));
        if (definitions.length > 0) sections.push(definitions.join("\n"));

        return sections.join("\n\n") + "\n\nclass Solution:\n" + indentedUserCode;
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

        // Convert array parameters to ListNode
        const paramList = params.map((p) => {
            if (/^(head|list\d*|l\d+)$/i.test(p)) {
                return `array_to_listnode(tc["${p}"])`;
            }
            return `tc["${p}"]`;
        }).join(", ");

        const call = `${className}().${functionName}(${paramList})`;

        // Check if function returns ListNode
        return `listnode_to_array(${call})`;
    }

    private generateJavaScriptTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        const paramList = params.map((p) => {
            if (/^(head|list\d*|l\d+)$/i.test(p)) {
                return `arrayToListNode(tc.${p})`;
            }
            return `tc.${p}`;
        }).join(", ");

        const call = `${functionName}(${paramList})`;
        return `listNodeToArray(${call})`;
    }

    private generateJavaTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        const className = "Solution";

        const paramList = params.map((p) => {
            if (/^(head|list\d*|l\d+)$/i.test(p)) {
                return `ListNodeHelper.arrayToListNode(tc.${p})`;
            }
            return `tc.${p}`;
        }).join(", ");

        const call = `new ${className}().${functionName}(${paramList})`;
        return `ListNodeHelper.listNodeToArray(${call})`;
    }
}
