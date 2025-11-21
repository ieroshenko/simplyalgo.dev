import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SystemDesignBoardState } from "@/types";

export interface SystemDesignSubmission {
  id: string;
  problem_id: string;
  score: number;
  evaluation_feedback: string;
  board_state: SystemDesignBoardState;
  completed_at: string;
  started_at: string;
}

export const useSystemDesignSubmissions = (
  userId: string | undefined,
  problemId: string | undefined,
) => {
  const [submissions, setSubmissions] = useState<SystemDesignSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !problemId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch completed sessions with their board states
        const { data: sessions, error: sessionsError } = await supabase
          .from("system_design_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("problem_id", problemId)
          .eq("is_completed", true)
          .not("score", "is", null)
          .order("completed_at", { ascending: false });

        if (sessionsError) throw sessionsError;

        if (!sessions || sessions.length === 0) {
          setSubmissions([]);
          setLoading(false);
          return;
        }

        // Fetch board states for all sessions
        const sessionIds = sessions.map((s) => s.id);
        const { data: boards, error: boardsError } = await supabase
          .from("system_design_boards")
          .select("session_id, board_state")
          .in("session_id", sessionIds);

        if (boardsError) throw boardsError;

        // Combine sessions with their board states
        const boardsMap = new Map(
          boards?.map((b) => [b.session_id, b.board_state]) || [],
        );

        const submissionsData: SystemDesignSubmission[] = sessions
          .filter((s) => boardsMap.has(s.id))
          .map((session) => ({
            id: session.id,
            problem_id: session.problem_id,
            score: session.score,
            evaluation_feedback: session.evaluation_feedback || "",
            board_state: boardsMap.get(session.id) as SystemDesignBoardState,
            completed_at: session.completed_at,
            started_at: session.started_at,
          }));

        setSubmissions(submissionsData);
      } catch (err) {
        console.error("[useSystemDesignSubmissions] Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch submissions",
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [userId, problemId]);

  return {
    submissions,
    loading,
    error,
  };
};
