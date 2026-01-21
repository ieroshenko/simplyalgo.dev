// LeetCode Import Types

/**
 * Category information for dropdown selection
 */
export interface Category {
  id: string;
  name: string;
}

/**
 * Example parsed from LeetCode problem description
 */
export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

/**
 * Imported problem data structure (ready to save to DB)
 */
export interface ImportedProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category_id: string | null;
  description: string;
  function_signature: string;
  companies: string[];
  examples: ProblemExample[];
  constraints: string[];
  hints: string[];
  recommended_time_complexity: string | null;
  recommended_space_complexity: string | null;
}

/**
 * AI-generated test case
 */
export interface GeneratedTestCase {
  input: string;
  expected_output: string;
  input_json: unknown;
  expected_json: unknown;
  explanation: string;
}

/**
 * AI-generated solution
 */
export interface GeneratedSolution {
  title: string;
  code: string;
  time_complexity: string;
  space_complexity: string;
  explanation: string;
  approach_type: "brute_force" | "optimal" | "alternative";
}

/**
 * Full result from the leetcode-import edge function
 */
export interface LeetCodeImportResult {
  problem: ImportedProblem;
  testCases: GeneratedTestCase[];
  solutions: GeneratedSolution[];
  warnings: string[];
  categories: Category[];
}

/**
 * Error response from the edge function when problem already exists
 */
export interface LeetCodeImportConflictError {
  error: string;
  existingProblem: {
    id: string;
    title: string;
  };
}

/**
 * Generic error response from the edge function
 */
export interface LeetCodeImportError {
  error: string;
}

/**
 * Union type for all possible error responses
 */
export type LeetCodeImportErrorResponse = LeetCodeImportError | LeetCodeImportConflictError;

/**
 * Type guard to check if error is a conflict (problem exists)
 */
export function isConflictError(
  response: LeetCodeImportErrorResponse
): response is LeetCodeImportConflictError {
  return "existingProblem" in response;
}

/**
 * State for the import dialog
 */
export interface LeetCodeImportState {
  loading: boolean;
  fetchingProblem: boolean;
  savingProblem: boolean;
  error: string | null;
  previewData: LeetCodeImportResult | null;
}
