import { supabase } from '@/integrations/supabase/client';
import type { Problem } from '@/types';

/**
 * Reusable Supabase query builders for problems
 *
 * This module provides consistent query patterns for problem-related operations.
 * All queries return Supabase query builders that can be further customized.
 *
 * @example
 * ```tsx
 * // Fetch all problems
 * const { data, error } = await problemQueries.getAll().execute();
 *
 * // Fetch problems by difficulty
 * const { data } = await problemQueries.getByDifficulty('Easy').execute();
 *
 * // Fetch single problem with full details
 * const { data } = await problemQueries.getById('two-sum').execute();
 * ```
 */
export const problemQueries = {
  /**
   * Get all problems
   */
  getAll() {
    return supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });
  },

  /**
   * Get problem by ID
   */
  getById(id: string) {
    return supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();
  },

  /**
   * Get problems by difficulty
   */
  getByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard') {
    return supabase
      .from('problems')
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });
  },

  /**
   * Get problems by category
   */
  getByCategory(category: string) {
    return supabase
      .from('problems')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
  },

  /**
   * Search problems by title
   */
  searchByTitle(query: string) {
    return supabase
      .from('problems')
      .select('*')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false });
  },
};
