import { supabase } from '@/integrations/supabase/client';

export interface UserAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  code: string;
  status: 'pending' | 'passed' | 'failed' | 'error';
  created_at: string;
  updated_at: string;
}

export class UserAttemptsService {
  // Get the latest attempt for a user and problem
  static async getLatestAttempt(userId: string, problemId: string): Promise<UserAttempt | null> {
    const { data, error } = await supabase
      .from('user_problem_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest attempt:', error);
      return null;
    }

    return data;
  }

  // Save or update a draft attempt
  static async saveDraft(userId: string, problemId: string, code: string): Promise<UserAttempt | null> {
    // First try to update existing pending attempt
    const { data: existingDraft } = await supabase
      .from('user_problem_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingDraft) {
      // Update existing draft
      const { data, error } = await supabase
        .from('user_problem_attempts')
        .update({ 
          code,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDraft.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating draft:', error);
        return null;
      }

      return data;
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('user_problem_attempts')
        .insert({
          user_id: userId,
          problem_id: problemId,
          code,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating draft:', error);
        return null;
      }

      return data;
    }
  }

  // Create a new submission (always creates new record)
  static async submitCode(userId: string, problemId: string, code: string, testResults?: any[]): Promise<UserAttempt | null> {
    const { data, error } = await supabase
      .from('user_problem_attempts')
        .insert({
          user_id: userId,
          problem_id: problemId,
          code,
          status: 'pending',
          test_results: testResults || []
        })
      .select()
      .single();

    if (error) {
      console.error('Error submitting code:', error);
      return null;
    }

    return data;
  }
}