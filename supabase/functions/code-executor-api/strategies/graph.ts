import { BaseProblemStrategy, ProblemType } from "./base.ts";

/**
 * Strategy for graph problems (especially clone-graph)
 * Examples: Clone Graph, Course Schedule, etc.
 */
export class GraphStrategy extends BaseProblemStrategy {
    getType(): ProblemType {
        return ProblemType.GRAPH;
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

        // Add Node definition if needed (for graph problems)
        const needsNode = /\bNode\b/.test(code) && !/\b(ListNode|TreeNode)\b/.test(code);
        if (needsNode && !code.includes("class Node")) {
            const nodeDef = `# Definition for a graph Node.
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

`;
            processedCode = nodeDef + processedCode;
        }

        // Add helper functions for graph operations
        if (needsNode && !code.includes("def adjlist_to_node")) {
            const helperFunctions = `# Helper functions for graph operations
def adjlist_to_node(adjList):
    """Convert adjacency list to graph Node"""
    if not adjList:
        return None
    
    # Create all nodes first
    nodes = {}
    for i in range(len(adjList)):
        nodes[i + 1] = Node(i + 1)
    
    # Add neighbors
    for i, neighbors in enumerate(adjList):
        node = nodes[i + 1]
        for neighbor_val in neighbors:
            node.neighbors.append(nodes[neighbor_val])
    
    return nodes.get(1)  # Return first node

def node_to_adjlist(node):
    """Convert graph Node to adjacency list"""
    if not node:
        return []
    
    # BFS to collect all nodes in order by their val
    visited = set()
    queue = [node]
    visited.add(node)
    nodes_by_val = {node.val: node}
    
    while queue:
        curr = queue.pop(0)
        for neighbor in curr.neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                nodes_by_val[neighbor.val] = neighbor
                queue.append(neighbor)
    
    # Build adjacency list in order of node values
    max_val = max(nodes_by_val.keys())
    adjList = []
    for i in range(1, max_val + 1):
        if i in nodes_by_val:
            n = nodes_by_val[i]
            neighbors = sorted([neighbor.val for neighbor in n.neighbors])
            adjList.append(neighbors)
    
    return adjList

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
        // TODO: Add Node helpers for JavaScript
        return code;
    }

    private prepareJavaCode(code: string): string {
        // TODO: Add Node helpers for Java
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
                line.includes("class Node") ||
                line.includes("def adjlist_to_node") ||
                line.includes("def node_to_adjlist")
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

        // For graph problems, usually the param is adjList or node
        const paramList = params
            .map(() => `adjlist_to_node(tc.get("adjList", tc.get("node")))`)
            .join(", ");

        const call = `${className}().${functionName}(${paramList})`;

        // Check if function returns a Node
        const returnsNode = functionName.toLowerCase().includes("clone");

        return returnsNode ? `node_to_adjlist(${call})` : call;
    }

    private generateJavaScriptTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement JavaScript test call generation
        return `${functionName}(tc.node)`;
    }

    private generateJavaTestCall(
        testCase: any,
        params: string[],
        functionName: string
    ): string {
        // TODO: Implement Java test call generation
        return `new Solution().${functionName}(tc.node)`;
    }
}
