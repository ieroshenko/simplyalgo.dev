/**
 * Common Supabase-related type definitions
 * Used across components to handle Supabase query results and errors
 */

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface NotesData {
  id: string;
  user_id: string;
  problem_id: string;
  content: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ComplexityAnalysis {
  time_complexity: string;
  time_explanation: string;
  space_complexity: string;
  space_explanation: string;
  analysis: string;
}

export interface UserAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  code: string | null;
  language: string | null;
  status: "pending" | "passed" | "failed" | "error" | null;
  test_results: Record<string, unknown>[] | null;
  execution_time: number | null;
  memory_usage: number | null;
  created_at: string;
  updated_at: string;
  complexity_analysis: ComplexityAnalysis | null;
}

// Generic type for Supabase query results with proper error handling
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: SupabaseError | null;
}
