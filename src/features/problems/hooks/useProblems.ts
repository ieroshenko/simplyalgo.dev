import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
import {
  ProblemService,
  ProblemListItem,
  CategoryRow,
  UserStarRow,
  UserAttemptStatusRow,
} from "@/services/problemService";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Cache Configuration
// ============================================================================

const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data considered fresh
const GC_TIME = 30 * 60 * 1000; // 30 minutes - cache kept in memory

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine problem status based on user attempts
 */
const getStatus = (
  problemId: string,
  attempts: UserAttemptStatusRow[]
): "solved" | "attempted" | "not-started" => {
  const problemAttempts = attempts.filter((a) => a.problem_id === problemId);
  if (problemAttempts.length === 0) return "not-started";
  const hasPassed = problemAttempts.some((attempt) => attempt.status === "passed");
  if (hasPassed) return "solved";
  return "attempted";
};

/**
 * Transform database row to Problem interface (for list views without test_cases)
 */
const transformProblemForList = (
  problem: ProblemListItem,
  attempts: UserAttemptStatusRow[],
  stars: UserStarRow[]
): Problem => {
  return {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
    category: problem.categories.name,
    status: getStatus(problem.id, attempts),
    isStarred: stars.some((s) => s.problem_id === problem.id),
    description: problem.description,
    functionSignature: problem.function_signature,
    examples: (problem.examples || []) as Problem["examples"],
    constraints: (problem.constraints || []) as string[],
    testCases: [], // List views don't need test cases
    likes: problem.likes ?? undefined,
    dislikes: problem.dislikes ?? undefined,
    acceptanceRate: problem.acceptance_rate ?? undefined,
    recommendedTimeComplexity: problem.recommended_time_complexity ?? undefined,
    recommendedSpaceComplexity: problem.recommended_space_complexity ?? undefined,
    companies: (problem.companies || []) as string[],
  };
};

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch all problems with user-specific data (optimized for list views - no test_cases)
 */
async function fetchProblemsData(userId?: string): Promise<Problem[]> {
  // Fetch problems using the optimized list query (no test_cases)
  const problemsData = await ProblemService.getAllForList();

  logger.debug("[useProblems] Fetched problems for list", {
    count: problemsData.length,
    hasLinkedList: !!problemsData.find((p) => p.id === "implement-linked-list"),
  });

  // Fetch user-specific data if userId exists
  let userAttempts: UserAttemptStatusRow[] = [];
  let userStars: UserStarRow[] = [];

  if (userId) {
    [userAttempts, userStars] = await Promise.all([
      ProblemService.getUserAttemptStatuses(userId),
      ProblemService.getUserStars(userId),
    ]);
  }

  // Transform problems to UI format
  const formattedProblems = problemsData.map((problem) =>
    transformProblemForList(problem, userAttempts, userStars)
  );

  logger.debug("[useProblems] Formatted problems", {
    count: formattedProblems.length,
    hasLinkedList: !!formattedProblems.find((p) => p.id === "implement-linked-list"),
  });

  return formattedProblems;
}

/**
 * Fetch categories with solved counts (optimized - no duplicate problem fetch)
 */
async function fetchCategoriesData(userId?: string): Promise<Category[]> {
  // Fetch categories and counts using the service
  const [categories, categoryCounts] = await Promise.all([
    ProblemService.getAllCategories(),
    ProblemService.getCategoryCounts(),
  ]);

  // Get solved counts if user is logged in
  let solvedByCategory = new Map<string, number>();
  if (userId) {
    // Fetch solved IDs and lightweight category mappings in parallel
    const [solvedIds, problemMappings] = await Promise.all([
      ProblemService.getUserSolvedProblemIds(userId),
      ProblemService.getProblemCategoryMappings(), // Lightweight query instead of getAllWithRelations
    ]);

    solvedIds.forEach((problemId) => {
      const problem = problemMappings.find((p) => p.id === problemId);
      if (problem) {
        const catName = problem.categories.name;
        solvedByCategory.set(catName, (solvedByCategory.get(catName) ?? 0) + 1);
      }
    });
  }

  // Assemble final categories
  const formattedCategories: Category[] = categories.map((category: CategoryRow) => ({
    name: category.name,
    solved: solvedByCategory.get(category.name) ?? 0,
    total: categoryCounts.get(category.name) ?? 0,
    color: category.color,
  }));

  return formattedCategories;
}

// ============================================================================
// Hook
// ============================================================================

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
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
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

      const newStarredState = await ProblemService.toggleStar(
        userId,
        problemId,
        problem.isStarred
      );

      return { problemId, isStarred: newStarredState };
    },
    // Optimistic update
    onMutate: async (problemId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["problems", userId] });

      // Snapshot the previous value
      const previousProblems = queryClient.getQueryData<Problem[]>(["problems", userId]);

      // Optimistically update to the new value
      queryClient.setQueryData<Problem[]>(["problems", userId], (old) =>
        old?.map((p) => (p.id === problemId ? { ...p, isStarred: !p.isStarred } : p)) ??
        []
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
