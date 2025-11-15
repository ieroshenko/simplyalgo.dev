import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BehavioralQuestion, BehavioralQuestionCategory, QuestionDifficulty } from "@/types";

export const useBehavioralQuestions = (
  filters?: {
    category?: BehavioralQuestionCategory;
    difficulty?: QuestionDifficulty;
    company?: string;
    includeCustom?: boolean; // Include user's custom questions
  }
) => {
  const { user, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<BehavioralQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      // If includeCustom is true, wait for auth to finish loading
      // Only proceed if auth is loaded (user could be null or a user object, but not undefined)
      if (filters?.includeCustom && authLoading) {
        setLoading(true);
        return; // Wait for auth to load
      }
      
      // If includeCustom is true but user is undefined (not loaded yet), wait
      if (filters?.includeCustom && user === undefined) {
        setLoading(true);
        return; // Wait for user to load (user is undefined, not yet loaded)
      }

      try {
        setLoading(true);
        let query = (supabase as any)
          .from("behavioral_questions")
          .select("*");

        // Show curated questions (user_id IS NULL) and optionally user's custom questions
        if (filters?.includeCustom && user?.id) {
          // Fetch both curated and user's custom questions using OR condition
          // Format: user_id.is.null,user_id.eq.{user_id}
          query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
          console.log("Fetching questions with user_id:", user.id);
        } else {
          // Only show curated questions (user_id IS NULL)
          query = query.is("user_id", null);
          console.log("Fetching only curated questions (user:", user, "includeCustom:", filters?.includeCustom);
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
          console.error("Error fetching questions:", fetchError);
          throw fetchError;
        }

        console.log("Fetched questions count:", data?.length, "User ID:", user?.id);
        if (filters?.includeCustom && user?.id) {
          const customCount = data?.filter((q: any) => q.user_id === user.id).length || 0;
          const curatedCount = data?.filter((q: any) => !q.user_id).length || 0;
          console.log("Custom questions:", customCount, "Curated questions:", curatedCount);
        }

        // Transform database format to TypeScript interface
        const transformedQuestions: BehavioralQuestion[] = ((data as any) || []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          category: q.category || [],
          difficulty: q.difficulty as QuestionDifficulty,
          follow_up_questions: q.follow_up_questions as string[] | undefined,
          key_traits: q.key_traits || [],
          related_question_ids: q.related_question_ids || [],
          company_associations: q.company_associations || [],
          user_id: q.user_id || undefined,
          evaluation_type: (q.evaluation_type || 'star') as 'star' | 'none' | 'custom',
          custom_evaluation_prompt: q.custom_evaluation_prompt || undefined,
          created_at: q.created_at,
          updated_at: q.updated_at,
        }));

        setQuestions(transformedQuestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch questions");
        console.error("Error fetching behavioral questions:", err);
        setQuestions([]); // Set empty array on error to avoid stale data
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [filters?.category, filters?.difficulty, filters?.company, filters?.includeCustom, user, refreshKey, authLoading]);

  const refresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return { questions, loading, error, refresh };
};

