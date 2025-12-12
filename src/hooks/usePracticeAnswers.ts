import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";
import type { PracticeAnswer } from "@/types";

export const usePracticeAnswers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the last answer for a specific question
  const getLastAnswer = useCallback(
    async (questionId: string): Promise<PracticeAnswer | null> => {
      if (!user?.id) return null;

      try {
        setLoading(true);
        // First get session IDs for this user
        const { data: sessions, error: sessionsError } = await supabase
          .from("practice_sessions")
          .select("id")
          .eq("user_id", user.id);

        if (sessionsError) throw sessionsError;
        if (!sessions || sessions.length === 0) return null;

        const sessionIds = sessions.map((s) => s.id);

        // Then get the last answer for this question from user's sessions
        const { data, error: fetchError } = await supabase
          .from("practice_answers")
          .select("*")
          .in("session_id", sessionIds)
          .eq("question_id", questionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          // If no answer found, that's okay
          if (fetchError.code === "PGRST116") {
            return null;
          }
          throw fetchError;
        }

        if (!data) return null;

        // Transform the data
        const answer: PracticeAnswer = {
          id: data.id,
          session_id: data.session_id,
          question_id: data.question_id,
          story_id: data.story_id || undefined,
          answer_text: data.answer_text,
          answer_audio_url: data.answer_audio_url || undefined,
          transcript: data.transcript || undefined,
          time_spent_seconds: data.time_spent_seconds || undefined,
          star_score: data.star_score as any || undefined,
          content_score: data.content_score || 0,
          delivery_score: data.delivery_score || 0,
          overall_score: data.overall_score || 0,
          custom_metrics: (data.feedback as any)?.custom_metrics || undefined,
          feedback: (data.feedback as any) || {
            strengths: [],
            improvements: [],
          },
          revision_count: data.revision_count || 0,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };

        return answer;
      } catch (err) {
        logger.error("Error fetching last answer", err, {
          component: "usePracticeAnswers",
          userId: user?.id,
        });
        setError(err instanceof Error ? err.message : "Failed to fetch last answer");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Get all answers with scores for questions (for displaying scores in question list)
  const getQuestionScores = useCallback(async (): Promise<Record<string, number>> => {
    if (!user?.id) return {};

    try {
      setLoading(true);
      // First get session IDs for this user
      const { data: sessions, error: sessionsError } = await supabase
        .from("practice_sessions")
        .select("id")
        .eq("user_id", user.id);

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return {};

      const sessionIds = sessions.map((s) => s.id);

      // Then get answers from user's sessions
      const { data, error: fetchError } = await supabase
        .from("practice_answers")
        .select("question_id, overall_score")
        .in("session_id", sessionIds)
        .not("question_id", "is", null)
        .not("overall_score", "is", null)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Get the latest score for each question
      const scores: Record<string, number> = {};
      const seenQuestions = new Set<string>();

      if (data) {
        for (const answer of data) {
          if (!seenQuestions.has(answer.question_id) && answer.overall_score) {
            scores[answer.question_id] = answer.overall_score;
            seenQuestions.add(answer.question_id);
          }
        }
      }

      return scores;
    } catch (err) {
      logger.error("Error fetching question scores", err, {
        component: "usePracticeAnswers",
        userId: user?.id,
      });
      setError(err instanceof Error ? err.message : "Failed to fetch question scores");
      return {};
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Get user progress stats
  const getProgress = useCallback(async (): Promise<{
    totalPracticed: number;
    totalQuestions: number;
    averageScore: number;
  }> => {
    if (!user?.id) {
      return { totalPracticed: 0, totalQuestions: 0, averageScore: 0 };
    }

    try {
      setLoading(true);
      
      // Get session IDs for this user
      const { data: sessions, error: sessionsError } = await supabase
        .from("practice_sessions")
        .select("id")
        .eq("user_id", user.id);

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) {
        return { totalPracticed: 0, totalQuestions: 0, averageScore: 0 };
      }

      const sessionIds = sessions.map((s) => s.id);

      // Get total unique questions practiced
      const { data: answersData, error: answersError } = await supabase
        .from("practice_answers")
        .select("question_id, overall_score")
        .in("session_id", sessionIds)
        .not("question_id", "is", null)
        .not("overall_score", "is", null);

      if (answersError) throw answersError;

      const uniqueQuestions = new Set<string>();
      let totalScore = 0;
      let scoreCount = 0;

      if (answersData) {
        for (const answer of answersData) {
          uniqueQuestions.add(answer.question_id);
          if (answer.overall_score) {
            totalScore += answer.overall_score;
            scoreCount++;
          }
        }
      }

      // Get total questions available
      const { data: questionsData, error: questionsError } = await supabase
        .from("behavioral_questions")
        .select("id")
        .is("user_id", null); // Only count curated questions

      if (questionsError) throw questionsError;

      const totalQuestions = questionsData?.length || 0;
      const totalPracticed = uniqueQuestions.size;
      const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

      return { totalPracticed, totalQuestions, averageScore };
    } catch (err) {
      logger.error("Error fetching progress", err, {
        component: "usePracticeAnswers",
        userId: user?.id,
      });
      setError(err instanceof Error ? err.message : "Failed to fetch progress");
      return { totalPracticed: 0, totalQuestions: 0, averageScore: 0 };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    getLastAnswer,
    getQuestionScores,
    getProgress,
    loading,
    error,
  };
};

