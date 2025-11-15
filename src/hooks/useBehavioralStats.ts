import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserBehavioralStats } from "@/types";

export const useBehavioralStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserBehavioralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("user_behavioral_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "not found" - we'll create stats if they don't exist
        throw fetchError;
      }

      if (data) {
        const transformedStats: UserBehavioralStats = {
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
        setStats(transformedStats);
      } else {
        // Initialize stats if they don't exist
        const { data: newStats, error: insertError } = await supabase
          .from("user_behavioral_stats")
          .insert({
            user_id: user.id,
            total_questions_practiced: 0,
            total_stories_created: 0,
            practice_streak: 0,
            category_scores: {},
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setStats({
          user_id: newStats.user_id,
          total_questions_practiced: 0,
          total_stories_created: 0,
          practice_streak: 0,
          category_scores: {},
          updated_at: newStats.updated_at,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
      console.error("Error fetching behavioral stats:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

