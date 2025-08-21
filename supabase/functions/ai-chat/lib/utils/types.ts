// Shared TypeScript types for the ai-chat edge function

// Core types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

export interface RequestBody {
  message?: string;
  conversationHistory?: ChatMessage[];
  // Optional action for smart insertion or clearing chat
  action?: "insert_snippet" | "clear_chat" | "generate_visualization" | "start_interactive_coaching" | "validate_coaching_submission";
  // Optional explicit diagram request
  diagram?: boolean;
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
  difficulty?: "beginner" | "intermediate" | "advanced";
  problemDescription?: string;
  stepId?: string;
  userResponse?: string;
  // For coaching submission validation
  studentCode?: string;
  studentResponse?: string;
  currentEditorCode?: string;
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

// React Flow types
export type FlowNode = {
  id: string;
  type?: string;
  data: { label: string };
  position: { x: number; y: number };
};
export type FlowEdge = { id: string; source: string; target: string; label?: string };
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

// OpenAI Responses API types
export type ResponsesApiRequest = {
  model: string;
  input: string;
  max_output_tokens?: number;
  reasoning?: { effort: "minimal" | "medium" | "high" };
  text?: {
    verbosity?: "low" | "medium" | "high";
    format?: { type: "json_object" };
  };
};

export type ResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: { value?: string } | string }>;
  }>;
  choices?: Array<{ message?: { content?: string } }>;
};