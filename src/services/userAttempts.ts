import { supabase } from "@/integrations/supabase/client";
import {
  SupabaseError,
  SupabaseQueryResult,
  type UserAttempt,
} from "@/types/supabase-common";
import { TestResult } from "@/types";
import { Json } from "@/integrations/supabase/types";
import { normalizeCode } from "@/utils/code";
import { logger } from "@/utils/logger";

export { type UserAttempt };

export class UserAttemptsService {
  // Fetch recent activity for a user with problem join
  static async getRecentActivity(
    userId: string,
    limit = 5,
  ): Promise<
    Array<{
      id: string;
      problem_id: string;
      status: "pending" | "passed" | "failed" | "error" | null;
      created_at: string;
      updated_at: string;
      problem: { title: string; difficulty: "Easy" | "Medium" | "Hard" } | null;
    }>
  > {
    interface RecentActivityRow {
      id: string;
      problem_id: string;
      status: "pending" | "passed" | "failed" | "error" | null;
      created_at: string;
      updated_at: string;
      problems: { title: string; difficulty: "Easy" | "Medium" | "Hard" } | null;
    }

    const { data, error } = (await supabase
      .from("user_problem_attempts")
      .select(
        "id, problem_id, status, created_at, updated_at, problems(title, difficulty)",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit)) as SupabaseQueryResult<RecentActivityRow[]>;

    if (error || !data) {
      logger.error('[UserAttemptsService] Error fetching recent activity', { userId, error });
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      problem_id: row.problem_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      problem: row.problems
        ? {
          title: row.problems.title ?? row.problem_id,
          difficulty: row.problems.difficulty as "Easy" | "Medium" | "Hard",
        }
        : null,
    }));
  }
  // Get the latest attempt for a user and problem
  static async getLatestAttempt(
    userId: string,
    problemId: string,
  ): Promise<UserAttempt | null> {
    const { data, error } = (await supabase
      .from("user_problem_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as SupabaseQueryResult<UserAttempt>;

    if (error) {
      logger.error('[UserAttemptsService] Error fetching latest attempt', { userId, problemId, error });
      return null;
    }

    return data;
  }

  // Save or update a draft attempt
  static async saveDraft(
    userId: string,
    problemId: string,
    code: string,
  ): Promise<UserAttempt | null> {
    // First try to update existing pending attempt
    const { data: existingDraft } = (await supabase
      .from("user_problem_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("status", "pending")
      .maybeSingle()) as Pick<SupabaseQueryResult<UserAttempt>, "data">;

    if (existingDraft) {
      // Update existing draft
      const { data, error } = (await supabase
        .from("user_problem_attempts")
        .update({
          code,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDraft.id)
        .select()
        .single()) as SupabaseQueryResult<UserAttempt>;

      if (error) {
        logger.error('[UserAttemptsService] Error updating draft', { userId, problemId, draftId: existingDraft.id, error });
        return null;
      }

      return data;
    } else {
      // Create new draft
      const { data, error } = (await supabase
        .from("user_problem_attempts")
        .insert({
          user_id: userId,
          problem_id: problemId,
          code,
          status: "pending",
        })
        .select()
        .single()) as SupabaseQueryResult<UserAttempt>;

      if (error) {
        logger.error('[UserAttemptsService] Error creating draft', { userId, problemId, error });
        return null;
      }

      return data;
    }
  }

  // Create a new submission (always creates new record)
  static async submitCode(
    userId: string,
    problemId: string,
    code: string,
    testResults?: TestResult[],
  ): Promise<UserAttempt | null> {
    const { data, error } = (await supabase
      .from("user_problem_attempts")
      .insert({
        user_id: userId,
        problem_id: problemId,
        code,
        status: "pending",
        test_results: testResults ? (testResults as unknown as Json) : [],
      })
      .select()
      .single()) as SupabaseQueryResult<UserAttempt>;

    if (error) {
      logger.error('[UserAttemptsService] Error submitting code', { userId, problemId, error });
      return null;
    }

    return data;
  }

  // Mark a problem as solved
  static async markProblemSolved(
    userId: string,
    problemId: string,
    code: string,
    testResults: TestResult[],
  ): Promise<UserAttempt | null> {
    // Check if this exact code already exists in accepted submissions
    const existingSubmissions = await this.getAcceptedSubmissions(userId, problemId);

    const normalizedIncoming = normalizeCode(code);
    const codeAlreadyExists = existingSubmissions.some((submission) => {
      const normalizedExisting = normalizeCode(submission?.code as unknown as string);
      return normalizedExisting === normalizedIncoming;
    });

    if (codeAlreadyExists) {
      return null;
    }

    const { data, error } = (await supabase
      .from("user_problem_attempts")
      .insert({
        user_id: userId,
        problem_id: problemId,
        code,
        status: "passed",
        test_results: testResults as unknown as Json,
      })
      .select()
      .single()) as SupabaseQueryResult<UserAttempt>;

    if (error) {
      logger.error('[UserAttemptsService] Error marking problem as solved', { userId, problemId, error });
      return null;
    }

    return data;
  }

  // Get user problem status (solved/attempted/not-started)
  static async getUserProblemStatus(
    userId: string,
    problemId: string,
  ): Promise<"solved" | "attempted" | "not-started"> {
    const { data, error } = await supabase
      .from("user_problem_attempts")
      .select("status")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return "not-started";
    }

    return data.status === "passed" ? "solved" : "attempted";
  }

  // Get all user problem statuses for multiple problems
  static async getUserProblemsStatus(
    userId: string,
    problemIds: string[],
  ): Promise<Record<string, "solved" | "attempted" | "not-started">> {
    const { data, error } = await supabase
      .from("user_problem_attempts")
      .select("problem_id, status, updated_at")
      .eq("user_id", userId)
      .in("problem_id", problemIds)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error('[UserAttemptsService] Error fetching user problem statuses', { userId, problemIds, error });
      return {};
    }

    const statusMap: Record<string, "solved" | "attempted" | "not-started"> =
      {};

    // Initialize all problems as not-started
    problemIds.forEach((id) => {
      statusMap[id] = "not-started";
    });

    // Group by problem_id and get the latest status for each
    const latestAttempts: Record<string, { problem_id: string; status: string; updated_at: string }> = {};
    data?.forEach((attempt) => {
      if (
        !latestAttempts[attempt.problem_id] ||
        new Date(attempt.updated_at) >
        new Date(latestAttempts[attempt.problem_id].updated_at)
      ) {
        latestAttempts[attempt.problem_id] = attempt;
      }
    });

    // Set status based on latest attempt
    Object.values(latestAttempts).forEach((attempt) => {
      statusMap[attempt.problem_id] =
        attempt.status === "passed" ? "solved" : "attempted";
    });

    return statusMap;
  }

  // Clear all drafts for a specific problem
  static async clearDraft(userId: string, problemId: string): Promise<boolean> {
    const { error } = await supabase
      .from("user_problem_attempts")
      .delete()
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("status", "pending");

    if (error) {
      logger.error('[UserAttemptsService] Error clearing draft', { userId, problemId, error });
      return false;
    }

    return true;
  }

  // Get all accepted submissions for a specific problem
  static async getAcceptedSubmissions(
    userId: string,
    problemId: string,
  ): Promise<UserAttempt[]> {
    const { data, error } = (await supabase
      .from("user_problem_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("status", "passed")
      .order("created_at", { ascending: false })) as SupabaseQueryResult<
        UserAttempt[]
      >;

    if (error) {
      logger.error('[UserAttemptsService] Error fetching accepted submissions', { userId, problemId, error });
      return [];
    }

    // Filter out duplicate submissions based on code content
    const uniqueSubmissions: UserAttempt[] = [];
    const seenCodes = new Set<string>();

    (data || []).forEach((submission) => {
      const normalizedCode = normalizeCode(submission?.code as unknown as string);
      if (!seenCodes.has(normalizedCode)) {
        seenCodes.add(normalizedCode);
        uniqueSubmissions.push(submission);
      }
    });

    return uniqueSubmissions;
  }

  // Save complexity analysis for a submission
  static async saveComplexityAnalysis(
    submissionId: string,
    analysis: {
      time_complexity: string;
      time_explanation: string;
      space_complexity: string;
      space_explanation: string;
      analysis: string;
    }
  ): Promise<UserAttempt | null> {
    logger.info('[UserAttemptsService] Saving analysis for submission', { submissionId });
    logger.debug('[UserAttemptsService] Analysis payload', { submissionId, analysis });

    const { data, error } = (await supabase
      .from("user_problem_attempts")
      .update({
        complexity_analysis: analysis as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .select()
      .single()) as SupabaseQueryResult<UserAttempt>;

    if (error) {
      logger.error('[UserAttemptsService] Failed to save analysis', { submissionId, error });
      return null;
    }

    logger.info('[UserAttemptsService] Successfully saved analysis', { submissionId });
    logger.debug('[UserAttemptsService] Updated submission', { submissionId, submission: data });
    return data;
  }
}
