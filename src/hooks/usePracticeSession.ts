import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PracticeSession, PracticeAnswer, SessionType } from "@/types";

export const usePracticeSession = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(
    async (sessionType: SessionType, companyId?: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        setLoading(true);
        const { data, error: insertError } = await supabase
          .from("practice_sessions")
          .insert({
            user_id: user.id,
            session_type: sessionType,
            company_id: companyId || null,
            total_questions: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const session: PracticeSession = {
          id: data.id,
          user_id: data.user_id,
          session_type: data.session_type as SessionType,
          company_id: data.company_id || undefined,
          started_at: data.started_at,
          completed_at: data.completed_at || undefined,
          total_questions: data.total_questions,
          average_score: data.average_score ? Number(data.average_score) : undefined,
        };

        setCurrentSession(session);
        return session;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create session";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const submitAnswer = useCallback(
    async (
      questionId: string,
      answerText: string,
      storyId?: string,
      timeSpentSeconds?: number
    ) => {
      if (!user?.id || !currentSession) throw new Error("No active session");

      try {
        setLoading(true);
        const { data, error: insertError } = await supabase
          .from("practice_answers")
          .insert({
            session_id: currentSession.id,
            question_id: questionId,
            story_id: storyId || null,
            answer_text: answerText,
            time_spent_seconds: timeSpentSeconds || null,
            star_score: {}, // Will be filled by AI feedback
            content_score: 0, // Will be filled by AI feedback
            delivery_score: 0, // Will be filled by AI feedback
            overall_score: 0, // Will be filled by AI feedback
            feedback: {}, // Will be filled by AI feedback
            revision_count: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update session total_questions
        await supabase
          .from("practice_sessions")
          .update({ total_questions: currentSession.total_questions + 1 })
          .eq("id", currentSession.id);

        // Update story practice_count and last_used_at if a story was used
        if (storyId) {
          // Get current practice_count
          const { data: storyData, error: storyFetchError } = await supabase
            .from("user_stories")
            .select("practice_count")
            .eq("id", storyId)
            .single();

          if (!storyFetchError && storyData) {
            const newPracticeCount = (storyData.practice_count || 0) + 1;
            await supabase
              .from("user_stories")
              .update({
                practice_count: newPracticeCount,
                last_used_at: new Date().toISOString(),
              })
              .eq("id", storyId);
          }
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to submit answer";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, currentSession]
  );

  const updateAnswerFeedback = useCallback(
    async (
      answerId: string,
      feedback: {
        star_score?: { situation: number; task: number; action: number; result: number };
        content_score: number;
        delivery_score: number;
        overall_score: number;
        custom_metrics?: Record<string, number | string>;
        feedback: {
          strengths: string[];
          improvements: string[];
          specific_examples?: string[];
          next_steps?: string[];
        };
      }
    ) => {
      try {
        setLoading(true);
        const updateData: any = {
          content_score: feedback.content_score,
          delivery_score: feedback.delivery_score,
          overall_score: feedback.overall_score,
          feedback: feedback.feedback,
        };

        // Only include star_score if it exists
        if (feedback.star_score) {
          updateData.star_score = feedback.star_score;
        }

        // Store custom_metrics in feedback JSONB as a separate key
        // When reading back, extract custom_metrics from feedback.custom_metrics if present
        if (feedback.custom_metrics) {
          updateData.feedback = {
            ...feedback.feedback,
            custom_metrics: feedback.custom_metrics,
          };
        }

        const { error: updateError } = await supabase
          .from("practice_answers")
          .update(updateData)
          .eq("id", answerId);

        if (updateError) throw updateError;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update answer feedback";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const completeSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      // Calculate average score from all answers
      const { data: answers, error: fetchError } = await supabase
        .from("practice_answers")
        .select("overall_score")
        .eq("session_id", currentSession.id);

      if (fetchError) throw fetchError;

      const averageScore =
        answers && answers.length > 0
          ? answers.reduce((sum, a) => sum + (a.overall_score || 0), 0) / answers.length
          : null;

        const { error: updateError } = await supabase
          .from("practice_sessions")
          .update({
          completed_at: new Date().toISOString(),
          average_score: averageScore,
        })
        .eq("id", currentSession.id);

      if (updateError) throw updateError;

      setCurrentSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to complete session";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  const resetSession = useCallback(() => {
    setCurrentSession(null);
    setError(null);
  }, []);

  return {
    currentSession,
    loading,
    error,
    createSession,
    submitAnswer,
    updateAnswerFeedback,
    completeSession,
    resetSession,
  };
};

