import { ProblemStrategy, ProblemType } from "./base.ts";
import { StandardStrategy } from "./standard.ts";
import { LinkedListStrategy } from "./linked-list.ts";
import { TreeStrategy } from "./tree.ts";
import { GraphStrategy } from "./graph.ts";
import { ClassBasedStrategy } from "./class-based.ts";
import { EncodeDecodeStrategy } from "./encode-decode.ts";

/**
 * Registry for automatically selecting the right problem strategy
 */
export class StrategyRegistry {
    private strategies: Map<ProblemType, ProblemStrategy>;
    private problemIdMap: Map<string, ProblemType>;

    constructor() {
        this.strategies = new Map();
        this.problemIdMap = new Map();

        // Register all strategies
        this.registerStrategy(new StandardStrategy());
        this.registerStrategy(new LinkedListStrategy());
        this.registerStrategy(new TreeStrategy());
        this.registerStrategy(new GraphStrategy());
        this.registerStrategy(new ClassBasedStrategy());
        this.registerStrategy(new EncodeDecodeStrategy());

        // Map specific problem IDs to strategies
        this.initializeProblemIdMap();
    }

    private registerStrategy(strategy: ProblemStrategy): void {
        this.strategies.set(strategy.getType(), strategy);
    }

    private initializeProblemIdMap(): void {
        // Linked List problems
        const linkedListProblems = [
            "reverse-linked-list",
            "merge-two-sorted-lists",
            "merge-k-sorted-lists",
            "linked-list-cycle",
            "remove-nth-node-from-end-of-list",
            "reorder-list",
            "implement-linked-list",
        ];

        linkedListProblems.forEach((id) => {
            this.problemIdMap.set(id, ProblemType.LINKED_LIST);
        });

        // Binary Tree problems
        const treeProblems = [
            "invert-binary-tree",
            "maximum-depth-of-binary-tree",
            "validate-binary-search-tree",
            "binary-tree-level-order-traversal",
            "lowest-common-ancestor-of-a-binary-search-tree",
            "subtree-of-another-tree",
            "construct-binary-tree-from-preorder-and-inorder-traversal",
            "kth-smallest-element-in-a-bst",
            "serialize-and-deserialize-binary-tree",
            "binary-tree-maximum-path-sum",
            "same-tree",
            "implement-binary-tree",
        ];

        treeProblems.forEach((id) => {
            this.problemIdMap.set(id, ProblemType.BINARY_TREE);
        });

        // Graph problems
        const graphProblems = [
            "clone-graph",
            "course-schedule",
            "number-of-islands",
            "pacific-atlantic-water-flow",
            "number-of-connected-components-in-an-undirected-graph",
            "graph-valid-tree",
            "implement-graph",
        ];

        graphProblems.forEach((id) => {
            this.problemIdMap.set(id, ProblemType.GRAPH);
        });

        // Class-based problems
        const classBasedProblems = [
            "implement-lru-cache",
            "find-median-from-data-stream",
            "add-and-search-word",
            "implement-trie-prefix-tree",
            "implement-trie",
            "implement-stack",
            "implement-queue",
            "implement-deque",
            "implement-min-heap",
            "implement-hash-map",
            "implement-union-find",
            "implement-bloom-filter",
            "implement-segment-tree",
            "implement-fenwick-tree",
        ];

        classBasedProblems.forEach((id) => {
            this.problemIdMap.set(id, ProblemType.CLASS_BASED);
        });

        // Encode/Decode problems
        const encodeDecodeProblems = [
            "encode-and-decode-strings",
        ];

        encodeDecodeProblems.forEach((id) => {
            this.problemIdMap.set(id, ProblemType.ENCODE_DECODE);
        });
    }

    /**
     * Select the appropriate strategy based on problem characteristics
     */
    selectStrategy(
        problemId: string,
        code: string,
        signature?: string
    ): ProblemStrategy {
        // Priority 1: Explicit problem ID mapping
        const mappedType = this.problemIdMap.get(problemId);
        if (mappedType) {
            const strategy = this.strategies.get(mappedType);
            if (strategy) {
                console.log(`[StrategyRegistry] Selected ${mappedType} strategy for problem ${problemId} (via ID map)`);
                return strategy;
            }
        }

        // Priority 2: Signature analysis
        if (signature) {
            if (/\bListNode\b/.test(signature)) {
                console.log(`[StrategyRegistry] Selected linked_list strategy for problem ${problemId} (via signature)`);
                return this.strategies.get(ProblemType.LINKED_LIST)!;
            }

            if (/\bTreeNode\b/.test(signature)) {
                console.log(`[StrategyRegistry] Selected binary_tree strategy for problem ${problemId} (via signature)`);
                return this.strategies.get(ProblemType.BINARY_TREE)!;
            }

            if (/\bNode\b/.test(signature) && !/\b(ListNode|TreeNode)\b/.test(signature)) {
                console.log(`[StrategyRegistry] Selected graph strategy for problem ${problemId} (via signature)`);
                return this.strategies.get(ProblemType.GRAPH)!;
            }
        }

        // Priority 3: Code analysis
        if (/\bListNode\b/.test(code)) {
            console.log(`[StrategyRegistry] Selected linked_list strategy for problem ${problemId} (via code analysis)`);
            return this.strategies.get(ProblemType.LINKED_LIST)!;
        }

        if (/\bTreeNode\b/.test(code)) {
            console.log(`[StrategyRegistry] Selected binary_tree strategy for problem ${problemId} (via code analysis)`);
            return this.strategies.get(ProblemType.BINARY_TREE)!;
        }

        if (/\bNode\b/.test(code) && !/\b(ListNode|TreeNode)\b/.test(code)) {
            console.log(`[StrategyRegistry] Selected graph strategy for problem ${problemId} (via code analysis)`);
            return this.strategies.get(ProblemType.GRAPH)!;
        }

        // Check for class-based problems (has __init__ method)
        if (/class\s+\w+\s*.*:\s*def\s+__init__/.test(code)) {
            console.log(`[StrategyRegistry] Selected class_based strategy for problem ${problemId} (via code analysis)`);
            return this.strategies.get(ProblemType.CLASS_BASED)!;
        }

        // Check for encode/decode pattern
        if (/(def\s+encode|def\s+decode)/.test(code) && code.includes("def encode") && code.includes("def decode")) {
            console.log(`[StrategyRegistry] Selected encode_decode strategy for problem ${problemId} (via code analysis)`);
            return this.strategies.get(ProblemType.ENCODE_DECODE)!;
        }

        // Default: Standard strategy
        console.log(`[StrategyRegistry] Selected standard strategy for problem ${problemId} (default)`);
        return this.strategies.get(ProblemType.STANDARD)!;
    }

    /**
     * Get a specific strategy by type
     */
    getStrategy(type: ProblemType): ProblemStrategy | undefined {
        return this.strategies.get(type);
    }

    /**
     * Register a custom problem ID mapping
     */
    registerProblemId(problemId: string, type: ProblemType): void {
        this.problemIdMap.set(problemId, type);
    }

    /**
     * Get all registered strategies
     */
    getAllStrategyTypes(): ProblemType[] {
        return Array.from(this.strategies.keys());
    }
}
