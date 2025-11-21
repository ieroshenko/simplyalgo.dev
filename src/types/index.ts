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
  companies?: string[]; // Array of company names
  recommendedTimeComplexity?: string;
  recommendedSpaceComplexity?: string;
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

  // Optimization availability flag
  isOptimizable?: boolean; // Flag to indicate if solution can be further optimized
}

export interface OptimizationStep {
  question: string;
  hint?: string;
  expectedChange?: 'data_structure' | 'algorithm' | 'constant_factor' | string;
  highlightArea?: CoachHighlightArea;
  codeToAdd?: string;
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
  lastOptimizationStep?: OptimizationStep | null;
  // Whether we can offer an optimization coaching path (determined at runtime)
  isOptimizable?: boolean;
  feedback: {
    show: boolean;
    type: "success" | "error" | "hint" | null;
    message: string;
    showConfetti: boolean;
  };
}

// AI Coaching Modes Types
export type CoachingMode = 'socratic' | 'comprehensive';

export interface CoachingModeState {
  currentMode: CoachingMode;
  isEnabled: boolean;
  preferences: {
    defaultMode: CoachingMode;
    rememberChoice: boolean;
  };
}

export interface CoachingModePreferences {
  defaultMode: CoachingMode;
  lastUsedMode: CoachingMode;
  rememberChoice: boolean;
  timestamp: number;
}

// Request body extensions for mode parameter
export interface RequestBody {
  message: string;
  sessionId?: string;
  problemId?: string;
  currentCode?: string;
  responseId?: string;
}

export interface ChatRequestBody extends RequestBody {
  coachingMode?: CoachingMode;
}

export interface SystemDesignSpec {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  status: "solved" | "attempted" | "not-started";
  isStarred: boolean;
  companies?: string[];
  // Fields from system_design_specs table
  summary: string;
  functional_requirements: string[];
  nonfunctional_requirements: string[];
  assumptions: string[];
  scale_estimates: Record<string, unknown>;
  constraints: string[];
  hints: string[];
  starter_canvas: Record<string, unknown>;
  rubric: {
    axes: string[];
    weights: Record<string, number>;
    must_have: string[];
  };
  coach_questions: string[];
  expected_topics: string[];
  estimated_time_minutes?: number;
}

export interface SystemDesignSession {
  id: string;
  userId: string;
  problemId: string;
  contextThreadId?: string;
  isCompleted: boolean;
  score?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface SystemDesignBoardState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface DesignEvaluation {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
}

export interface CompletenessAnalysis {
  isComplete: boolean;
  confidence: number;
  missingComponents: string[];
  missingTopics: string[];
  reasoning: string;
}

export interface NodePaletteItem {
  id: string;
  type: string;
  label: string;
  icon: string;
  color: string;
}

// Behavioral Interview Types
export type BehavioralQuestionCategory =
  | 'general'
  | 'technical_leadership'
  | 'code_review_collaboration'
  | 'debugging_problem_solving'
  | 'system_design_architecture'
  | 'technical_failure_recovery'
  | 'technical_debt_prioritization'
  | 'technical_communication'
  | 'technical_initiative'
  | 'learning_new_technologies'
  | 'code_quality_best_practices'
  | 'scaling_performance';

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SessionType = 'guided' | 'mock' | 'company_specific';

export type EvaluationType = 'star' | 'none' | 'custom';

export interface BehavioralQuestion {
  id: string;
  question_text: string;
  category: BehavioralQuestionCategory[];
  difficulty: QuestionDifficulty;
  follow_up_questions?: string[];
  key_traits?: string[];
  related_question_ids?: string[];
  company_associations?: string[];
  user_id?: string; // NULL for curated questions, user_id for custom questions
  evaluation_type?: EvaluationType; // 'star', 'none', or 'custom'
  custom_evaluation_prompt?: string; // Custom prompt when evaluation_type is 'custom' (max 500 words)
  created_at: string;
  updated_at: string;
}

export interface UserStory {
  id: string;
  user_id: string;
  title: string;
  description?: string; // Free-form experience description
  situation?: string; // Optional - can be used for structured STAR if desired
  task?: string; // Optional
  action?: string; // Optional
  result?: string; // Optional
  tags?: string[];
  technical_skills?: string[];
  technologies?: string[];
  metrics?: string;
  related_problem_ids?: string[];
  versatility_score?: number;
  last_used_at?: string;
  practice_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  company_id?: string;
  started_at: string;
  completed_at?: string;
  total_questions: number;
  average_score?: number;
}

export interface STARScore {
  situation: number;
  task: number;
  action: number;
  result: number;
}

export interface AnswerFeedback {
  strengths: string[];
  improvements: string[];
  specific_examples?: string[];
  next_steps?: string[];
}

// Custom metrics for custom evaluation type
export interface CustomMetrics {
  [key: string]: number | string; // Flexible structure for custom metrics
}

export interface PracticeAnswer {
  id: string;
  session_id: string;
  question_id: string;
  story_id?: string;
  answer_text: string;
  answer_audio_url?: string;
  transcript?: string;
  time_spent_seconds?: number;
  star_score?: STARScore; // Optional, only for 'star' evaluation type
  content_score: number;
  delivery_score: number;
  overall_score: number;
  custom_metrics?: CustomMetrics; // For 'custom' evaluation type
  feedback: AnswerFeedback;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserBehavioralStats {
  user_id: string;
  total_questions_practiced: number;
  total_stories_created: number;
  average_overall_score?: number;
  category_scores: Record<BehavioralQuestionCategory, number>;
  practice_streak: number;
  last_practiced_at?: string;
  updated_at: string;
}
