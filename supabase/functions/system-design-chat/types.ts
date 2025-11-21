// Types for System Design Chat Edge Function

export interface SystemDesignRequest {
  action: "start_design_session" | "update_board_state" | "coach_message" | "react_to_board_changes" | "evaluate_final_design";
  problemId?: string;
  userId?: string;
  sessionId?: string;
  message?: string;
  boardState?: {
    nodes: Array<{
      id: string;
      type?: string;
      data: { label: string; note?: string };
      position: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  };
}

export interface SystemDesignSession {
  id: string;
  userId: string;
  problemId: string;
  contextThreadId?: string;
  isCompleted: boolean;
  score?: number;
  startedAt: string;
  completedAt?: string;
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

export interface SystemDesignResponse {
  sessionId?: string;
  message?: string;
  contextThreadId?: string;
  boardState?: {
    nodes: Array<{
      id: string;
      type?: string;
      data: { label: string; note?: string };
      position: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  };
  evaluation?: DesignEvaluation;
  completeness?: CompletenessAnalysis;
  error?: string;
}

