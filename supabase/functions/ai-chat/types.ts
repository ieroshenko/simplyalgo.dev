// Shared types for AI Chat Edge Function

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
  currentEditorCode?: string;
  // Coaching mode selection
  coachingMode?: "socratic" | "comprehensive";
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

export type FlowEdge = { 
  id: string; 
  source: string; 
  target: string; 
  label?: string; 
};

export type FlowGraph = { 
  nodes: FlowNode[]; 
  edges: FlowEdge[]; 
};

// OpenAI API types
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

// Coaching system types
export interface CoachingSession {
  id: string;
  user_id: string;
  problem_id: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  current_step_number: number;
  current_question: string;
  awaiting_submission: boolean;
  is_completed: boolean;
  session_state: 'active' | 'completed' | 'paused';
  initial_code: string;
  total_steps: number;
  steps: unknown[];
}

export interface CoachingValidation {
  isCorrect: boolean;
  feedback: string;
  nextAction: "insert_and_continue" | "retry" | "hint" | "complete_session";
  codeAnalysis: {
    syntax: "valid" | "invalid";
    logic: "correct" | "incorrect" | "partial";
    efficiency: "optimal" | "acceptable" | "inefficient";
  };
  codeInsertion?: {
    insertAt: "cursor" | "function_body" | "after_line" | "before_return";
    targetLine: number;
    indentationLevel: number;
  };
  nextStep?: {
    question: string;
    expectedCodeType: "variable" | "loop" | "condition" | "expression" | "return" | "any";
    hint: string;
  };
  isOptimizable?: boolean; // Flag to indicate if solution can be further optimized
}

export interface CoachingStep {
  question: string;
  hint: string;
  expectedCodeType: "variable" | "loop" | "condition" | "expression" | "return" | "any";
  highlightArea?: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
}

// Session context management for Responses API optimization
export interface SessionContext {
  sessionId: string;
  responseId: string | null;
  isInitialized: boolean;
  contextType: 'chat' | 'coaching';
  lastCodeState: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface ContextualResponse {
  content: string;
  responseId: string;
  isNewContext: boolean;
  tokensSaved?: number;
}

// Enhanced coaching session with response context
export interface EnhancedCoachingSession extends CoachingSession {
  response_id: string | null;
  context_initialized: boolean;
  last_code_snapshot: string;
  context_created_at: string | null;
}

// Chat message with context tracking
export interface ContextualChatMessage extends ChatMessage {
  messageId: string;
  responseId: string | null;
  isContextInit: boolean;
  timestamp: string;
}

// Request body extensions for context management
export interface ContextAwareRequestBody extends RequestBody {
  // Context management fields
  previousResponseId?: string;
  forceNewContext?: boolean;
  contextType?: 'chat' | 'coaching';
  // Code change tracking
  codeSnapshot?: string;
  codeChanged?: boolean;
}
