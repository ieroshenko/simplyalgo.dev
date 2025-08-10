import { supabase } from '@/integrations/supabase/client';

export interface UserAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  code: string;
  status: 'pending' | 'passed' | 'failed' | 'error';
  created_at: string;
  updated_at: string;
  test_results?: any;
  execution_time?: number;
  memory_usage?: number;
  language?: string;
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

  // Mark a problem as solved
  static async markProblemSolved(userId: string, problemId: string, code: string, testResults: any[]): Promise<UserAttempt | null> {
    const { data, error } = await supabase
      .from('user_problem_attempts')
      .insert({
        user_id: userId,
        problem_id: problemId,
        code,
        status: 'passed',
        test_results: testResults
      })
      .select()
      .single();

    if (error) {
      console.error('Error marking problem as solved:', error);
      return null;
    }

    return data;
  }

  // Get user problem status (solved/attempted/not-started)
  static async getUserProblemStatus(userId: string, problemId: string): Promise<'solved' | 'attempted' | 'not-started'> {
    const { data, error } = await supabase
      .from('user_problem_attempts')
      .select('status')
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return 'not-started';
    }

    return data.status === 'passed' ? 'solved' : 'attempted';
  }

  // Get all user problem statuses for multiple problems
  static async getUserProblemsStatus(userId: string, problemIds: string[]): Promise<Record<string, 'solved' | 'attempted' | 'not-started'>> {
    const { data, error } = await supabase
      .from('user_problem_attempts')
      .select('problem_id, status, updated_at')
      .eq('user_id', userId)
      .in('problem_id', problemIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user problem statuses:', error);
      return {};
    }

    const statusMap: Record<string, 'solved' | 'attempted' | 'not-started'> = {};
    
    // Initialize all problems as not-started
    problemIds.forEach(id => {
      statusMap[id] = 'not-started';
    });

    // Group by problem_id and get the latest status for each
    const latestAttempts: Record<string, any> = {};
    data?.forEach(attempt => {
      if (!latestAttempts[attempt.problem_id] || 
          new Date(attempt.updated_at) > new Date(latestAttempts[attempt.problem_id].updated_at)) {
        latestAttempts[attempt.problem_id] = attempt;
      }
    });

    // Set status based on latest attempt
    Object.values(latestAttempts).forEach((attempt: any) => {
      statusMap[attempt.problem_id] = attempt.status === 'passed' ? 'solved' : 'attempted';
    });

    return statusMap;
  }

  // Clear all drafts for a specific problem
  static async clearDraft(userId: string, problemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_problem_attempts')
      .delete()
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error clearing draft:', error);
      return false;
    }

    return true;
  }

  // Get all accepted submissions for a specific problem
  static async getAcceptedSubmissions(userId: string, problemId: string): Promise<UserAttempt[]> {
    const { data, error } = await supabase
      .from('user_problem_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'passed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accepted submissions:', error);
      return [];
    }

    return data || [];
  }
}