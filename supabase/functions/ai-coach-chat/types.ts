export interface CodeSnippet {
    id: string;
    code: string;
    language: string;
    isValidated: boolean;
    insertionType: "smart" | "cursor" | "append" | "prepend" | "replace";
    insertionHint?: {
        type: "import" | "variable" | "function" | "statement" | "class";
        scope: "global" | "function" | "class";
        description: string;
    };
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}


export interface RequestBody {
    message?: string;
    conversationHistory?: ChatMessage[];
    // Optional action for smart insertion or clearing chat
    action?: "insert_snippet" | "clear_chat" | "generate_visualization";
    // Preferred engines order for diagram generation
    preferredEngines?: Array<"reactflow" | "mermaid">;
    // Payload for insertion
    code?: string;
    snippet?: CodeSnippet;
    cursorPosition?: { line: number; column: number };
    // Optional problem test cases to condition the tutor (will be executed on Judge0)
    testCases?: unknown[];
    // Current code in the editor for context-aware responses
    currentCode?: string;
    // For clear_chat action
    sessionId?: string;
    userId?: string;
    // For visualization generation
    problem?: {
        title: string;
        description: string;
        examples: Array<{
            input: string;
            output: string;
            explanation?: string;
        }>;
        category: string;
        difficulty: string;
        functionSignature?: string;
    };
    // For coaching actions
    problemId?: string;
    problemDescription?: string;
    // Coaching mode selection
    coachingMode?: "socratic" | "comprehensive";
    previousResponseId?: string | null;
}


export interface AIResponse {
    response: string;
    codeSnippets?: CodeSnippet[];
    diagram?:
    | { engine: "mermaid"; code: string; title?: string }
    | {
        engine: "reactflow";
        graph: {
            nodes: Array<{
                id: string;
                type?: string;
                data: { label: string };
                position: { x: number; y: number };
            }>;
            edges: Array<{
                id: string;
                source: string;
                target: string;
                label?: string;
            }>;
        };
        title?: string;
    };
    suggestDiagram?: boolean;
    diagramDebug?: {
        tried: Array<"reactflow" | "mermaid">;
        reactflow?: { ok: boolean; reason?: string };
        mermaid?: { ok: boolean; reason?: string };
    };
    visualizationComponent?: {
        code: string;
        title: string;
    };
}