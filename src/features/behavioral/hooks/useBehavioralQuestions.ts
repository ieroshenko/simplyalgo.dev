import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";
import type { BehavioralQuestion, BehavioralQuestionCategory, QuestionDifficulty } from "@/types";

// Cache configuration
const STALE_TIME = 10 * 60 * 1000; // 10 minutes - questions rarely change
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// Fetch behavioral questions from database
async function fetchBehavioralQuestions(
  userId: string | undefined,
  filters?: {
    category?: BehavioralQuestionCategory;
    difficulty?: QuestionDifficulty;
    company?: string;
    includeCustom?: boolean;
  }
): Promise<BehavioralQuestion[]> {
  let query = supabase.from("behavioral_questions").select("*");

  // Show curated questions (user_id IS NULL) and optionally user's custom questions
  if (filters?.includeCustom && userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    logger.debug("Fetching questions with user_id", {
      component: "useBehavioralQuestions",
      userId,
    });
  } else {
    query = query.is("user_id", null);
    logger.debug("Fetching only curated questions", {
      component: "useBehavioralQuestions",
    });
  }

  query = query.order("created_at", { ascending: false });

  // Apply filters
  if (filters?.category) {
    query = query.contains("category", [filters.category]);
  }

  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  if (filters?.company) {
    query = query.contains("company_associations", [filters.company]);
  }

  const { data, error: fetchError } = await query;

  if (fetchError) {
    logger.error("Error fetching questions", fetchError, {
      component: "useBehavioralQuestions",
    });
    throw fetchError;
  }

  logger.debug("Fetched questions", {
    component: "useBehavioralQuestions",
    count: data?.length,
    userId,
  });

  // Transform database format to TypeScript interface
  const transformedQuestions: BehavioralQuestion[] = (data || []).map((q) => ({
    id: q.id,
    question_text: q.question_text,
    category: q.category as BehavioralQuestionCategory[],
    difficulty: q.difficulty as QuestionDifficulty,
    follow_up_questions: q.follow_up_questions as string[] | undefined,
    key_traits: q.key_traits || [],
    related_question_ids: q.related_question_ids || [],
    company_associations: q.company_associations || [],
    user_id: q.user_id || undefined,
    evaluation_type: (q.evaluation_type || "star") as "star" | "none" | "custom",
    custom_evaluation_prompt: q.custom_evaluation_prompt || undefined,
    created_at: q.created_at || "",
    updated_at: q.updated_at || "",
  }));

  return transformedQuestions;
}

export const useBehavioralQuestions = (filters?: {
  category?: BehavioralQuestionCategory;
  difficulty?: QuestionDifficulty;
  company?: string;
  includeCustom?: boolean;
}) => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Build query key based on filters
  const queryKey = [
    "behavioralQuestions",
    user?.id,
    filters?.category,
    filters?.difficulty,
    filters?.company,
    filters?.includeCustom,
  ];

  const {
    data: questions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchBehavioralQuestions(user?.id, filters),
    enabled: !authLoading && !(filters?.includeCustom && user === undefined),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["behavioralQuestions"] });
  };

  return {
    questions,
    loading: isLoading || authLoading,
    error: error ? (error as Error).message : null,
    refresh,
  };
};
