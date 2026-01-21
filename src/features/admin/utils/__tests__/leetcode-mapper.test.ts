import { describe, it, expect } from "vitest";
import {
  isValidLeetCodeUrl,
  extractSlugFromUrl,
  getDifficultyColorClass,
  truncateText,
  formatComplexity,
  validateImportedProblem,
  formatTestCaseDisplay,
  parseComplexityFromSolution,
} from "../leetcode-mapper";

describe("leetcode-mapper utilities", () => {
  describe("isValidLeetCodeUrl", () => {
    it("should return true for valid LeetCode problem URLs", () => {
      expect(isValidLeetCodeUrl("https://leetcode.com/problems/two-sum/")).toBe(true);
      expect(isValidLeetCodeUrl("https://leetcode.com/problems/reverse-integer/")).toBe(true);
      expect(isValidLeetCodeUrl("https://leetcode.com/problems/two-sum/description/")).toBe(true);
      expect(isValidLeetCodeUrl("https://leetcode.com/problems/two-sum/solutions/")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidLeetCodeUrl("https://google.com")).toBe(false);
      expect(isValidLeetCodeUrl("https://leetcode.com/")).toBe(false);
      expect(isValidLeetCodeUrl("https://leetcode.com/explore/")).toBe(false);
      expect(isValidLeetCodeUrl("not-a-url")).toBe(false);
      expect(isValidLeetCodeUrl("")).toBe(false);
    });

    it("should handle null/undefined gracefully", () => {
      expect(isValidLeetCodeUrl(null as unknown as string)).toBe(false);
      expect(isValidLeetCodeUrl(undefined as unknown as string)).toBe(false);
    });
  });

  describe("extractSlugFromUrl", () => {
    it("should extract slug from standard problem URL", () => {
      expect(extractSlugFromUrl("https://leetcode.com/problems/two-sum/")).toBe("two-sum");
      expect(extractSlugFromUrl("https://leetcode.com/problems/reverse-integer/")).toBe("reverse-integer");
      expect(extractSlugFromUrl("https://leetcode.com/problems/median-of-two-sorted-arrays/")).toBe("median-of-two-sorted-arrays");
    });

    it("should extract slug from description URL", () => {
      expect(extractSlugFromUrl("https://leetcode.com/problems/two-sum/description/")).toBe("two-sum");
    });

    it("should extract slug from solutions URL", () => {
      expect(extractSlugFromUrl("https://leetcode.com/problems/two-sum/solutions/")).toBe("two-sum");
    });

    it("should extract slug from submissions URL", () => {
      expect(extractSlugFromUrl("https://leetcode.com/problems/two-sum/submissions/")).toBe("two-sum");
    });

    it("should handle URLs with query parameters", () => {
      expect(extractSlugFromUrl("https://leetcode.com/problems/two-sum/?lang=en")).toBe("two-sum");
    });

    it("should return null for invalid URLs", () => {
      expect(extractSlugFromUrl("https://google.com")).toBe(null);
      expect(extractSlugFromUrl("invalid")).toBe(null);
      expect(extractSlugFromUrl("")).toBe(null);
    });
  });

  describe("getDifficultyColorClass", () => {
    it("should return green for Easy", () => {
      expect(getDifficultyColorClass("Easy")).toBe("bg-green-100 text-green-800");
      expect(getDifficultyColorClass("easy")).toBe("bg-green-100 text-green-800");
    });

    it("should return yellow for Medium", () => {
      expect(getDifficultyColorClass("Medium")).toBe("bg-yellow-100 text-yellow-800");
      expect(getDifficultyColorClass("medium")).toBe("bg-yellow-100 text-yellow-800");
    });

    it("should return red for Hard", () => {
      expect(getDifficultyColorClass("Hard")).toBe("bg-red-100 text-red-800");
      expect(getDifficultyColorClass("hard")).toBe("bg-red-100 text-red-800");
    });

    it("should return gray for unknown difficulty", () => {
      expect(getDifficultyColorClass("Unknown")).toBe("bg-gray-100 text-gray-800");
      expect(getDifficultyColorClass("")).toBe("bg-gray-100 text-gray-800");
    });
  });

  describe("truncateText", () => {
    it("should return text unchanged if shorter than max length", () => {
      expect(truncateText("Hello", 10)).toBe("Hello");
      expect(truncateText("Test", 4)).toBe("Test");
    });

    it("should truncate text with ellipsis if longer than max length", () => {
      expect(truncateText("Hello World", 8)).toBe("Hello...");
      expect(truncateText("This is a long text", 10)).toBe("This is...");
    });

    it("should handle edge cases", () => {
      expect(truncateText("", 5)).toBe("");
      expect(truncateText("Hi", 3)).toBe("Hi");
    });
  });

  describe("formatComplexity", () => {
    it("should return the complexity string if provided", () => {
      expect(formatComplexity("O(n)")).toBe("O(n)");
      expect(formatComplexity("O(n log n)")).toBe("O(n log n)");
      expect(formatComplexity("O(1)")).toBe("O(1)");
    });

    it("should return 'Not specified' for null/undefined/empty", () => {
      expect(formatComplexity(null)).toBe("Not specified");
      expect(formatComplexity(undefined)).toBe("Not specified");
      expect(formatComplexity("")).toBe("Not specified");
    });
  });

  describe("validateImportedProblem", () => {
    it("should return valid for complete problem", () => {
      const problem = {
        id: "two-sum",
        title: "Two Sum",
        category_id: "arrays-hashing",
        function_signature: "def twoSum(nums, target):",
      };
      const result = validateImportedProblem(problem);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for missing id", () => {
      const problem = {
        id: "",
        title: "Two Sum",
        category_id: "arrays-hashing",
        function_signature: "def twoSum(nums, target):",
      };
      const result = validateImportedProblem(problem);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Problem ID (slug) is required");
    });

    it("should return errors for missing title", () => {
      const problem = {
        id: "two-sum",
        title: "",
        category_id: "arrays-hashing",
        function_signature: "def twoSum(nums, target):",
      };
      const result = validateImportedProblem(problem);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Title is required");
    });

    it("should return errors for missing category", () => {
      const problem = {
        id: "two-sum",
        title: "Two Sum",
        category_id: null,
        function_signature: "def twoSum(nums, target):",
      };
      const result = validateImportedProblem(problem);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Category is required");
    });

    it("should return errors for missing function signature", () => {
      const problem = {
        id: "two-sum",
        title: "Two Sum",
        category_id: "arrays-hashing",
        function_signature: "",
      };
      const result = validateImportedProblem(problem);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Function signature is required");
    });

    it("should return multiple errors for multiple missing fields", () => {
      const problem = {
        id: "",
        title: "",
        category_id: null,
        function_signature: "",
      };
      const result = validateImportedProblem(problem);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });

  describe("formatTestCaseDisplay", () => {
    it("should format test case input for display", () => {
      expect(formatTestCaseDisplay("nums = [1, 2, 3]", 20)).toBe("nums = [1, 2, 3]");
      // Note: truncateText takes substring(0, maxLength-3), so "a very " (7 chars) + "..."
      expect(formatTestCaseDisplay("a very long input string", 10)).toBe("a very ...");
    });

    it("should clean up newlines and extra spaces", () => {
      expect(formatTestCaseDisplay("nums = [1,\n2,\n3]", 50)).toBe("nums = [1, 2, 3]");
      expect(formatTestCaseDisplay("nums =   [1,   2]", 50)).toBe("nums = [1, 2]");
    });
  });

  describe("parseComplexityFromSolution", () => {
    it("should return provided complexities", () => {
      const result = parseComplexityFromSolution("O(n)", "O(1)");
      expect(result.time).toBe("O(n)");
      expect(result.space).toBe("O(1)");
    });

    it("should return O(?) for missing time complexity", () => {
      const result = parseComplexityFromSolution("", "O(n)");
      expect(result.time).toBe("O(?)");
      expect(result.space).toBe("O(n)");
    });

    it("should return O(?) for missing space complexity", () => {
      const result = parseComplexityFromSolution("O(n)", "");
      expect(result.time).toBe("O(n)");
      expect(result.space).toBe("O(?)");
    });
  });
});
