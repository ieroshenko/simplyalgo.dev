import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { useAsyncState } from "@/shared/hooks/useAsyncState";

export interface Solution {
  id: string;
  title: string;
  code: string;
  time_complexity?: string;
  space_complexity?: string;
  explanation?: string;
  approach_type?: string;
  language: string;
  difficulty_rating?: number;
  is_preferred: boolean;
}

// Simple in-memory cache
const solutionCache = new Map<string, Solution[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

export const useSolutions = (problemId?: string) => {
  const { data: solutions, loading, error, setData, setLoading, setError } =
    useAsyncState<Solution[]>({ initialData: [] });

  useEffect(() => {
    if (!problemId) {
      setData([]);
      return;
    }

    const loadSolutions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cached = solutionCache.get(problemId);
        const cacheTime = cacheTimestamps.get(problemId);
        const now = Date.now();

        if (cached && cacheTime && (now - cacheTime) < CACHE_DURATION) {
          logger.debug('[useSolutions] Loading from cache', { problemId });
          setData(cached);
          return;
        }

        logger.debug('[useSolutions] Fetching from database', { problemId });

        // Fetch from database
        const { data, error: fetchError } = await supabase
          .from("problem_solutions" as unknown)
          .select("*")
          .eq("problem_id", problemId)
          .eq("language", "python") // For now, only Python
          .order("is_preferred", { ascending: false })
          .order("difficulty_rating", { ascending: true })
          .order("created_at", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        const solutionsData = (data as unknown as Solution[]) || [];

        // Cache the results
        solutionCache.set(problemId, solutionsData);
        cacheTimestamps.set(problemId, now);

        setData(solutionsData);
      } catch (err) {
        logger.error('[useSolutions] Error loading solutions', { error: err, problemId });
        const errorMessage = err instanceof Error ? err.message : "Failed to load solutions";
        setError(new Error(errorMessage));
      }
    };

    loadSolutions();
  }, [problemId, setData, setLoading, setError]);

  // Function to clear cache (useful for admin updates)
  const clearCache = (targetProblemId?: string) => {
    if (targetProblemId) {
      solutionCache.delete(targetProblemId);
      cacheTimestamps.delete(targetProblemId);
    } else {
      solutionCache.clear();
      cacheTimestamps.clear();
    }
  };

  // Function to get preferred solution
  const getPreferredSolution = () => {
    const solutionsList = solutions || [];
    return solutionsList.find(s => s.is_preferred) || solutionsList[0];
  };

  // Function to get solutions by approach type
  const getSolutionsByApproach = (approachType: string) => {
    return (solutions || []).filter(s => s.approach_type === approachType);
  };

  return {
    solutions: solutions || [],
    loading,
    error: error?.message || null,
    clearCache,
    getPreferredSolution,
    getSolutionsByApproach,
    hasSolutions: (solutions || []).length > 0,
  };
};
