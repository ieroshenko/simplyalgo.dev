import { useState, useEffect, useRef } from "react";
import { UserAttemptsService, UserAttempt } from "@/services/userAttempts";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCode } from "@/utils/code";

// Use shared normalizeCode from utils

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
  };

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

    console.log('[useSubmissions] 🔌 Setting up realtime subscription', { userId, problemId });

    // Cleanup old channel first
    if (channelRef.current) {
      console.log('[useSubmissions] 🧹 Cleaning up old channel');
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
      (payload: any) => {
        console.log('[useSubmissions] INSERT event received:', payload);
        const attempt = payload.new as UserAttempt;
        if (!attempt) {
          console.log('[useSubmissions] INSERT: No attempt data');
          return;
        }
        if (attempt.problem_id !== problemId) {
          console.log('[useSubmissions] INSERT: Wrong problem_id', {
            received: attempt.problem_id,
            expected: problemId
          });
          return;
        }
        console.log('[useSubmissions] INSERT: Adding attempt', {
          id: attempt.id,
          status: attempt.status,
          problemId: attempt.problem_id
        });
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
      (payload: any) => {
        const attempt = payload.new as UserAttempt;
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

    channel.subscribe((status) => {
        console.log('[useSubmissions] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[useSubmissions] ✅ Successfully subscribed to realtime for user:', userId, 'problem:', problemId);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[useSubmissions] ❌ Supabase realtime channel error for submissions');
        }
        if (status === 'TIMED_OUT') {
          console.error('[useSubmissions] ⏱️ Channel subscription timed out');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[useSubmissions] 🔌 Cleaning up realtime subscription (effect cleanup)', { userId, problemId });
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
    console.log('[useSubmissions] 🚀 Optimistic add called', { 
      hasAttempt: !!attempt, 
      attemptId: attempt?.id,
      status: attempt?.status,
      problemId: attempt?.problem_id 
    });
    addOrUpdateIfPassed(attempt || undefined);
  };

  // Lightweight polling fallback: use when backend updates may lag or realtime is disabled
  const watchForAcceptance = (timeoutMs = 60_000, intervalMs = 2_000) => {
    console.log('[useSubmissions] 🔄 Starting watchForAcceptance polling', { timeoutMs, intervalMs, userId, problemId });
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
        console.log('[useSubmissions] 📥 Polling fetch result:', { count: data.length, timeRemaining: pollDeadlineRef.current - Date.now() });
        // If a new item arrived, update and stop polling
        setSubmissions((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const next = [...data];
          const hasNew = next.some((n) => !prevIds.has(n.id));
          if (hasNew) {
            console.log('[useSubmissions] ✅ New submission detected via polling! Stopping poll.');
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
          return next;
        });
      } catch (err) {
        console.warn('[useSubmissions] ⚠️ Polling fetch error:', err);
      }
    }, intervalMs);
  };

  return { submissions, loading, error, refetch, optimisticAdd, watchForAcceptance };
};
