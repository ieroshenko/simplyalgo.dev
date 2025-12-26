import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export interface UserStats {
  totalSolved: number;
  streak: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  maxStreak: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

// Cache configuration
const STATS_STALE_TIME = 2 * 60 * 1000; // 2 minutes - stats change more frequently
const PROFILE_STALE_TIME = 10 * 60 * 1000; // 10 minutes - profile rarely changes
const GC_TIME = 30 * 60 * 1000; // 30 minutes - cache kept in memory

// Default values
const DEFAULT_STATS: UserStats = {
  totalSolved: 0,
  streak: 0,
  easySolved: 0,
  mediumSolved: 0,
  hardSolved: 0,
  maxStreak: 0,
};

const DEFAULT_PROFILE: UserProfile = {
  name: "Guest",
  email: "",
};

// Helper: Validate current streak
const validateCurrentStreak = (statsData: { last_activity_date?: string; current_streak?: number }): number => {
  const today = new Date().toISOString().split("T")[0];
  const lastActivityDate = statsData?.last_activity_date?.split("T")[0];
  const currentStreak = statsData?.current_streak || 0;

  logger.debug("[validateCurrentStreak] Input data", {
    component: "UserStats",
    lastActivityDate,
    currentStreak,
    today,
  });

  if (!lastActivityDate) {
    logger.debug("[validateCurrentStreak] No last activity date, returning 0", { component: "UserStats" });
    return 0;
  }

  const lastDate = new Date(lastActivityDate);
  const todayDate = new Date(today || "");
  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  logger.debug("[validateCurrentStreak] Date calculation", {
    component: "UserStats",
    lastDate: lastDate.toISOString(),
    todayDate: todayDate.toISOString(),
    diffTime,
    diffDays,
  });

  // Streak is broken if more than 1 day gap
  if (diffDays > 1) {
    logger.debug("[validateCurrentStreak] Streak broken (>1 day gap), returning 0", { component: "UserStats" });
    return 0;
  }

  logger.debug("[validateCurrentStreak] Streak valid, returning", { component: "UserStats", streak: currentStreak });
  return currentStreak;
};

// Fetch user stats from database
async function fetchUserStats(userId: string): Promise<UserStats> {
  logger.debug("[fetchUserStats] Fetching stats from database", { component: "UserStats", userId });
  
  const { data: statsData, error } = await supabase
    .from("user_statistics")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  if (statsData) {
    logger.debug("[fetchUserStats] Raw data from database", {
      component: "UserStats",
      total_solved: statsData.total_solved,
      current_streak: statsData.current_streak,
      last_activity_date: statsData.last_activity_date,
      easy_solved: statsData.easy_solved,
      medium_solved: statsData.medium_solved,
      hard_solved: statsData.hard_solved,
      max_streak: statsData.max_streak,
    });

    // Validate streak
    const validatedStreak = validateCurrentStreak(statsData);

    logger.debug("[fetchUserStats] After validation", {
      component: "UserStats",
      originalStreak: statsData.current_streak,
      validatedStreak,
    });

    // Update database if streak was broken
    if (validatedStreak !== (statsData.current_streak || 0)) {
      logger.debug("[fetchUserStats] Updating database with new streak", {
        component: "UserStats",
        newStreak: validatedStreak,
      });
      await supabase
        .from("user_statistics")
        .update({
          current_streak: validatedStreak,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    const result = {
      totalSolved: statsData.total_solved || 0,
      streak: validatedStreak,
      easySolved: statsData.easy_solved || 0,
      mediumSolved: statsData.medium_solved || 0,
      hardSolved: statsData.hard_solved || 0,
      maxStreak: statsData.max_streak || 0,
    };

    logger.debug("[fetchUserStats] Returning stats", { component: "UserStats", result });
    return result;
  }

  logger.debug("[fetchUserStats] No stats found, returning defaults", { component: "UserStats" });
  return DEFAULT_STATS;
}

// Fetch user profile from database
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data: profileData, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  if (profileData) {
    return {
      name: profileData.name || "User",
      email: profileData.email || "",
      avatarUrl: profileData.avatar_url || undefined,
    };
  }

  return DEFAULT_PROFILE;
}

export const useUserStats = (userId?: string) => {
  const queryClient = useQueryClient();

  // Query for user stats - cached for 2 minutes
  const {
    data: stats = DEFAULT_STATS,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["userStats", userId],
    queryFn: () => fetchUserStats(userId!),
    enabled: !!userId,
    staleTime: STATS_STALE_TIME,
    gcTime: GC_TIME,
  });

  // Query for user profile - cached for 10 minutes
  const {
    data: profile = DEFAULT_PROFILE,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: PROFILE_STALE_TIME,
    gcTime: GC_TIME,
  });

  // Mutation to update stats when problem is solved
  const updateStatsMutation = useMutation({
    mutationFn: async ({
      difficulty,
      problemId,
    }: {
      difficulty: "Easy" | "Medium" | "Hard";
      problemId: string;
    }) => {
      if (!userId) throw new Error("User ID required");

      logger.debug("Starting stats update", {
        component: "UserStats",
        difficulty,
        userId,
        problemId,
      });

      // Check if user has already solved this problem before
      const { data: previousSolves, error: solvesError } = await supabase
        .from("user_problem_attempts")
        .select("id, created_at")
        .eq("user_id", userId)
        .eq("problem_id", problemId)
        .eq("status", "passed")
        .order("created_at", { ascending: false });

      if (solvesError) throw solvesError;

      // Check if there are multiple solves (more than just the current one)
      const isFirstTimeSolving = !previousSolves || previousSolves.length <= 1;
      logger.debug("Previous solves check", {
        component: "UserStats",
        previousSolvesCount: previousSolves?.length || 0,
        isFirstTimeSolving,
      });

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from("user_statistics")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const today = new Date().toISOString().split("T")[0];
      const lastActivityDate = currentStats?.last_activity_date?.split("T")[0];
      const currentStreak = currentStats?.current_streak || 0;

      // Calculate new streak
      let newStreak = 1;
      if (lastActivityDate) {
        const lastDate = new Date(lastActivityDate);
        const todayDate = new Date(today || "");
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day: maintain current streak, but ensure minimum of 1
          newStreak = Math.max(currentStreak, 1);
        } else if (diffDays === 1) {
          // Consecutive day: increment streak
          newStreak = currentStreak + 1;
        }
        // diffDays > 1: streak broken, newStreak stays 1 (reset)
      }

      // Calculate new totals - only increment for first-time solves
      const newEasySolved =
        (currentStats?.easy_solved || 0) + (isFirstTimeSolving && difficulty === "Easy" ? 1 : 0);
      const newMediumSolved =
        (currentStats?.medium_solved || 0) + (isFirstTimeSolving && difficulty === "Medium" ? 1 : 0);
      const newHardSolved =
        (currentStats?.hard_solved || 0) + (isFirstTimeSolving && difficulty === "Hard" ? 1 : 0);
      const newTotalSolved = newEasySolved + newMediumSolved + newHardSolved;
      const newMaxStreak = Math.max(currentStats?.max_streak || 0, newStreak);

      logger.debug("New stats to save", {
        component: "UserStats",
        newTotalSolved,
        newEasySolved,
        newMediumSolved,
        newHardSolved,
        newStreak,
        newMaxStreak,
      });

      // Update or insert stats
      const { error: upsertError } = await supabase
        .from("user_statistics")
        .upsert(
          {
            id: currentStats?.id,
            user_id: userId,
            total_solved: newTotalSolved,
            easy_solved: newEasySolved,
            medium_solved: newMediumSolved,
            hard_solved: newHardSolved,
            current_streak: newStreak,
            max_streak: newMaxStreak,
            last_activity_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (upsertError) {
        logger.error("Upsert error details", upsertError, {
          component: "UserStats",
        });
        throw upsertError;
      }

      logger.debug("Stats successfully saved to database", {
        component: "UserStats",
      });

      return {
        totalSolved: newTotalSolved,
        streak: newStreak,
        easySolved: newEasySolved,
        mediumSolved: newMediumSolved,
        hardSolved: newHardSolved,
        maxStreak: newMaxStreak,
      };
    },
    onSuccess: (newStats) => {
      // Update local cache with new stats
      queryClient.setQueryData(["userStats", userId], newStats);

      // Invalidate all related caches when problem is solved
      queryClient.invalidateQueries({ queryKey: ["problems", userId] });
      queryClient.invalidateQueries({ queryKey: ["categories", userId] });
      // Invalidate survey data in case it shows progress
      queryClient.invalidateQueries({ queryKey: ["surveyData", userId] });
    },
    onError: (err) => {
      logger.error("Error updating user stats", err, { component: "UserStats" });
    },
  });

  const updateStatsOnProblemSolved = useCallback(
    (difficulty: "Easy" | "Medium" | "Hard", problemId: string) => {
      updateStatsMutation.mutate({ difficulty, problemId });
    },
    [updateStatsMutation]
  );

  const loading = statsLoading || profileLoading;

  return {
    stats,
    profile,
    loading,
    updateStatsOnProblemSolved,
  };
};
