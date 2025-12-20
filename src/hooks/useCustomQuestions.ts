import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";
import { useAsyncState } from "@/shared/hooks/useAsyncState";
import { supabase } from "@/integrations/supabase/client";
import type { BehavioralQuestion, BehavioralQuestionCategory, QuestionDifficulty, EvaluationType } from "@/types";

export const useCustomQuestions = () => {
  const { user } = useAuth();
  const { loading, error, setLoading, setError } = useAsyncState();

  const createQuestion = async (
    questionText: string,
    category: BehavioralQuestionCategory[],
    difficulty: QuestionDifficulty,
    evaluationType: EvaluationType,
    customEvaluationPrompt?: string
  ): Promise<BehavioralQuestion | null> => {
    if (!user?.id) {
      setError(new Error("You must be logged in to create custom questions"));
      return null;
    }

    if (evaluationType === 'custom' && (!customEvaluationPrompt || customEvaluationPrompt.trim().length === 0)) {
      setError(new Error("Custom evaluation prompt is required when evaluation type is 'custom'"));
      return null;
    }

    // Validate word limit (500 words)
    if (customEvaluationPrompt) {
      const wordCount = customEvaluationPrompt.trim().split(/\s+/).length;
      if (wordCount > 500) {
        setError(new Error(`Custom evaluation prompt exceeds 500 words (${wordCount} words)`));
        return null;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await (supabase as unknown)
        .from("behavioral_questions")
        .insert({
          user_id: user.id,
          question_text: questionText,
          category,
          difficulty,
          evaluation_type: evaluationType,
          custom_evaluation_prompt: evaluationType === 'custom' ? customEvaluationPrompt : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        id: data.id,
        question_text: data.question_text,
        category: data.category || [],
        difficulty: data.difficulty,
        user_id: data.user_id,
        evaluation_type: data.evaluation_type || 'star',
        custom_evaluation_prompt: data.custom_evaluation_prompt || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as BehavioralQuestion;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create question");
      setError(error);
      logger.error("Error creating custom question", err, {
        component: "useCustomQuestions",
        userId: user?.id,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = async (
    questionId: string,
    updates: {
      question_text?: string;
      category?: BehavioralQuestionCategory[];
      difficulty?: QuestionDifficulty;
      evaluation_type?: EvaluationType;
      custom_evaluation_prompt?: string;
    }
  ): Promise<boolean> => {
    if (!user?.id) {
      setError(new Error("You must be logged in to update questions"));
      return false;
    }

    if (updates.evaluation_type === 'custom' && (!updates.custom_evaluation_prompt || updates.custom_evaluation_prompt.trim().length === 0)) {
      setError(new Error("Custom evaluation prompt is required when evaluation type is 'custom'"));
      return false;
    }

    // Validate word limit (500 words)
    if (updates.custom_evaluation_prompt) {
      const wordCount = updates.custom_evaluation_prompt.trim().split(/\s+/).length;
      if (wordCount > 500) {
        setError(new Error(`Custom evaluation prompt exceeds 500 words (${wordCount} words)`));
        return false;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: Record<string, unknown> = {};
      if (updates.question_text !== undefined) updateData.question_text = updates.question_text;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
      if (updates.evaluation_type !== undefined) updateData.evaluation_type = updates.evaluation_type;
      if (updates.evaluation_type === 'custom' && updates.custom_evaluation_prompt !== undefined) {
        updateData.custom_evaluation_prompt = updates.custom_evaluation_prompt;
      } else if (updates.evaluation_type !== 'custom') {
        updateData.custom_evaluation_prompt = null;
      }

      const { error: updateError } = await (supabase as unknown)
        .from("behavioral_questions")
        .update(updateData)
        .eq("id", questionId)
        .eq("user_id", user.id); // Ensure user owns the question

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update question");
      setError(error);
      logger.error("Error updating custom question", err, {
        component: "useCustomQuestions",
        userId: user?.id,
        questionId,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (questionId: string): Promise<boolean> => {
    if (!user?.id) {
      setError(new Error("You must be logged in to delete questions"));
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await (supabase as unknown)
        .from("behavioral_questions")
        .delete()
        .eq("id", questionId)
        .eq("user_id", user.id); // Ensure user owns the question

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete question");
      setError(error);
      logger.error("Error deleting custom question", err, {
        component: "useCustomQuestions",
        userId: user?.id,
        questionId,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createQuestion,
    updateQuestion,
    deleteQuestion,
    loading,
    error: error?.message || null,
  };
};

