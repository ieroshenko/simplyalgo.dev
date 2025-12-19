import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  status: "solved" | "attempted" | "not-started";
  isStarred: boolean;
  description: string;
  functionSignature: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  testCases: Array<{
    input: string;
    expected: string;
  }>;
  likes?: number;
  dislikes?: number;
  acceptanceRate?: number;
  recommendedTimeComplexity?: string;
  recommendedSpaceComplexity?: string;
  companies?: string[];
}

export interface Category {
  name: string;
  solved: number;
  total: number;
  color: string;
}

// Minimal DB row types for stronger typing
type AttemptRow = {
  problem_id: string;
  status: string;
};

type StarRow = {
  problem_id: string;
};

type TestCaseRow = {
  input: string;
  expected_output: string;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  sort_order?: number | null;
};

type ProblemRowWithRelations = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  function_signature: string;
  examples?: Array<{ input: string; output: string; explanation?: string }> | null;
  constraints?: string[] | null;
  categories: { name: string; color: string };
  test_cases: TestCaseRow[] | null;
  likes?: number | null;
  dislikes?: number | null;
  acceptance_rate?: number | null;
  recommended_time_complexity?: string | null;
  recommended_space_complexity?: string | null;
  companies?: string[] | null;
};

type ProblemIdWithCategory = {
  id: string;
  categories: { name: string | null } | null;
};

// Cache configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data considered fresh
const GC_TIME = 30 * 60 * 1000; // 30 minutes - cache kept in memory

// Helper function to determine problem status
const getStatus = (attempts: AttemptRow[]): "solved" | "attempted" | "not-started" => {
  if (!attempts || attempts.length === 0) return "not-started";
  const hasPassed = attempts.some((attempt) => attempt.status === "passed");
  if (hasPassed) return "solved";
  return "attempted";
};

// Fetch all problems from database
async function fetchProblemsData(userId?: string): Promise<Problem[]> {
  // Fetch problems with category names
  const { data: problemsData, error: problemsError } = await supabase
    .from("problems")
    .select(`
      *,
      categories!inner(name, color),
      test_cases(input, expected_output)
    `);

  logger.debug('[useProblems] Fetched problems', {
    count: problemsData?.length,
    hasLinkedList: !!problemsData?.find((p: any) => p.id === 'implement-linked-list')
  });

  if (problemsError) throw problemsError;

  // Fetch user-specific data separately if userId exists
  let userAttempts: AttemptRow[] = [];
  let userStars: StarRow[] = [];

  if (userId) {
    const { data: attemptsData } = await supabase
      .from("user_problem_attempts")
      .select("problem_id, status")
      .eq("user_id", userId);

    const { data: starsData } = await supabase
      .from("user_starred_problems")
      .select("problem_id")
      .eq("user_id", userId);

    userAttempts = (attemptsData as AttemptRow[] | null) || [];
    userStars = (starsData as StarRow[] | null) || [];
  }

  const typedProblems = problemsData as unknown as ProblemRowWithRelations[];
  const formattedProblems: Problem[] = typedProblems.map((problem) => {
    const attemptsForProblem: AttemptRow[] = userAttempts.filter(
      (a) => a.problem_id === problem.id,
    );
    const isStarred = userStars.some((s) => s.problem_id === problem.id);

    const mappedTestCases = (problem.test_cases || []).map((tc: TestCaseRow) => ({
      input: tc.input,
      expected: tc.expected_output,
    }));

    return {
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      category: problem.categories.name,
      status: getStatus(attemptsForProblem),
      isStarred,
      description: problem.description,
      functionSignature: problem.function_signature,
      examples: (problem.examples || []) as Problem["examples"],
      constraints: (problem.constraints || []) as string[],
      testCases: mappedTestCases,
      likes: problem.likes ?? undefined,
      dislikes: problem.dislikes ?? undefined,
      acceptanceRate: problem.acceptance_rate ?? undefined,
      recommendedTimeComplexity: problem.recommended_time_complexity ?? undefined,
      recommendedSpaceComplexity: problem.recommended_space_complexity ?? undefined,
      companies: (problem.companies || []) as string[],
    };
  });

  logger.debug('[useProblems] Formatted problems', {
    count: formattedProblems.length,
    hasLinkedList: !!formattedProblems.find(p => p.id === 'implement-linked-list')
  });

  return formattedProblems;
}

// Fetch categories with solved counts
async function fetchCategoriesData(userId?: string): Promise<Category[]> {
  // 1) Load categories (to preserve ordering and colors)
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, color, sort_order")
    .order("sort_order");

  if (categoriesError) throw categoriesError;

  // 2) Load problems with their category name to compute totals map
  const { data: problemsData, error: problemsError } = await supabase
    .from("problems")
    .select("id, categories(name)");

  if (problemsError) throw problemsError;

  const totalsByCategory = new Map<string, number>();
  const problemIdToCategory = new Map<string, string>();

  ((problemsData as ProblemIdWithCategory[] | null) || []).forEach((problem) => {
    const catName: string = problem?.categories?.name || "Unknown";
    totalsByCategory.set(catName, (totalsByCategory.get(catName) || 0) + 1);
    problemIdToCategory.set(problem.id, catName);
  });

  // 3) If we have a user, compute solved per category from attempts
  const solvedByCategory = new Map<string, number>();
  if (userId) {
    const { data: attemptsData, error: attemptsError } = await supabase
      .from("user_problem_attempts")
      .select("problem_id, status")
      .eq("user_id", userId)
      .eq("status", "passed");

    if (attemptsError) throw attemptsError;

    // Count distinct problem_ids solved per category
    const solvedProblemIds = new Set<string>();
    ((attemptsData as AttemptRow[] | null) || []).forEach((attempt) => {
      if (attempt?.problem_id) solvedProblemIds.add(attempt.problem_id);
    });

    solvedProblemIds.forEach((pid) => {
      const catName = problemIdToCategory.get(pid);
      if (!catName) return;
      solvedByCategory.set(
        catName,
        (solvedByCategory.get(catName) || 0) + 1,
      );
    });
  }

  // 4) Assemble final categories using DB order
  const formattedCategories: Category[] = ((categoriesData as CategoryRow[] | null) || []).map(
    (category) => ({
      name: category.name,
      solved: solvedByCategory.get(category.name) || 0,
      total: totalsByCategory.get(category.name) || 0,
      color: category.color,
    }),
  );

  return formattedCategories;
}

export const useProblems = (userId?: string) => {
  const queryClient = useQueryClient();

  // Query for problems - cached for 5 minutes
  const {
    data: problems = [],
    isLoading: problemsLoading,
    error: problemsError,
  } = useQuery({
    queryKey: ["problems", userId],
    queryFn: () => fetchProblemsData(userId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Query for categories - cached for 5 minutes
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categories", userId],
    queryFn: () => fetchCategoriesData(userId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Toggle star mutation with optimistic update
  const toggleStarMutation = useMutation({
    mutationFn: async (problemId: string) => {
      if (!userId) throw new Error("User not authenticated");

      const problem = problems.find((p) => p.id === problemId);
      if (!problem) throw new Error("Problem not found");

      if (problem.isStarred) {
        // Remove star
        const { error } = await supabase
          .from("user_starred_problems")
          .delete()
          .eq("user_id", userId)
          .eq("problem_id", problemId);

        if (error) throw error;
        return { problemId, isStarred: false };
      } else {
        // Add star
        const { error } = await supabase
          .from("user_starred_problems")
          .insert({ user_id: userId, problem_id: problemId });

        if (error) throw error;
        return { problemId, isStarred: true };
      }
    },
    // Optimistic update
    onMutate: async (problemId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["problems", userId] });

      // Snapshot the previous value
      const previousProblems = queryClient.getQueryData<Problem[]>(["problems", userId]);

      // Optimistically update to the new value
      queryClient.setQueryData<Problem[]>(["problems", userId], (old) =>
        old?.map((p) =>
          p.id === problemId ? { ...p, isStarred: !p.isStarred } : p
        ) ?? []
      );

      return { previousProblems };
    },
    onError: (err, problemId, context) => {
      // Rollback on error
      queryClient.setQueryData(["problems", userId], context?.previousProblems);
      logger.error("Error toggling star", err, { component: "useProblems", problemId });
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: ["problems", userId] });
    },
  });

  const toggleStar = useCallback(
    (problemId: string) => {
      toggleStarMutation.mutate(problemId);
    },
    [toggleStarMutation]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["problems", userId] });
    queryClient.invalidateQueries({ queryKey: ["categories", userId] });
  }, [queryClient, userId]);

  const loading = problemsLoading || categoriesLoading;
  const error = problemsError ? (problemsError as Error).message : null;

  return {
    problems,
    categories,
    loading,
    error,
    toggleStar,
    refetch,
  };
};
