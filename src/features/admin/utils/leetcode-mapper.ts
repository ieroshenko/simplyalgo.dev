// LeetCode Import Utilities

/**
 * Validate if a URL is a valid LeetCode problem URL
 */
export function isValidLeetCodeUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "leetcode.com" &&
      parsed.pathname.startsWith("/problems/")
    );
  } catch {
    return false;
  }
}

/**
 * Extract the problem slug from a LeetCode URL
 */
export function extractSlugFromUrl(url: string): string | null {
  if (!isValidLeetCodeUrl(url)) {
    return null;
  }

  const patterns = [
    /leetcode\.com\/problems\/([^/]+)/,
    /leetcode\.com\/problems\/([^/]+)\/description/,
    /leetcode\.com\/problems\/([^/]+)\/solutions/,
    /leetcode\.com\/problems\/([^/]+)\/submissions/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Remove trailing slash and query params
      return match[1].replace(/\/$/, "").split("?")[0];
    }
  }

  return null;
}

/**
 * Format difficulty badge color class
 */
export function getDifficultyColorClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "hard":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Format complexity string for display
 */
export function formatComplexity(complexity: string | null | undefined): string {
  if (!complexity) {
    return "Not specified";
  }
  return complexity;
}

/**
 * Validate that required fields are present in the imported problem
 */
export function validateImportedProblem(problem: {
  id: string;
  title: string;
  category_id: string | null;
  function_signature: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!problem.id || problem.id.trim() === "") {
    errors.push("Problem ID (slug) is required");
  }

  if (!problem.title || problem.title.trim() === "") {
    errors.push("Title is required");
  }

  if (!problem.category_id) {
    errors.push("Category is required");
  }

  if (!problem.function_signature || problem.function_signature.trim() === "") {
    errors.push("Function signature is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format test case for display
 */
export function formatTestCaseDisplay(input: string, maxLength: number = 50): string {
  const cleaned = input.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  return truncateText(cleaned, maxLength);
}

/**
 * Parse complexity from solution (e.g., "O(n)" -> { time: "O(n)", space: "O(1)" })
 */
export function parseComplexityFromSolution(
  timeComplexity: string,
  spaceComplexity: string
): { time: string; space: string } {
  return {
    time: timeComplexity || "O(?)",
    space: spaceComplexity || "O(?)",
  };
}
