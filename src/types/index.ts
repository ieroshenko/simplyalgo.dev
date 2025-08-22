export interface TestCase {
  input: string;
  expected: string;
}

export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  stdout: string;
  stderr: string | null;
  time?: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  status: "solved" | "attempted" | "not-started";
  isStarred: boolean;
  description: string;
  functionSignature: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: TestCase[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  stats: {
    totalSolved: number;
    streak: number;
    aiSessions: number;
  };
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

// React Flow diagram types (declarative, safe to render on client)
export interface FlowNodePosition {
  x: number;
  y: number;
}
export interface FlowNodeData {
  label: string;
}
export interface FlowNode {
  id: string;
  type?: string;
  data: FlowNodeData;
  position: FlowNodePosition;
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sessionId?: string;
  codeSnippets?: CodeSnippet[];
  diagram?:
    | {
        engine: "mermaid";
        code: string; // raw mermaid DSL
        title?: string;
      }
    | {
        engine: "reactflow";
        graph: FlowGraph;
        title?: string;
      };
  suggestDiagram?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  problemId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  name: string;
  solved: number;
  total: number;
  color: string;
}

// AI Coaching System Types
export interface CoachHighlightArea {
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface CoachStep {
  id: string;
  type?: "question" | "code_prompt" | "comment_prompt";
  question: string;
  hint?: string; // AI generates single hint
  expectedKeywords?: string[]; // AI generates this
  expectedAnswer?: string;
  highlightArea?: CoachHighlightArea;
  userResponse?: string;
  isCompleted: boolean;
  feedback?: string;
  hints?: string[];
  validationCriteria?: string;
}

export interface CoachSession {
  id: string;
  problemId: string;
  userId: string;
  isActive: boolean;
  currentStep: number;
  steps: CoachStep[];
  startedAt: Date;
  completedAt?: Date;
  totalSteps: number;
  progressPercent: number;
  difficulty: "beginner" | "intermediate" | "advanced";
}

// Interactive coaching validation interfaces
export interface CoachingValidationResult {
  isCorrect: boolean;
  feedback: string;
  nextAction: 'insert_and_continue' | 'retry' | 'hint' | 'complete_session';
  codeToAdd?: string; // Corrected code to insert when student's code is wrong
  
  // Analysis details
  codeAnalysis?: {
    syntax: 'valid' | 'invalid';
    logic: 'correct' | 'incorrect' | 'partial';
    efficiency: 'optimal' | 'acceptable' | 'inefficient';
  };
  
  // For successful submissions
  codeInsertion?: {
    insertAt: 'cursor' | 'function_body' | 'after_line' | 'before_return';
    targetLine?: number;
    indentationLevel?: number;
  };
  
  // Next step generation
  nextStep?: {
    question: string;
    expectedCodeType?: 'loop' | 'condition' | 'variable' | 'expression' | 'return' | 'any';
    hint: string;
    highlightArea?: CoachHighlightArea;
  };
}

export interface CoachingResponse {
  id: string;
  sessionId: string;
  stepNumber: number;
  question: string;
  studentResponse: string;
  submittedCode: string;
  validationResult: CoachingValidationResult;
  isCorrect: boolean;
  createdAt: Date;
}

export interface InteractiveCoachSession {
  id: string;
  problemId: string;
  userId: string;
  isActive: boolean;
  currentStepNumber: number;
  currentQuestion: string;
  currentHint?: string;
  awaitingSubmission: boolean;
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
  difficulty: "beginner" | "intermediate" | "advanced";
  responses: CoachingResponse[];
  highlightArea?: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
}

export interface CoachingState {
  session: InteractiveCoachSession | null;
  isCoachModeActive: boolean;
  currentHighlight: CoachHighlightArea | null;
  showInputOverlay: boolean;
  inputPosition: { x: number; y: number } | null;
  isWaitingForResponse: boolean;
  isValidating: boolean;
  lastValidation: CoachingValidationResult | null;
  feedback: {
    show: boolean;
    type: "success" | "error" | "hint" | null;
    message: string;
    showConfetti: boolean;
  };
}
