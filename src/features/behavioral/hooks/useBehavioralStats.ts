import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";
import type { UserBehavioralStats } from "@/types";

// Cache configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// Fetch or create behavioral stats
async function fetchBehavioralStats(
  userId: string
): Promise<UserBehavioralStats | null> {
  const { data, error: fetchError } = await supabase
    .from("user_behavioral_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 is "not found" - we'll create stats if they don't exist
    throw fetchError;
  }

  if (data) {
    return {
      user_id: data.user_id,
      total_questions_practiced: data.total_questions_practiced || 0,
      total_stories_created: data.total_stories_created || 0,
      average_overall_score: data.average_overall_score
        ? Number(data.average_overall_score)
        : undefined,
      category_scores: (data.category_scores as Record<string, number>) || {},
      practice_streak: data.practice_streak || 0,
      last_practiced_at: data.last_practiced_at || undefined,
      updated_at: data.updated_at,
    };
  }

  // Initialize stats if they don't exist
  const { data: newStats, error: insertError } = await supabase
    .from("user_behavioral_stats")
    .insert({
      user_id: userId,
      total_questions_practiced: 0,
      total_stories_created: 0,
      practice_streak: 0,
      category_scores: {},
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return {
    user_id: newStats.user_id,
    total_questions_practiced: 0,
    total_stories_created: 0,
    practice_streak: 0,
    category_scores: {},
    updated_at: newStats.updated_at,
  };
}

export const useBehavioralStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: stats,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["behavioralStats", user?.id],
    queryFn: () => fetchBehavioralStats(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const error = queryError ? (queryError as Error).message : null;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["behavioralStats", user?.id] });
  };

  return { stats: stats ?? null, loading, error, refetch };
};
