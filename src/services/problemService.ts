import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

// ============================================================================
// Types
// ============================================================================

export interface ProblemRow {
    id: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    description: string;
    function_signature: string;
    examples?: Array<{ input: string; output: string; explanation?: string }> | null;
    constraints?: string[] | null;
    likes?: number | null;
    dislikes?: number | null;
    acceptance_rate?: number | null;
    recommended_time_complexity?: string | null;
    recommended_space_complexity?: string | null;
    companies?: string[] | null;
}

export interface ProblemWithRelations extends ProblemRow {
    categories: { name: string; color: string };
    test_cases: Array<{ input: string; expected_output: string }> | null;
}

export interface CategoryRow {
    id: string;
    name: string;
    color: string;
    sort_order?: number | null;
}

export interface UserStarRow {
    problem_id: string;
}

export interface UserAttemptStatusRow {
    problem_id: string;
    status: string;
}

// ============================================================================
// ProblemService
// ============================================================================

/**
 * Service class for problem-related database operations.
 * Centralizes all Supabase queries for problems, categories, and user interactions.
 *
 * @example
 * ```typescript
 * // Fetch all problems with relations
 * const problems = await ProblemService.getAllWithRelations();
 *
 * // Fetch user's starred problems
 * const stars = await ProblemService.getUserStars(userId);
 *
 * // Toggle a star
 * await ProblemService.toggleStar(userId, problemId, isCurrentlyStarred);
 * ```
 */
export class ProblemService {
    // ---------------------------------------------------------------------------
    // Problem Queries
    // ---------------------------------------------------------------------------

    /**
     * Fetch all problems with their categories and test cases
     */
    static async getAllWithRelations(): Promise<ProblemWithRelations[]> {
        const { data, error } = await supabase
            .from("problems")
            .select(`
        *,
        categories!inner(name, color),
        test_cases(input, expected_output)
      `);

        if (error) {
            logger.error("[ProblemService] Error fetching problems", { error });
            throw error;
        }

        logger.debug("[ProblemService] Fetched problems", { count: data?.length });
        return (data as unknown as ProblemWithRelations[]) ?? [];
    }

    /**
     * Fetch a single problem by ID with full details
     */
    static async getById(id: string): Promise<ProblemWithRelations | null> {
        const { data, error } = await supabase
            .from("problems")
            .select(`
        *,
        categories!inner(name, color),
        test_cases(input, expected_output)
      `)
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // Not found
                return null;
            }
            logger.error("[ProblemService] Error fetching problem by ID", { id, error });
            throw error;
        }

        return data as unknown as ProblemWithRelations;
    }

    /**
     * Fetch problems by difficulty level
     */
    static async getByDifficulty(
        difficulty: "Easy" | "Medium" | "Hard"
    ): Promise<ProblemWithRelations[]> {
        const { data, error } = await supabase
            .from("problems")
            .select(`
        *,
        categories!inner(name, color),
        test_cases(input, expected_output)
      `)
            .eq("difficulty", difficulty)
            .order("title");

        if (error) {
            logger.error("[ProblemService] Error fetching problems by difficulty", {
                difficulty,
                error,
            });
            throw error;
        }

        return (data as unknown as ProblemWithRelations[]) ?? [];
    }

    /**
     * Search problems by title (case-insensitive)
     */
    static async searchByTitle(query: string): Promise<ProblemWithRelations[]> {
        const { data, error } = await supabase
            .from("problems")
            .select(`
        *,
        categories!inner(name, color),
        test_cases(input, expected_output)
      `)
            .ilike("title", `%${query}%`)
            .order("title");

        if (error) {
            logger.error("[ProblemService] Error searching problems", { query, error });
            throw error;
        }

        return (data as unknown as ProblemWithRelations[]) ?? [];
    }

    // ---------------------------------------------------------------------------
    // Category Queries
    // ---------------------------------------------------------------------------

    /**
     * Fetch all categories ordered by sort_order
     */
    static async getAllCategories(): Promise<CategoryRow[]> {
        const { data, error } = await supabase
            .from("categories")
            .select("id, name, color, sort_order")
            .order("sort_order");

        if (error) {
            logger.error("[ProblemService] Error fetching categories", { error });
            throw error;
        }

        return (data as CategoryRow[]) ?? [];
    }

    /**
     * Get problem counts per category
     */
    static async getCategoryCounts(): Promise<Map<string, number>> {
        const { data, error } = await supabase
            .from("problems")
            .select("id, categories(name)");

        if (error) {
            logger.error("[ProblemService] Error fetching category counts", { error });
            throw error;
        }

        const counts = new Map<string, number>();
        (data ?? []).forEach((problem: { categories: { name: string | null } | null }) => {
            const catName = problem?.categories?.name ?? "Unknown";
            counts.set(catName, (counts.get(catName) ?? 0) + 1);
        });

        return counts;
    }

    // ---------------------------------------------------------------------------
    // User Interaction Queries
    // ---------------------------------------------------------------------------

    /**
     * Fetch user's starred problems
     */
    static async getUserStars(userId: string): Promise<UserStarRow[]> {
        const { data, error } = await supabase
            .from("user_starred_problems")
            .select("problem_id")
            .eq("user_id", userId);

        if (error) {
            logger.error("[ProblemService] Error fetching user stars", { userId, error });
            throw error;
        }

        return (data as UserStarRow[]) ?? [];
    }

    /**
     * Fetch user's attempt statuses for all problems
     */
    static async getUserAttemptStatuses(userId: string): Promise<UserAttemptStatusRow[]> {
        const { data, error } = await supabase
            .from("user_problem_attempts")
            .select("problem_id, status")
            .eq("user_id", userId);

        if (error) {
            logger.error("[ProblemService] Error fetching user attempt statuses", {
                userId,
                error,
            });
            throw error;
        }

        return (data as UserAttemptStatusRow[]) ?? [];
    }

    /**
     * Fetch user's solved problem IDs
     */
    static async getUserSolvedProblemIds(userId: string): Promise<Set<string>> {
        const { data, error } = await supabase
            .from("user_problem_attempts")
            .select("problem_id")
            .eq("user_id", userId)
            .eq("status", "passed");

        if (error) {
            logger.error("[ProblemService] Error fetching solved problems", { userId, error });
            throw error;
        }

        return new Set((data ?? []).map((row) => row.problem_id));
    }

    // ---------------------------------------------------------------------------
    // User Interaction Mutations
    // ---------------------------------------------------------------------------

    /**
     * Add a star to a problem
     */
    static async addStar(userId: string, problemId: string): Promise<void> {
        const { error } = await supabase
            .from("user_starred_problems")
            .insert({ user_id: userId, problem_id: problemId });

        if (error) {
            logger.error("[ProblemService] Error adding star", { userId, problemId, error });
            throw error;
        }

        logger.debug("[ProblemService] Added star", { userId, problemId });
    }

    /**
     * Remove a star from a problem
     */
    static async removeStar(userId: string, problemId: string): Promise<void> {
        const { error } = await supabase
            .from("user_starred_problems")
            .delete()
            .eq("user_id", userId)
            .eq("problem_id", problemId);

        if (error) {
            logger.error("[ProblemService] Error removing star", { userId, problemId, error });
            throw error;
        }

        logger.debug("[ProblemService] Removed star", { userId, problemId });
    }

    /**
     * Toggle a star on a problem
     */
    static async toggleStar(
        userId: string,
        problemId: string,
        isCurrentlyStarred: boolean
    ): Promise<boolean> {
        if (isCurrentlyStarred) {
            await this.removeStar(userId, problemId);
            return false;
        } else {
            await this.addStar(userId, problemId);
            return true;
        }
    }
}
