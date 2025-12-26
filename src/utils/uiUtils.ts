/**
 * Common UI utility functions shared across the application
 */

/**
 * Get the appropriate color classes for a difficulty badge
 * @param difficulty - The difficulty level (Easy, Medium, Hard, or other levels)
 * @returns Tailwind CSS classes for the badge
 */
export const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
        case "easy":
        case "beginner":
            return "bg-success text-success-foreground";
        case "medium":
        case "intermediate":
            return "bg-amber-500 text-white";
        case "hard":
        case "advanced":
            return "bg-destructive text-destructive-foreground";
        default:
            return "bg-muted text-muted-foreground";
    }
};

/**
 * Format a relative time string from an ISO date
 * @param isoDate - ISO date string
 * @returns Human-readable relative time (e.g., "5 minutes ago", "2 days ago")
 */
export const formatRelativeTime = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
    }

    return date.toLocaleDateString();
};

/**
 * Extract error message from unknown error type
 * @param err - The caught error (can be Error, string, or unknown)
 * @param fallback - Fallback message if error cannot be parsed
 * @returns The error message string
 */
export const getErrorMessage = (err: unknown, fallback = "An error occurred"): string => {
    if (err instanceof Error) {
        return err.message;
    }
    if (typeof err === "string") {
        return err;
    }
    return fallback;
};
