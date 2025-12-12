/**
 * API response and payload types
 * Centralized to avoid duplication across hooks/components
 */

// Flashcard types (moved from useFlashcards for reuse)
export interface FlashcardDeck {
  id: string;
  user_id: string;
  problem_id: string;
  solution_id: string | null; // Can be null for custom solutions
  solution_code?: string; // For custom solutions
  solution_title?: string; // For custom solutions OR curated solution title
  created_at: string;
  last_reviewed_at: string | null;
  next_review_date: string;
  mastery_level: number; // 0=new, 1=learning, 2=good, 3=mastered
  review_count: number;
  ease_factor: number;
  interval_days: number;
  days_overdue?: number;
  is_custom_solution?: boolean;
  // Joined data
  problem_title?: string;
  deck_id?: string; // For due cards query
}

export interface FlashcardReview {
  id: string;
  deck_id: string;
  reviewed_at: string;
  review_questions: string[]; // Maps to ai_questions in database
  user_answers: string[]; // Maps to user_answers in database  
  evaluation_summary: string; // Maps to ai_evaluation in database
  user_difficulty_rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  time_spent_seconds?: number;
  notes?: string;
}

export interface FlashcardStats {
  totalCards: number;
  dueToday: number;
  newCards: number;
  learningCards: number;
  masteredCards: number;
  averageEaseFactor: number;
  longestStreak: number;
  currentStreak: number;
}

// TODO: Add other API types as we migrate them from individual files
// - Problem types
// - User types  
// - Chat session types
// - Coaching types
// - System design types
// - Behavioral interview types
