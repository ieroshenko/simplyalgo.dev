import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLeetCodeImport } from "../useLeetCodeImport";

// Mock notifications
vi.mock("@/shared/services/notificationService", () => ({
  notifications: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock supabase
const mockFunctionsInvoke = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("useLeetCodeImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useLeetCodeImport());

      expect(result.current.state).toEqual({
        loading: false,
        fetchingProblem: false,
        savingProblem: false,
        error: null,
        previewData: null,
      });
    });
  });

  describe("fetchProblem", () => {
    it("should set error for invalid URL", async () => {
      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("invalid-url");
      });

      expect(result.current.state.error).toContain("valid LeetCode problem URL");
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });

    it("should call edge function with valid URL", async () => {
      const mockResponse = {
        problem: {
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          category_id: "arrays-hashing",
          description: "Given an array...",
          function_signature: "def twoSum(nums, target):",
          companies: ["Google"],
          examples: [],
          constraints: [],
          hints: [],
          recommended_time_complexity: null,
          recommended_space_complexity: null,
        },
        testCases: [],
        solutions: [],
        warnings: [],
        categories: [{ id: "arrays-hashing", name: "Arrays & Hashing" }],
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      expect(mockFunctionsInvoke).toHaveBeenCalledWith("leetcode-import", {
        body: { url: "https://leetcode.com/problems/two-sum/" },
      });
      expect(result.current.state.previewData).toEqual(mockResponse);
      expect(result.current.state.error).toBeNull();
    });

    it("should handle edge function error", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Server error" },
      });

      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      expect(result.current.state.error).toContain("Server error");
      expect(result.current.state.previewData).toBeNull();
    });

    it("should handle problem already exists error", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          error: "Problem already exists",
          existingProblem: { id: "two-sum", title: "Two Sum" },
        },
        error: null,
      });

      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      expect(result.current.state.error).toContain("already exists");
      expect(result.current.state.previewData).toBeNull();
    });
  });

  describe("resetState", () => {
    it("should reset to initial state", async () => {
      const mockResponse = {
        problem: {
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          category_id: "arrays-hashing",
          description: "Given an array...",
          function_signature: "def twoSum(nums, target):",
          companies: [],
          examples: [],
          constraints: [],
          hints: [],
          recommended_time_complexity: null,
          recommended_space_complexity: null,
        },
        testCases: [],
        solutions: [],
        warnings: [],
        categories: [],
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useLeetCodeImport());

      // Fetch a problem first
      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      expect(result.current.state.previewData).not.toBeNull();

      // Reset
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state).toEqual({
        loading: false,
        fetchingProblem: false,
        savingProblem: false,
        error: null,
        previewData: null,
      });
    });
  });

  describe("updatePreviewProblem", () => {
    it("should update problem fields", async () => {
      const mockResponse = {
        problem: {
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy" as const,
          category_id: null,
          description: "Given an array...",
          function_signature: "def twoSum(nums, target):",
          companies: [],
          examples: [],
          constraints: [],
          hints: [],
          recommended_time_complexity: null,
          recommended_space_complexity: null,
        },
        testCases: [],
        solutions: [],
        warnings: [],
        categories: [],
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      act(() => {
        result.current.updatePreviewProblem({ category_id: "arrays-hashing" });
      });

      expect(result.current.state.previewData?.problem.category_id).toBe("arrays-hashing");
    });
  });

  describe("updatePreviewTestCase", () => {
    it("should update test case at index", async () => {
      const mockResponse = {
        problem: {
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy" as const,
          category_id: "arrays-hashing",
          description: "Given an array...",
          function_signature: "def twoSum(nums, target):",
          companies: [],
          examples: [],
          constraints: [],
          hints: [],
          recommended_time_complexity: null,
          recommended_space_complexity: null,
        },
        testCases: [
          {
            input: "nums = [1,2,3]",
            expected_output: "[0,2]",
            input_json: { nums: [1, 2, 3] },
            expected_json: [0, 2],
            explanation: "Test case 1",
          },
        ],
        solutions: [],
        warnings: [],
        categories: [],
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      act(() => {
        result.current.updatePreviewTestCase(0, { input: "nums = [4,5,6]" });
      });

      expect(result.current.state.previewData?.testCases[0].input).toBe("nums = [4,5,6]");
    });
  });

  describe("removePreviewTestCase", () => {
    it("should remove test case at index", async () => {
      const mockResponse = {
        problem: {
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy" as const,
          category_id: "arrays-hashing",
          description: "Given an array...",
          function_signature: "def twoSum(nums, target):",
          companies: [],
          examples: [],
          constraints: [],
          hints: [],
          recommended_time_complexity: null,
          recommended_space_complexity: null,
        },
        testCases: [
          {
            input: "test1",
            expected_output: "out1",
            input_json: {},
            expected_json: {},
            explanation: "",
          },
          {
            input: "test2",
            expected_output: "out2",
            input_json: {},
            expected_json: {},
            explanation: "",
          },
        ],
        solutions: [],
        warnings: [],
        categories: [],
      };

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useLeetCodeImport());

      await act(async () => {
        await result.current.fetchProblem("https://leetcode.com/problems/two-sum/");
      });

      expect(result.current.state.previewData?.testCases).toHaveLength(2);

      act(() => {
        result.current.removePreviewTestCase(0);
      });

      expect(result.current.state.previewData?.testCases).toHaveLength(1);
      expect(result.current.state.previewData?.testCases[0].input).toBe("test2");
    });
  });

  describe("saveProblem", () => {
    it("should return false for invalid problem", async () => {
      const { result } = renderHook(() => useLeetCodeImport());

      const invalidProblem = {
        id: "",
        title: "",
        difficulty: "Easy" as const,
        category_id: null,
        description: "",
        function_signature: "",
        companies: [],
        examples: [],
        constraints: [],
        hints: [],
        recommended_time_complexity: null,
        recommended_space_complexity: null,
      };

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveProblem(invalidProblem, [], []);
      });

      expect(success).toBe(false);
      expect(result.current.state.error).toBeTruthy();
    });

    it("should save problem, test cases, and solutions", async () => {
      // Mock successful inserts
      const mockInsertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "problems") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "test_cases") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "problem_solutions") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockInsertBuilder;
      });

      const { result } = renderHook(() => useLeetCodeImport());

      const validProblem = {
        id: "two-sum",
        title: "Two Sum",
        difficulty: "Easy" as const,
        category_id: "arrays-hashing",
        description: "Given an array...",
        function_signature: "def twoSum(nums, target):",
        companies: ["Google"],
        examples: [{ input: "nums = [1,2]", output: "[0,1]" }],
        constraints: ["1 <= nums.length"],
        hints: ["Try using a hash map"],
        recommended_time_complexity: "O(n)",
        recommended_space_complexity: "O(n)",
      };

      const testCases = [
        {
          input: "nums = [3,4]",
          expected_output: "[0,1]",
          input_json: { nums: [3, 4] },
          expected_json: [0, 1],
          explanation: "Edge case",
        },
      ];

      const solutions = [
        {
          title: "Optimal",
          code: "def twoSum(nums, target): pass",
          time_complexity: "O(n)",
          space_complexity: "O(n)",
          explanation: "Use hash map",
          approach_type: "optimal" as const,
        },
      ];

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveProblem(validProblem, testCases, solutions);
      });

      expect(success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("problems");
      expect(mockFrom).toHaveBeenCalledWith("test_cases");
      expect(mockFrom).toHaveBeenCalledWith("problem_solutions");
    });
  });
});
