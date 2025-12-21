import { useState, useEffect, useRef, useCallback } from "react";
import { UserAttemptsService, UserAttempt } from "@/services/userAttempts";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCode } from "@/utils/code";
import { useAsyncState } from "@/shared/hooks/useAsyncState";
import { logger } from "@/utils/logger";

// Use shared normalizeCode from utils

export const useSubmissions = (
  userId: string | undefined,
  problemId: string | undefined,
) => {
  // Keep submissions as separate state since it needs special update handling
  const [submissions, setSubmissions] = useState<UserAttempt[]>([]);
  // Use useAsyncState for loading/error management
  const { loading, setLoading, error, setError } = useAsyncState();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const addOrUpdateIfPassed = useCallback((attempt: UserAttempt | null | undefined) => {
    if (!attempt || attempt.status !== "passed") {
      return;
    }

    setSubmissions((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === attempt.id);

      if (idx !== -1) {
        next[idx] = attempt;
      } else {
        // Centralized duplicate removal by normalized code
        removeDuplicatesByCode(next, attempt);
        next.unshift(attempt);
      }
      next.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return next;
    });
  }, []);

  // Helper: remove submissions that have the same normalized code as newAttempt
  const removeDuplicatesByCode = (
    arr: UserAttempt[],
    newAttempt: UserAttempt,
  ): UserAttempt[] => {
    const norm = normalizeCode(newAttempt.code);
    if (!norm) return arr;
    for (let i = arr.length - 1; i >= 0; i--) {
      const sameCode = normalizeCode(arr[i].code) === norm;
      const sameId = arr[i].id === newAttempt.id;
      if (sameCode && !sameId) {
        arr.splice(i, 1);
      }
    }
    return arr;
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
        const error = err instanceof Error ? err : new Error("Failed to fetch submissions");
        setError(error);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [userId, problemId, setLoading, setError]);

  // Realtime subscription for new/updated attempts
  useEffect(() => {
    if (!userId || !problemId) return;

    logger.info("Setting up realtime subscription", {
      component: "useSubmissions",
      userId,
      problemId,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      isProduction: !import.meta.env.DEV
    });

    // Cleanup old channel first
    if (channelRef.current) {
      logger.debug("Cleaning up old channel", { component: "useSubmissions" });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Use stable channel name (without timestamp) to prevent reconnection loops
    const channel = supabase.channel(
      `user_attempts_${userId}_${problemId}`,
    );

    // Subscribe only to INSERT events for this user. Keep a minimal problemId guard.
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_problem_attempts',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: UserAttempt; old: UserAttempt | null; eventType: string }) => {
        logger.debug("INSERT event received", { component: "useSubmissions", payload });
        const attempt = payload.new;
        if (!attempt) {
          logger.debug("INSERT: No attempt data", { component: "useSubmissions" });
          return;
        }
        if (attempt.problem_id !== problemId) {
          logger.debug("INSERT: Wrong problem_id", { component: "useSubmissions", received: attempt.problem_id, expected: problemId });
          return;
        }
        logger.debug("INSERT: Adding attempt", { component: "useSubmissions", id: attempt.id, status: attempt.status, problemId: attempt.problem_id });
        addOrUpdateIfPassed(attempt);
      },
    );

    // Subscribe only to UPDATE events for this user. Keep a minimal problemId guard.
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_problem_attempts',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: UserAttempt; old: UserAttempt | null; eventType: string }) => {
        const attempt = payload.new;
        if (!attempt || attempt.problem_id !== problemId) return;

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
            const next = removeDuplicatesByCode([...prev], attempt);
            next.unshift(attempt);
            next.sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );
            return next;
          }
          return prev;
        });
      },
    );

    channel.subscribe((status, err) => {
      logger.debug("Channel subscription status", { component: "useSubmissions", status });
      if (status === 'SUBSCRIBED') {
        logger.debug("Successfully subscribed to realtime", { component: "useSubmissions", userId, problemId });
      }
      if (status === 'CHANNEL_ERROR') {
        logger.error("Supabase realtime channel error for submissions", {
          error: err,
          component: "useSubmissions",
          status,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          userId: userId?.substring(0, 8) + '...', // Partial ID for privacy
          problemId,
          channelName: `user_attempts_${userId}_${problemId}`
        });
      }
      if (status === 'TIMED_OUT') {
        logger.error("Channel subscription timed out", err, { component: "useSubmissions", status });
      }
    });

    channelRef.current = channel;

    return () => {
      logger.debug("Cleaning up realtime subscription (effect cleanup)", { component: "useSubmissions", userId, problemId });
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [userId, problemId, addOrUpdateIfPassed]);

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
      const error = err instanceof Error ? err : new Error("Failed to fetch submissions");
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  // Expose an optimistic add helper for immediate UI updates on known success
  const optimisticAdd = (attempt: UserAttempt | null) => {
    logger.debug("Optimistic add called", { component: "useSubmissions", hasAttempt: !!attempt, attemptId: attempt?.id, status: attempt?.status, problemId: attempt?.problem_id });
    addOrUpdateIfPassed(attempt || undefined);
  };

  // Lightweight polling fallback: use when backend updates may lag or realtime is disabled
  const watchForAcceptance = (timeoutMs = 60_000, intervalMs = 2_000) => {
    logger.debug("Starting watchForAcceptance polling", { component: "useSubmissions", timeoutMs, intervalMs, userId, problemId });
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
        logger.debug("Polling fetch result", { component: "useSubmissions", count: data.length, timeRemaining: pollDeadlineRef.current - Date.now() });
        // If a new item arrived, update and stop polling
        setSubmissions((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const next = [...data];
          const hasNew = next.some((n) => !prevIds.has(n.id));
          if (hasNew) {
            logger.debug("New submission detected via polling! Stopping poll.", { component: "useSubmissions" });
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
          return next;
        });
      } catch (err) {
        logger.warn("Polling fetch error", { component: "useSubmissions", error: err });
      }
    }, intervalMs);
  };

  return { submissions, loading, error, refetch, optimisticAdd, watchForAcceptance };
};
