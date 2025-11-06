import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SystemDesignSpec, Category } from "@/types";

// Minimal DB row types for stronger typing within this hook
type AttemptRow = {
  problem_id: string;
  status: string;
};

type StarRow = {
  problem_id: string;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  sort_order?: number | null;
};

type SystemDesignSpecRowWithRelations = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  companies?: string[] | null;
  categories: { name: string; color: string };
  system_design_specs: {
    summary: string;
    functional_requirements: unknown;
    nonfunctional_requirements: unknown;
    assumptions: unknown;
    scale_estimates: unknown;
    constraints: unknown;
    hints: unknown;
    starter_canvas: unknown;
    rubric: unknown;
    coach_questions: unknown;
    expected_topics: unknown;
    estimated_time_minutes?: number | null;
  };
};

type SystemDesignSpecsQueryResult = {
  problem_id: string;
  problems: {
    id: string;
    categories: {
      name: string;
    };
  };
};

type SystemDesignSpecsProblemIdResult = {
  problem_id: string;
};

type ProblemIdWithCategory = {
  id: string;
  categories: { name: string | null } | null;
};

export const useSystemDesignSpecs = (userId?: string) => {
  const [specs, setSpecs] = useState<SystemDesignSpec[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecs = useCallback(async () => {
    try {
      // Fetch problems that have system_design_specs entries
      // Query from problems table and join with system_design_specs
      const query = supabase
        .from("problems")
        .select(`
          id,
          title,
          difficulty,
          companies,
          categories!inner(name, color),
          system_design_specs!inner(
            summary,
            functional_requirements,
            nonfunctional_requirements,
            assumptions,
            scale_estimates,
            constraints,
            hints,
            starter_canvas,
            rubric,
            coach_questions,
            expected_topics,
            estimated_time_minutes
          )
        `);

      const { data: specsData, error: specsError } = await query;

      if (specsError) throw specsError;

      // Fetch user-specific data separately if userId exists
      // Run these queries in parallel for better performance
      let userAttempts: AttemptRow[] = [];
      let userStars: StarRow[] = [];

      if (userId) {
        const [attemptsResult, starsResult] = await Promise.all([
          supabase
            .from("user_problem_attempts")
            .select("problem_id, status")
            .eq("user_id", userId),
          supabase
            .from("user_starred_problems")
            .select("problem_id")
            .eq("user_id", userId),
        ]);

        userAttempts = (attemptsResult.data as AttemptRow[] | null) || [];
        userStars = (starsResult.data as StarRow[] | null) || [];
      }

      const typedSpecs = specsData as unknown as SystemDesignSpecRowWithRelations[];
      const formattedSpecs: SystemDesignSpec[] = typedSpecs.map((spec) => {
        const attemptsForSpec: AttemptRow[] = userAttempts.filter(
          (a) => a.problem_id === spec.id,
        );
        const isStarred = userStars.some((s) => s.problem_id === spec.id);

        // system_design_specs is returned as an array with one element due to Supabase join
        const sds = Array.isArray(spec.system_design_specs) 
          ? spec.system_design_specs[0] 
          : spec.system_design_specs;

        if (!sds) {
          // Skip if no system_design_specs data (shouldn't happen with inner join, but safety check)
          return null;
        }

        return {
          id: spec.id,
          title: spec.title,
          difficulty: spec.difficulty,
          category: spec.categories.name,
          status: getStatus(attemptsForSpec),
          isStarred,
          companies: spec.companies ? (spec.companies as string[]) : undefined,
          summary: sds.summary || "",
          functional_requirements: (sds.functional_requirements || []) as string[],
          nonfunctional_requirements: (sds.nonfunctional_requirements || []) as string[],
          assumptions: (sds.assumptions || []) as string[],
          scale_estimates: (sds.scale_estimates || {}) as Record<string, unknown>,
          constraints: (sds.constraints || []) as string[],
          hints: (sds.hints || []) as string[],
          starter_canvas: (sds.starter_canvas || {}) as Record<string, unknown>,
          rubric: (sds.rubric || {
            axes: [],
            weights: {},
            must_have: [],
          }) as {
            axes: string[];
            weights: Record<string, number>;
            must_have: string[];
          },
          coach_questions: (sds.coach_questions || []) as string[],
          expected_topics: (sds.expected_topics || []) as string[],
          estimated_time_minutes: sds.estimated_time_minutes ?? undefined,
        } as SystemDesignSpec;
      }).filter((spec): spec is SystemDesignSpec => spec !== null);

      setSpecs(formattedSpecs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    try {
      // 1) Load categories (to preserve ordering and colors)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, color, sort_order")
        .order("sort_order");

      if (categoriesError) throw categoriesError;

      // 2) Load system design problems with their category name to compute totals map
      // Query system_design_specs and join with problems to get category info
      // Using type assertion since system_design_specs might not be in generated types
      const { data: sdSpecsData } = await (supabase
        .from("system_design_specs" as never)
        .select("problem_id, problems!inner(id, categories(name))") as never) as {
        data: SystemDesignSpecsQueryResult[] | null;
      };

      if (!sdSpecsData) {
        setCategories([]);
        setLoading(false);
        return;
      }

      const problemsData = sdSpecsData.map((item) => ({
        id: item.problems.id,
        categories: item.problems.categories,
      }));

      const totalsByCategory = new Map<string, number>();
      const problemIdToCategory = new Map<string, string>();

      ((problemsData as ProblemIdWithCategory[] | null) || []).forEach((problem) => {
        const catName: string = problem?.categories?.name || "Unknown";
        totalsByCategory.set(catName, (totalsByCategory.get(catName) || 0) + 1);
        problemIdToCategory.set(problem.id, catName);
      });

      // 3) If we have a user, compute solved per category from attempts
      const solvedByCategory = new Map<string, number>();
      if (userId) {
        // Get system design problem IDs by querying system_design_specs table
        // Using type assertion since system_design_specs might not be in generated types
        const { data: sdProblemsData } = await (supabase
          .from("system_design_specs" as never)
          .select("problem_id") as never) as {
          data: SystemDesignSpecsProblemIdResult[] | null;
        };

        const sdProblemIds = new Set(
          (sdProblemsData || []).map((p) => p.problem_id),
        );

        const { data: attemptsData, error: attemptsError } = await supabase
          .from("user_problem_attempts")
          .select("problem_id, status")
          .eq("user_id", userId)
          .eq("status", "passed");

        if (attemptsError) throw attemptsError;

        // Count distinct problem_ids solved per category (only for system design problems)
        const solvedProblemIds = new Set<string>();
        ((attemptsData as AttemptRow[] | null) || []).forEach((attempt) => {
          if (attempt?.problem_id && sdProblemIds.has(attempt.problem_id)) {
            solvedProblemIds.add(attempt.problem_id);
          }
        });

        solvedProblemIds.forEach((pid) => {
          const catName = problemIdToCategory.get(pid);
          if (!catName) return;
          solvedByCategory.set(
            catName,
            (solvedByCategory.get(catName) || 0) + 1,
          );
        });
      }

      // 4) Assemble final categories using DB order
      const formattedCategories: Category[] = ((categoriesData as CategoryRow[] | null) || []).map(
        (category) => ({
          name: category.name,
          solved: solvedByCategory.get(category.name) || 0,
          total: totalsByCategory.get(category.name) || 0,
          color: category.color,
        }),
      );

      setCategories(formattedCategories);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refetch = useCallback(() => {
    fetchSpecs();
    fetchCategories();
  }, [fetchSpecs, fetchCategories]);

  useEffect(() => {
    fetchSpecs();
    fetchCategories();
  }, [fetchSpecs, fetchCategories]);

  const getStatus = (
    attempts: AttemptRow[],
  ): "solved" | "attempted" | "not-started" => {
    if (!attempts || attempts.length === 0) return "not-started";

    const hasPassed = attempts.some((attempt) => attempt.status === "passed");
    if (hasPassed) return "solved";

    return "attempted";
  };

  const toggleStar = async (problemId: string) => {
    if (!userId) return;

    try {
      const spec = specs.find((s) => s.id === problemId);
      if (!spec) return;

      if (spec.isStarred) {
        // Remove star
        const { error } = await supabase
          .from("user_starred_problems")
          .delete()
          .eq("user_id", userId)
          .eq("problem_id", problemId);

        if (error) throw error;
      } else {
        // Add star
        const { error } = await supabase
          .from("user_starred_problems")
          .insert({ user_id: userId, problem_id: problemId });

        if (error) throw error;
      }

      // Update local state
      setSpecs((prev) =>
        prev.map((s) =>
          s.id === problemId ? { ...s, isStarred: !s.isStarred } : s,
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(message);
    }
  };

  return {
    specs,
    categories,
    loading,
    error,
    toggleStar,
    refetch,
  };
};

