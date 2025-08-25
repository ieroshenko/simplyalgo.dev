import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!problemId) {
      setSolutions([]);
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
          console.log(`📦 Loading solutions from cache for ${problemId}`);
          setSolutions(cached);
          setLoading(false);
          return;
        }

        console.log(`🔍 Fetching solutions from database for ${problemId}`);

        // Fetch from database
        const { data, error: fetchError } = await supabase
          .from("problem_solutions" as any)
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

        setSolutions(solutionsData);
      } catch (err) {
        console.error("Error loading solutions:", err);
        setError(err instanceof Error ? err.message : "Failed to load solutions");
        setSolutions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSolutions();
  }, [problemId]);

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
    return solutions.find(s => s.is_preferred) || solutions[0];
  };

  // Function to get solutions by approach type
  const getSolutionsByApproach = (approachType: string) => {
    return solutions.filter(s => s.approach_type === approachType);
  };

  return {
    solutions,
    loading,
    error,
    clearCache,
    getPreferredSolution,
    getSolutionsByApproach,
    hasSolutions: solutions.length > 0,
  };
};
