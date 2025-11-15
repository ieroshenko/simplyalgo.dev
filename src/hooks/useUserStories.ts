import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserStory } from "@/types";

export const useUserStories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await (supabase as any)
        .from("user_stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const transformedStories: UserStory[] = ((data as any) || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        title: s.title,
        description: s.description || undefined,
        situation: s.situation || undefined,
        task: s.task || undefined,
        action: s.action || undefined,
        result: s.result || undefined,
        tags: s.tags || [],
        technical_skills: s.technical_skills || [],
        technologies: s.technologies || [],
        metrics: s.metrics || undefined,
        related_problem_ids: s.related_problem_ids || [],
        versatility_score: s.versatility_score || 0,
        last_used_at: s.last_used_at || undefined,
        practice_count: s.practice_count || 0,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      setStories(transformedStories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stories");
      console.error("Error fetching user stories:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const createStory = useCallback(
    async (story: Omit<UserStory, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const { data, error: insertError } = await (supabase as any)
          .from("user_stories")
          .insert({
            user_id: user.id,
            title: story.title,
            description: story.description || undefined,
            situation: story.situation || undefined,
            task: story.task || undefined,
            action: story.action || undefined,
            result: story.result || undefined,
            tags: story.tags || [],
            technical_skills: story.technical_skills || [],
            technologies: story.technologies || [],
            metrics: story.metrics || undefined,
            related_problem_ids: story.related_problem_ids || [],
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await fetchStories();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create story";
        setError(errorMessage);
        throw err;
      }
    },
    [user?.id, fetchStories]
  );

  const updateStory = useCallback(
    async (storyId: string, updates: Partial<UserStory>) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const { error: updateError } = await (supabase as any)
          .from("user_stories")
          .update(updates)
          .eq("id", storyId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        await fetchStories();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update story";
        setError(errorMessage);
        throw err;
      }
    },
    [user?.id, fetchStories]
  );

  const deleteStory = useCallback(
    async (storyId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const { error: deleteError } = await (supabase as any)
          .from("user_stories")
          .delete()
          .eq("id", storyId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        await fetchStories();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete story";
        setError(errorMessage);
        throw err;
      }
    },
    [user?.id, fetchStories]
  );

  return {
    stories,
    loading,
    error,
    createStory,
    updateStory,
    deleteStory,
    refetch: fetchStories,
  };
};

