import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";
import type { UserStory } from "@/types";

// Cache configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// Database row type for user_stories table
interface UserStoryRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  tags: string[] | null;
  technical_skills: string[] | null;
  technologies: string[] | null;
  metrics: string | null;
  related_problem_ids: string[] | null;
  versatility_score: number | null;
  last_used_at: string | null;
  practice_count: number | null;
  created_at: string;
  updated_at: string;
}

// Fetch user stories from database
async function fetchUserStories(userId: string): Promise<UserStory[]> {
  const { data, error: fetchError } = await supabase
    .from("user_stories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (fetchError) throw fetchError;

  return (data || []).map((s: UserStoryRow) => ({
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
}

export const useUserStories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: stories = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["userStories", user?.id],
    queryFn: () => fetchUserStories(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const error = queryError ? (queryError as Error).message : null;

  // Mutation for creating a story
  const createMutation = useMutation({
    mutationFn: async (
      story: Omit<UserStory, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error: insertError } = await supabase
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
      return data;
    },
    onSuccess: () => {
      // Invalidate stories cache and behavioral stats (story count changed)
      queryClient.invalidateQueries({ queryKey: ["userStories", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["behavioralStats", user?.id] });
    },
    onError: (err) => {
      logger.error("[useUserStories] Error creating story", { error: err });
    },
  });

  // Mutation for updating a story
  const updateMutation = useMutation({
    mutationFn: async ({
      storyId,
      updates,
    }: {
      storyId: string;
      updates: Partial<UserStory>;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error: updateError } = await supabase
        .from("user_stories")
        .update(updates)
        .eq("id", storyId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStories", user?.id] });
    },
    onError: (err) => {
      logger.error("[useUserStories] Error updating story", { error: err });
    },
  });

  // Mutation for deleting a story
  const deleteMutation = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error: deleteError } = await supabase
        .from("user_stories")
        .delete()
        .eq("id", storyId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStories", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["behavioralStats", user?.id] });
    },
    onError: (err) => {
      logger.error("[useUserStories] Error deleting story", { error: err });
    },
  });

  const createStory = useCallback(
    async (
      story: Omit<UserStory, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      return createMutation.mutateAsync(story);
    },
    [createMutation]
  );

  const updateStory = useCallback(
    async (storyId: string, updates: Partial<UserStory>) => {
      return updateMutation.mutateAsync({ storyId, updates });
    },
    [updateMutation]
  );

  const deleteStory = useCallback(
    async (storyId: string) => {
      return deleteMutation.mutateAsync(storyId);
    },
    [deleteMutation]
  );

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["userStories", user?.id] });
  };

  return {
    stories,
    loading,
    error,
    createStory,
    updateStory,
    deleteStory,
    refetch,
  };
};
