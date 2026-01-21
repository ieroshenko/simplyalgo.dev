import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { notifications } from "@/shared/services/notificationService";
import { getErrorMessage } from "@/utils/uiUtils";
import {
  type LeetCodeImportResult,
  type ImportedProblem,
  type GeneratedTestCase,
  type GeneratedSolution,
  type LeetCodeImportState,
  isConflictError,
} from "../types/leetcode.types";
import { isValidLeetCodeUrl, validateImportedProblem } from "../utils/leetcode-mapper";

interface UseLeetCodeImportReturn {
  state: LeetCodeImportState;
  fetchProblem: (url: string) => Promise<void>;
  saveProblem: (
    problem: ImportedProblem,
    testCases: GeneratedTestCase[],
    solutions: GeneratedSolution[]
  ) => Promise<boolean>;
  resetState: () => void;
  updatePreviewProblem: (updates: Partial<ImportedProblem>) => void;
  updatePreviewTestCase: (index: number, updates: Partial<GeneratedTestCase>) => void;
  updatePreviewSolution: (index: number, updates: Partial<GeneratedSolution>) => void;
  removePreviewTestCase: (index: number) => void;
  removePreviewSolution: (index: number) => void;
}

const initialState: LeetCodeImportState = {
  loading: false,
  fetchingProblem: false,
  savingProblem: false,
  error: null,
  previewData: null,
};

export function useLeetCodeImport(): UseLeetCodeImportReturn {
  const [state, setState] = useState<LeetCodeImportState>(initialState);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  const fetchProblem = useCallback(async (url: string): Promise<void> => {
    // Validate URL
    if (!isValidLeetCodeUrl(url)) {
      setState(prev => ({
        ...prev,
        error: "Please enter a valid LeetCode problem URL (e.g., https://leetcode.com/problems/two-sum/)",
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      fetchingProblem: true,
      error: null,
    }));

    try {
      logger.info("[LeetCodeImport] Fetching problem", { url });

      const { data, error } = await supabase.functions.invoke("leetcode-import", {
        body: { url },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch problem from LeetCode");
      }

      if (!data) {
        throw new Error("No data returned from edge function");
      }

      // Check for error in response body
      if (data.error) {
        if (isConflictError(data)) {
          throw new Error(
            `Problem already exists: "${data.existingProblem.title}" (${data.existingProblem.id})`
          );
        }
        throw new Error(data.error);
      }

      const result = data as LeetCodeImportResult;

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          notifications.warning(warning);
        });
      }

      logger.info("[LeetCodeImport] Successfully fetched problem", {
        problemId: result.problem.id,
        title: result.problem.title,
        testCasesCount: result.testCases.length,
        solutionsCount: result.solutions.length,
      });

      setState(prev => ({
        ...prev,
        loading: false,
        fetchingProblem: false,
        previewData: result,
        error: null,
      }));

      notifications.success(`Fetched "${result.problem.title}" successfully`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error("[LeetCodeImport] Failed to fetch problem", err);

      setState(prev => ({
        ...prev,
        loading: false,
        fetchingProblem: false,
        error: errorMessage,
      }));

      notifications.error(errorMessage);
    }
  }, []);

  const saveProblem = useCallback(
    async (
      problem: ImportedProblem,
      testCases: GeneratedTestCase[],
      solutions: GeneratedSolution[]
    ): Promise<boolean> => {
      // Validate required fields
      const validation = validateImportedProblem(problem);
      if (!validation.valid) {
        const errorMsg = validation.errors.join(", ");
        setState(prev => ({ ...prev, error: errorMsg }));
        notifications.error(errorMsg);
        return false;
      }

      setState(prev => ({
        ...prev,
        loading: true,
        savingProblem: true,
        error: null,
      }));

      try {
        logger.info("[LeetCodeImport] Saving problem", { problemId: problem.id });

        // 1. Insert problem
        const { error: problemError } = await supabase.from("problems").insert({
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          category_id: problem.category_id,
          description: problem.description,
          function_signature: problem.function_signature,
          companies: problem.companies,
          examples: problem.examples,
          constraints: problem.constraints,
          hints: problem.hints,
          recommended_time_complexity: problem.recommended_time_complexity,
          recommended_space_complexity: problem.recommended_space_complexity,
        });

        if (problemError) {
          throw new Error(`Failed to save problem: ${problemError.message}`);
        }

        // 2. Insert test cases (examples + generated)
        const allTestCases = [
          // Convert examples to test case format
          ...problem.examples.map(ex => ({
            problem_id: problem.id,
            input: ex.input,
            expected_output: ex.output,
            input_json: null,
            expected_json: null,
            is_example: true,
            explanation: ex.explanation || null,
          })),
          // Add generated test cases
          ...testCases.map(tc => ({
            problem_id: problem.id,
            input: tc.input,
            expected_output: tc.expected_output,
            input_json: tc.input_json,
            expected_json: tc.expected_json,
            is_example: false,
            explanation: tc.explanation || null,
          })),
        ];

        if (allTestCases.length > 0) {
          const { error: testCaseError } = await supabase
            .from("test_cases")
            .insert(allTestCases);

          if (testCaseError) {
            logger.warn("[LeetCodeImport] Failed to save test cases", testCaseError);
            notifications.warning("Problem saved but failed to save some test cases");
          }
        }

        // 3. Insert solutions
        if (solutions.length > 0) {
          const solutionsToInsert = solutions.map((sol, index) => ({
            problem_id: problem.id,
            title: sol.title,
            code: sol.code,
            language: "python",
            time_complexity: sol.time_complexity,
            space_complexity: sol.space_complexity,
            approach_type: sol.approach_type,
            explanation: sol.explanation,
            is_preferred: sol.approach_type === "optimal",
            difficulty_rating: index + 1, // 1 = easiest, 3 = hardest
          }));

          const { error: solutionError } = await supabase
            .from("problem_solutions")
            .insert(solutionsToInsert);

          if (solutionError) {
            logger.warn("[LeetCodeImport] Failed to save solutions", solutionError);
            notifications.warning("Problem saved but failed to save some solutions");
          }
        }

        logger.info("[LeetCodeImport] Successfully saved problem", {
          problemId: problem.id,
          testCasesCount: allTestCases.length,
          solutionsCount: solutions.length,
        });

        setState(prev => ({
          ...prev,
          loading: false,
          savingProblem: false,
          previewData: null,
          error: null,
        }));

        notifications.success(`Successfully imported "${problem.title}"`);
        return true;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        logger.error("[LeetCodeImport] Failed to save problem", err);

        setState(prev => ({
          ...prev,
          loading: false,
          savingProblem: false,
          error: errorMessage,
        }));

        notifications.error(errorMessage);
        return false;
      }
    },
    []
  );

  const updatePreviewProblem = useCallback((updates: Partial<ImportedProblem>) => {
    setState(prev => {
      if (!prev.previewData) return prev;
      return {
        ...prev,
        previewData: {
          ...prev.previewData,
          problem: {
            ...prev.previewData.problem,
            ...updates,
          },
        },
      };
    });
  }, []);

  const updatePreviewTestCase = useCallback(
    (index: number, updates: Partial<GeneratedTestCase>) => {
      setState(prev => {
        if (!prev.previewData) return prev;
        const newTestCases = [...prev.previewData.testCases];
        newTestCases[index] = { ...newTestCases[index], ...updates };
        return {
          ...prev,
          previewData: {
            ...prev.previewData,
            testCases: newTestCases,
          },
        };
      });
    },
    []
  );

  const updatePreviewSolution = useCallback(
    (index: number, updates: Partial<GeneratedSolution>) => {
      setState(prev => {
        if (!prev.previewData) return prev;
        const newSolutions = [...prev.previewData.solutions];
        newSolutions[index] = { ...newSolutions[index], ...updates };
        return {
          ...prev,
          previewData: {
            ...prev.previewData,
            solutions: newSolutions,
          },
        };
      });
    },
    []
  );

  const removePreviewTestCase = useCallback((index: number) => {
    setState(prev => {
      if (!prev.previewData) return prev;
      return {
        ...prev,
        previewData: {
          ...prev.previewData,
          testCases: prev.previewData.testCases.filter((_, i) => i !== index),
        },
      };
    });
  }, []);

  const removePreviewSolution = useCallback((index: number) => {
    setState(prev => {
      if (!prev.previewData) return prev;
      return {
        ...prev,
        previewData: {
          ...prev.previewData,
          solutions: prev.previewData.solutions.filter((_, i) => i !== index),
        },
      };
    });
  }, []);

  return {
    state,
    fetchProblem,
    saveProblem,
    resetState,
    updatePreviewProblem,
    updatePreviewTestCase,
    updatePreviewSolution,
    removePreviewTestCase,
    removePreviewSolution,
  };
}
