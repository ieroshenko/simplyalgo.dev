import { BaseProblemStrategy, ProblemType } from "./base.ts";

/**
 * Strategy for binary tree problems
 * Examples: Invert Binary Tree, Maximum Depth, Validate BST, etc.
 */
export class TreeStrategy extends BaseProblemStrategy {
    getType(): ProblemType {
        return ProblemType.BINARY_TREE;
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

        // Add TreeNode definition if needed
        if (/\bTreeNode\b/.test(code) && !code.includes("class TreeNode")) {
            const treeNodeDef = `# Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

`;
            processedCode = treeNodeDef + processedCode;
        }

        // Add helper functions for TreeNode operations
        if (/\bTreeNode\b/.test(code) && !code.includes("def array_to_treenode")) {
            const helperFunctions = `# Helper functions for TreeNode operations
def array_to_treenode(arr):
    if not arr or arr[0] is None:
        return None
    nodes = [None if x is None else TreeNode(x) for x in arr]
    kids = nodes[::-1]
    root = kids.pop()
    for node in nodes:
        if node is not None:
            if kids:
                node.left = kids.pop()
            if kids:
                node.right = kids.pop()
    return root

def treenode_to_array(root):
    if root is None:
        return []
    res = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            res.append(None)
        else:
            res.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    # Remove trailing Nones
    while res and res[-1] is None:
        res.pop()
    return res

def find_node(root, val):
    """Find and return the node with the given value in the tree"""
    if root is None:
        return None
    if root.val == val:
        return root
    left_result = find_node(root.left, val)
    if left_result is not None:
        return left_result
    return find_node(root.right, val)

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
        // TODO: Add TreeNode helpers for JavaScript
        return code;
    }

    private prepareJavaCode(code: string): string {
        // TODO: Add TreeNode helpers for Java
        return code;
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
            } else if (
                line.includes("class TreeNode") ||
                line.includes("def array_to_treenode") ||
                line.includes("def treenode_to_array") ||
                line.includes("def find_node")
            ) {
                inDefinition = true;
                definitions.push(line);
            } else if (
                inDefinition &&
                (line.startsWith("class ") ||
                    line.startsWith("def ") ||
                    (line.trim() === "" && definitions.length > 0))
            ) {
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

        // Check if this is a Lowest Common Ancestor problem
        const isLCAProblem =
            functionName.toLowerCase().includes("lowestcommonancestor") ||
            functionName.toLowerCase().includes("lca");

        if (isLCAProblem && params.length === 3) {
            const rootParam = params[0];
            const pParam = params[1];
            const qParam = params[2];

            return `(lambda tree: ${className}().${functionName}(tree, find_node(tree, tc["${pParam}"]), find_node(tree, tc["${qParam}"])).val)(array_to_treenode(tc["${rootParam}"]))`;
        }

        // Convert array parameters to TreeNode
        const paramList = params
            .map((p) => {
                if (/^(root\d*|tree\d*|subroot|p|q|s|t)$/i.test(p)) {
                    return `array_to_treenode(tc["${p}"])`;
                }
                return `tc["${p}"]`;
            })
            .join(", ");

        const call = `${className}().${functionName}(${paramList})`;

        // Check if function returns TreeNode (by checking signature or common patterns)
        const returnsTreeNode = /invert|construct|build|merge/.test(
            functionName.toLowerCase()
        );

        return returnsTreeNode ? `treenode_to_array(${call})` : call;
    }

    private generateJavaScriptTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement JavaScript test call generation
        return `${functionName}(tc.${params[0]})`;
    }

    private generateJavaTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement Java test call generation
        return `new Solution().${functionName}(tc.${params[0]})`;
    }
}
