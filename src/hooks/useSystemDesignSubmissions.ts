import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SystemDesignBoardState } from "@/types";

export interface SystemDesignSubmission {
  id: string;
  problem_id: string;
  score: number;
  evaluation_feedback: string | null;
  board_state: SystemDesignBoardState;
  completed_at: string;
  started_at: string;
}

const defaultBoardState: SystemDesignBoardState = {
  elements: [],
  appState: {},
  files: {},
};

const isSystemDesignBoardState = (
  value: unknown,
): value is SystemDesignBoardState => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SystemDesignBoardState>;

  const hasValidElements =
    candidate.elements === undefined || Array.isArray(candidate.elements);
  const hasValidNodes =
    candidate.nodes === undefined || Array.isArray(candidate.nodes);
  const hasValidEdges =
    candidate.edges === undefined || Array.isArray(candidate.edges);
  const hasValidAppState =
    candidate.appState === undefined ||
    (typeof candidate.appState === "object" && candidate.appState !== null);
  const hasValidFiles =
    candidate.files === undefined ||
    (typeof candidate.files === "object" && candidate.files !== null);

  return (
    hasValidElements &&
    hasValidNodes &&
    hasValidEdges &&
    hasValidAppState &&
    hasValidFiles
  );
};

export const useSystemDesignSubmissions = (
  userId: string | undefined,
  problemId: string | undefined,
) => {
  const [submissions, setSubmissions] = useState<SystemDesignSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!userId || !problemId) {
      if (cancelled) return;
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        if (cancelled) return;
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

        if (cancelled) return;

        if (!sessions || sessions.length === 0) {
          if (cancelled) return;
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

        if (cancelled) return;

        // Combine sessions with their board states
        const boardsMap = new Map(
          boards?.map((b) => [b.session_id, b.board_state]) || [],
        );

        const submissionsData: SystemDesignSubmission[] = sessions
          .filter((s) => boardsMap.has(s.id))
          .map((session) => {
            const rawBoardState = boardsMap.get(session.id);
            const isValidBoardState = isSystemDesignBoardState(rawBoardState);

            if (!isValidBoardState) {
              console.warn(
                "[useSystemDesignSubmissions] Invalid board state for session, using default:",
                {
                  sessionId: session.id,
                  boardState: rawBoardState,
                },
              );
            }

            const boardState: SystemDesignBoardState = isValidBoardState
              ? rawBoardState
              : defaultBoardState;

            return {
              id: session.id,
              problem_id: session.problem_id,
              score: session.score,
              evaluation_feedback: session.evaluation_feedback ?? null,
              board_state: boardState,
              completed_at: session.completed_at,
              started_at: session.started_at,
            };
          });

        if (cancelled) return;
        setSubmissions(submissionsData);
      } catch (err) {
        console.error("[useSystemDesignSubmissions] Error:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch submissions",
          );
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSubmissions();
    return () => {
      cancelled = true;
    };
  }, [userId, problemId]);

  return {
    submissions,
    loading,
    error,
  };
};
