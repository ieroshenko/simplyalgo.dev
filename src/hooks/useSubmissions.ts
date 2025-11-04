import { useState, useEffect, useRef } from "react";
import { UserAttemptsService, UserAttempt } from "@/services/userAttempts";
import { supabase } from "@/integrations/supabase/client";

// Normalize code for duplicate detection - removes all whitespace differences
const normalizeCode = (code: string | null | undefined): string => {
  if (!code) return "";
  // Remove all whitespace and normalize to compare code semantically
  return code.replace(/\s+/g, " ").trim();
};

export const useSubmissions = (
  userId: string | undefined,
  problemId: string | undefined,
) => {
  const [submissions, setSubmissions] = useState<UserAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const addOrUpdateIfPassed = (attempt: UserAttempt | null | undefined) => {
    if (!attempt || attempt.status !== "passed") {
      return;
    }

    setSubmissions((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === attempt.id);

      if (idx !== -1) {
        next[idx] = attempt;
      } else {
        const norm = normalizeCode(attempt.code);
        if (norm) {
          // Remove duplicates with same normalized code
          for (let i = next.length - 1; i >= 0; i--) {
            if (normalizeCode(next[i].code) === norm) {
              next.splice(i, 1);
            }
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
      `user_attempts_${userId}_${problemId}_${Date.now()}`,
    );

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_problem_attempts',
        },
        (payload: any) => {
          const attempt = payload.new as UserAttempt;

          // Filter client-side for our user and problem
          if (attempt?.user_id !== userId || attempt?.problem_id !== problemId) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            addOrUpdateIfPassed(attempt);
          } else if (payload.eventType === 'UPDATE') {
            // For updates, check if this is an existing submission or a new one
            setSubmissions((prev) => {
              const idx = prev.findIndex((s) => s.id === attempt.id);
              if (idx !== -1 && attempt.status === "passed") {
                // Update existing submission
                const next = [...prev];
                next[idx] = attempt;
                return next;
              } else if (idx === -1 && attempt.status === "passed") {
                // New passed submission - add it with duplicate checking
                const next = [...prev];
                const norm = normalizeCode(attempt.code);
                if (norm) {
                  // Remove duplicates based on normalized code
                  for (let i = next.length - 1; i >= 0; i--) {
                    if (normalizeCode(next[i].code) === norm && next[i].id !== attempt.id) {
                      next.splice(i, 1);
                    }
                  }
                }
                next.unshift(attempt);
                next.sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                );
                return next;
              }
              return prev;
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Supabase realtime channel error for submissions');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
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

  // Lightweight polling fallback: use when backend updates may lag or realtime is disabled
  const watchForAcceptance = (timeoutMs = 60_000, intervalMs = 2_000) => {
    if (!userId || !problemId) return;
    // Reset any prior polling
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollDeadlineRef.current = Date.now() + timeoutMs;
    pollTimerRef.current = setInterval(async () => {
      if (Date.now() > pollDeadlineRef.current) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        return;
      }
      try {
        const data = await UserAttemptsService.getAcceptedSubmissions(userId, problemId);
        // If a new item arrived, update and stop polling
        setSubmissions((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const next = [...data];
          const hasNew = next.some((n) => !prevIds.has(n.id));
          if (hasNew && pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          return next;
        });
      } catch {
        // ignore transient errors
      }
    }, intervalMs);
  };

  return { submissions, loading, error, refetch, optimisticAdd, watchForAcceptance };
};
