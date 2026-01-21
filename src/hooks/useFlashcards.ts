import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@/shared/services/notificationService";
import type { FlashcardDeck, FlashcardReview, FlashcardStats } from "@/types/api";
import type { FlashcardDeckRow, FlashcardReviewRow, FlashcardDeckWithRelations } from "@/types/supabase";
import { logger } from "@/utils/logger";


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

      const { data, error } = await supabase
        .from("flashcard_decks")
        .select(`
          *,
          problems(title),
          problem_solutions(title, code)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data as FlashcardDeckWithRelations[]) ?? []).map((deck: FlashcardDeckWithRelations) => ({
        ...deck,
        problem_title: deck.problems?.title,
        solution_title: deck.problem_solutions?.title || deck.solution_title,
        is_custom_solution: !deck.solution_id,
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

  // Get flashcard statistics using optimized RPC function
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

      // Try to use the optimized RPC function (server-side aggregation)
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_flashcard_stats", {
        p_user_id: userId,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const statsRow = rpcData[0];
        return {
          totalCards: Number(statsRow.total_cards) || 0,
          dueToday: Number(statsRow.due_today) || 0,
          newCards: Number(statsRow.new_cards) || 0,
          learningCards: Number(statsRow.learning_cards) || 0,
          masteredCards: Number(statsRow.mastered_cards) || 0,
          averageEaseFactor: Number(statsRow.average_ease_factor) || 2.5,
          longestStreak: 0, // TODO: Calculate from review history
          currentStreak: 0, // TODO: Calculate from review history
        };
      }

      // Fallback to client-side calculation if RPC not available
      logger.debug("[useFlashcards] RPC not available, using client-side stats calculation");

      const { data: decks, error } = await supabase
        .from("flashcard_decks")
        .select("mastery_level, ease_factor, next_review_date")
        .eq("user_id", userId);

      if (error) throw error;

      const totalCards = decks.length;
      const today = new Date().toISOString().split("T")[0];
      if (!today) {
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
      const dueToday = decks.filter((deck) => deck.next_review_date <= today).length;
      const newCards = decks.filter((deck) => deck.mastery_level === 0).length;
      const learningCards = decks.filter((deck) => deck.mastery_level === 1).length;
      const masteredCards = decks.filter((deck) => deck.mastery_level >= 3).length;
      const averageEaseFactor =
        decks.reduce((sum, deck) => sum + (deck.ease_factor ?? 2.5), 0) / decks.length || 2.5;

      return {
        totalCards,
        dueToday,
        newCards,
        learningCards,
        masteredCards,
        averageEaseFactor,
        longestStreak: 0,
        currentStreak: 0,
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
      const nextReviewDate = new Date().toISOString().split("T")[0];
      if (!nextReviewDate) throw new Error("Unable to generate review date");

      const insertData: Omit<FlashcardDeckRow, 'id' | 'created_at' | 'last_reviewed_at' | 'mastery_level' | 'review_count' | 'ease_factor' | 'interval_days' | 'ai_code_skeleton' | 'ai_hints' | 'ai_key_insights' | 'ai_summary' | 'notes_highlight'> = {
        user_id: userId,
        problem_id: problemId,
        solution_id: null, // Will be set below based on customSolution or solutionId
        solution_code: null, // Will be set below based on customSolution
        solution_title: null, // Will be set below based on customSolution
        next_review_date: nextReviewDate, // Due today
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
      notifications.success("Added to flashcards! Ready for review.");
    },
    onError: (error: { message?: string; code?: string } | unknown) => {
      logger.error("[useFlashcards] Error adding to flashcards:", error);
      const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error';
      const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;

      if (errorCode === "23505") {
        notifications.error("This problem is already in your flashcards.");
      } else {
        notifications.error("Failed to add to flashcards. Please try again.");
      }
    },
  });

  // Remove a problem from flashcards
  const removeFromFlashcards = useMutation({
    mutationFn: async (deckId: string) => {
      if (!userId) throw new Error("User not authenticated");
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
      notifications.success("Removed from flashcards.");
    },
    onError: (error: { message?: string } | unknown) => {
      logger.error("[useFlashcards] Error removing from flashcards:", error);
      const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error';
      notifications.error("Failed to remove from flashcards. Please try again.");
    },
  });

  // Submit a flashcard review
  const submitReview = useMutation({
    mutationFn: async ({
      deckId,
      reviewQuestions,
      userAnswers,
      evaluationSummary,
      difficultyRating,
      timeSpent,
      notes,
    }: {
      deckId: string;
      reviewQuestions: string[];
      userAnswers: string[];
      evaluationSummary: string;
      difficultyRating: number;
      timeSpent?: number;
      notes?: string;
    }) => {
      // First, create the review record
      const { error: reviewError } = await supabase
        .from("flashcard_reviews")
        .insert({
          deck_id: deckId,
          ai_questions: reviewQuestions, // Map to actual database column
          user_answers: userAnswers,
          ai_evaluation: evaluationSummary, // Map to actual database column
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
      notifications.success("Review submitted successfully!");
    },
    onError: (error: { message?: string } | unknown) => {
      logger.error("[useFlashcards] Error submitting review:", error);
      const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error';
      notifications.error("Failed to submit review. Please try again.");
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