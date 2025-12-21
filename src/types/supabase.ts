/**
 * Supabase database row types
 * These represent the actual database schema for type-safe queries
 */
import type { Database } from "@/integrations/supabase/types";

// Re-export generated types for convenience
export type { Database } from "@/integrations/supabase/types";

// Type aliases for commonly used table rows
export type FlashcardDeckRow = Database['public']['Tables']['flashcard_decks']['Row'];
export type FlashcardReviewRow = Database['public']['Tables']['flashcard_reviews']['Row'];
export type BehavioralQuestionRow = Database['public']['Tables']['behavioral_questions']['Row'];
export type UserStoryRow = Database['public']['Tables']['user_stories']['Row'];
// Note: custom_questions table doesn't exist in current schema

// Joined types for complex queries
export interface FlashcardDeckWithRelations {
  id: string;
  user_id: string;
  problem_id: string;
  solution_id: string | null;
  solution_code?: string;
  solution_title?: string;
  created_at: string;
  last_reviewed_at: string | null;
  next_review_date: string;
  mastery_level: number;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  days_overdue?: number;
  is_custom_solution?: boolean;
  // Joined from problems table
  problems?: {
    title: string;
  };
  // Joined from problem_solutions table
  problem_solutions?: {
    title: string;
    code: string;
  };
}

// Generic Supabase query result type
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}
