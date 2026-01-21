import { useQuery } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
import {
  ProblemService,
  ProblemWithRelations,
  UserStarRow,
  UserAttemptStatusRow,
} from "@/services/problemService";

// ============================================================================
// Types
// ============================================================================

export interface ProblemDetail {
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
 * Transform database row to ProblemDetail interface (with test_cases)
 */
const transformProblemWithTestCases = (
  problem: ProblemWithRelations,
  attempts: UserAttemptStatusRow[],
  stars: UserStarRow[]
): ProblemDetail => {
  const mappedTestCases = (problem.test_cases || []).map((tc) => ({
    input: tc.input,
    expected: tc.expected_output,
  }));

  return {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
    category: problem.categories.name,
    status: getStatus(problem.id, attempts),
    isStarred: stars.some((s) => s.problem_id === problem.id),
    description: problem.description,
    functionSignature: problem.function_signature,
    examples: (problem.examples || []) as ProblemDetail["examples"],
    constraints: (problem.constraints || []) as string[],
    testCases: mappedTestCases,
    likes: problem.likes ?? undefined,
    dislikes: problem.dislikes ?? undefined,
    acceptanceRate: problem.acceptance_rate ?? undefined,
    recommendedTimeComplexity: problem.recommended_time_complexity ?? undefined,
    recommendedSpaceComplexity: problem.recommended_space_complexity ?? undefined,
    companies: (problem.companies || []) as string[],
  };
};

// ============================================================================
// Data Fetching Function
// ============================================================================

/**
 * Fetch a single problem with test_cases and user-specific data
 */
async function fetchProblemData(
  problemId: string,
  userId?: string
): Promise<ProblemDetail | null> {
  // Fetch problem with test_cases using getById
  const problemData = await ProblemService.getById(problemId);

  if (!problemData) {
    logger.debug("[useProblem] Problem not found", { problemId });
    return null;
  }

  logger.debug("[useProblem] Fetched problem with test cases", {
    problemId,
    testCasesCount: problemData.test_cases?.length ?? 0,
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

  // Transform problem to UI format
  return transformProblemWithTestCases(problemData, userAttempts, userStars);
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for fetching a single problem with test_cases
 * Use this for the Problem Solver page where test_cases are needed
 */
export const useProblem = (problemId?: string, userId?: string) => {
  const {
    data: problem,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["problem", problemId, userId],
    queryFn: () => fetchProblemData(problemId!, userId),
    enabled: !!problemId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    problem: problem ?? null,
    loading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
