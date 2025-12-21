// Admin Dashboard Utility Functions

/**
 * Format token count for display
 * @example formatTokens(1500000) => "1.5M"
 * @example formatTokens(50000) => "50k"
 */
export const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}k`;
  return tokens.toString();
};

/**
 * Calculate usage percentage (capped at 100%)
 */
export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
};

/**
 * Get usage bar color based on percentage
 */
export const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-green-500";
};

/**
 * Format date string to locale date
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleDateString();
};

/**
 * Format date string to locale date and time
 */
export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleString();
};
