import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  ai_questions: any[];
  user_answers: any[];
  ai_evaluation: any;
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

export const useFlashcards = (userId?: string) => {
  const queryClient = useQueryClient();

  // Get all flashcard decks for a user
  const {
    data: flashcards = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["flashcards", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await (supabase as any)
        .from("flashcard_decks")
        .select(`
          *,
          problems!inner(title),
          problem_solutions!inner(title)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data as any[]) ?? []).map((deck: any) => ({
        ...deck,
        problem_title: deck.problems?.title,
        solution_title: deck.problem_solutions?.title,
      })) as FlashcardDeck[];
    },
    enabled: !!userId,
  });

  // Get cards due for review
  const { data: dueCards = [] } = useQuery({
    queryKey: ["flashcards-due", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc("get_cards_due_for_review", {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as FlashcardDeck[];
    },
    enabled: !!userId,
  });

  // Get flashcard statistics
  const { data: stats } = useQuery({
    queryKey: ["flashcard-stats", userId],
    queryFn: async (): Promise<FlashcardStats> => {
      if (!userId) {
        return {
          totalCards: 0,
          dueToday: 0,
          newCards: 0,
          learningCards: 0,
          masteredCards: 0,
          averageEaseFactor: 2.5,
          longestStreak: 0,
          currentStreak: 0,
        };
      }

      const { data: decks, error } = await supabase
        .from("flashcard_decks")
        .select("mastery_level, ease_factor, next_review_date")
        .eq("user_id", userId);

      if (error) throw error;

      const totalCards = decks.length;
      const today = new Date().toISOString().split("T")[0];
      const dueToday = decks.filter((deck) => deck.next_review_date <= today).length;
      const newCards = decks.filter((deck) => deck.mastery_level === 0).length;
      const learningCards = decks.filter((deck) => deck.mastery_level === 1).length;
      const masteredCards = decks.filter((deck) => deck.mastery_level === 3).length;
      const averageEaseFactor =
        decks.reduce((sum, deck) => sum + deck.ease_factor, 0) / decks.length || 2.5;

      // TODO: Calculate streak data from review history
      const longestStreak = 0;
      const currentStreak = 0;

      return {
        totalCards,
        dueToday,
        newCards,
        learningCards,
        masteredCards,
        averageEaseFactor,
        longestStreak,
        currentStreak,
      };
    },
    enabled: !!userId,
  });

  // Check if a problem is already in flashcards
  const isInFlashcards = (problemId: string): boolean => {
    return flashcards.some((card) => card.problem_id === problemId);
  };

  // Add a problem to flashcards
  const addToFlashcards = useMutation({
    mutationFn: async ({
      problemId,
      solutionId,
      customSolution,
    }: {
      problemId: string;
      solutionId?: string;
      customSolution?: {
        code: string;
        title: string;
      };
    }) => {
      if (!userId) throw new Error("User not authenticated");

      // Determine if this is a curated solution or custom solution
      const insertData: any = {
        user_id: userId,
        problem_id: problemId,
        next_review_date: new Date().toISOString().split("T")[0], // Due today
      };

      if (customSolution) {
        // Custom solution from submission
        insertData.solution_code = customSolution.code;
        insertData.solution_title = customSolution.title;
      } else if (solutionId) {
        // Curated solution
        insertData.solution_id = solutionId;
      } else {
        throw new Error("Either solutionId or customSolution must be provided");
      }

      const { data, error } = await supabase
        .from("flashcard_decks")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcards-due", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcard-stats", userId] });
      toast.success("Added to flashcards! Ready for review.");
    },
    onError: (error: any) => {
      console.error("Error adding to flashcards:", error);
      if (error.code === "23505") {
        toast.error("This problem is already in your flashcards.");
      } else {
        toast.error("Failed to add to flashcards. Please try again.");
      }
    },
  });

  // Remove a problem from flashcards
  const removeFromFlashcards = useMutation({
    mutationFn: async (deckId: string) => {
      const { error } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", deckId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcards-due", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcard-stats", userId] });
      toast.success("Removed from flashcards.");
    },
    onError: (error) => {
      console.error("Error removing from flashcards:", error);
      toast.error("Failed to remove from flashcards. Please try again.");
    },
  });

  // Submit a flashcard review
  const submitReview = useMutation({
    mutationFn: async ({
      deckId,
      aiQuestions,
      userAnswers,
      aiEvaluation,
      difficultyRating,
      timeSpent,
      notes,
    }: {
      deckId: string;
      aiQuestions: any[];
      userAnswers: any[];
      aiEvaluation: any;
      difficultyRating: number;
      timeSpent?: number;
      notes?: string;
    }) => {
      // First, create the review record
      const { error: reviewError } = await supabase
        .from("flashcard_reviews")
        .insert({
          deck_id: deckId,
          ai_questions: aiQuestions,
          user_answers: userAnswers,
          ai_evaluation: aiEvaluation,
          user_difficulty_rating: difficultyRating,
          time_spent_seconds: timeSpent,
          notes,
        });

      if (reviewError) throw reviewError;

      // Then update the flashcard scheduling
      const { error: scheduleError } = await supabase.rpc(
        "update_flashcard_schedule",
        {
          p_deck_id: deckId,
          p_difficulty_rating: difficultyRating,
        }
      );

      if (scheduleError) throw scheduleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcards-due", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcard-stats", userId] });
      toast.success("Review submitted successfully!");
    },
    onError: (error) => {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    },
  });

  return {
    // Data
    flashcards,
    dueCards,
    stats,
    
    // Loading states
    isLoading,
    error,
    
    // Helper functions
    isInFlashcards,
    
    // Mutations
    addToFlashcards: addToFlashcards.mutate,
    removeFromFlashcards: removeFromFlashcards.mutate,
    submitReview: submitReview.mutate,
    
    // Loading states for mutations
    isAddingToFlashcards: addToFlashcards.isPending,
    isRemovingFromFlashcards: removeFromFlashcards.isPending,
    isSubmittingReview: submitReview.isPending,
  };
};