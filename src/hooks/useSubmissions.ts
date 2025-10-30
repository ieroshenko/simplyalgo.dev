import { useState, useEffect, useRef } from "react";
import { UserAttemptsService, UserAttempt } from "@/services/userAttempts";
import { supabase } from "@/integrations/supabase/client";

export const useSubmissions = (
  userId: string | undefined,
  problemId: string | undefined,
) => {
  const [submissions, setSubmissions] = useState<UserAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const addOrUpdateIfPassed = (attempt: UserAttempt | null | undefined) => {
    if (!attempt || attempt.status !== "passed") return;
    setSubmissions((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === attempt.id);
      if (idx !== -1) {
        next[idx] = attempt;
      } else {
        const norm = (attempt.code || "").trim();
        if (norm) {
          for (let i = next.length - 1; i >= 0; i--) {
            if ((next[i].code || "").trim() === norm) next.splice(i, 1);
          }
        }
        next.unshift(attempt);
      }
      next.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return next;
    });
  };

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
        const data = await UserAttemptsService.getAcceptedSubmissions(
          userId,
          problemId,
        );
        setSubmissions(data);
      } catch (err) {
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

  // Realtime subscription for new/updated attempts
  useEffect(() => {
    if (!userId || !problemId) return;

    // Cleanup old channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(
      `user_attempts:${userId}:${problemId}`,
    );

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_problem_attempts' },
        (payload: any) => {
          const attempt = payload.new as UserAttempt;
          if (
            attempt?.user_id === userId &&
            attempt?.problem_id === problemId
          ) {
            addOrUpdateIfPassed(attempt);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_problem_attempts' },
        (payload: any) => {
          const attempt = payload.new as UserAttempt;
          if (
            attempt?.user_id === userId &&
            attempt?.problem_id === problemId
          ) {
            // For updates, always update the submission (including complexity_analysis)
            setSubmissions((prev) => {
              const next = [...prev];
              const idx = next.findIndex((s) => s.id === attempt.id);
              if (idx !== -1) {
                next[idx] = attempt;
              } else if (attempt.status === "passed") {
                // If it's a new passed submission, add it
                addOrUpdateIfPassed(attempt);
              }
              return next;
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // eslint-disable-next-line no-console
          console.warn('Supabase realtime channel error for submissions');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, problemId]);

  const refetch = async () => {
    if (!userId || !problemId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await UserAttemptsService.getAcceptedSubmissions(
        userId,
        problemId,
      );
      setSubmissions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch submissions",
      );
    } finally {
      setLoading(false);
    }
  };

  // Expose an optimistic add helper for immediate UI updates on known success
  const optimisticAdd = (attempt: UserAttempt | null) => {
    addOrUpdateIfPassed(attempt || undefined);
  };

  return { submissions, loading, error, refetch, optimisticAdd };
};
