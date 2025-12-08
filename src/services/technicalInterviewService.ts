import { supabase } from "@/integrations/supabase/client";
import { TestResult } from "@/types";
import { logger } from "@/utils/logger";

export interface TechnicalInterviewSession {
  id: string;
  user_id: string;
  problem_id: string;
  call_id?: string;
  voice: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: 'in_progress' | 'completed' | 'error';
  passed?: boolean;
  overall_score?: number;
  feedback_generated: boolean;
  created_at: string;
}

export interface TechnicalInterviewFeedback {
  id: string;
  session_id: string;
  problem_solving_score?: number;
  code_quality_score?: number;
  communication_score?: number;
  strengths?: string[];
  areas_for_improvement?: string[];
  detailed_feedback?: string;
  interviewer_notes?: string;
  created_at: string;
}

export const TechnicalInterviewService = {
  /**
   * Get a problem by ID or random
   * @param problemIdOrRandom - Problem ID (e.g., "reverse-linked-list") or "random" for random selection
   */
  async getProblem(problemIdOrRandom: string = "random") {
    // If specific problem ID is provided
    if (problemIdOrRandom !== "random") {
      logger.debug('[TechnicalInterviewService] Fetching specific problem:', { problemId: problemIdOrRandom });
      const { data: problem, error } = await supabase
        .from('problems')
        .select('*, categories(name), test_cases(*)') 
        .eq('id', problemIdOrRandom)
        .single();
      
      if (error) {
        logger.error('[TechnicalInterviewService] Error fetching problem:', { error: error instanceof Error ? error.message : String(error), problemId: problemIdOrRandom });
        throw new Error(`Problem "${problemIdOrRandom}" not found`);
      }
      
      logger.debug('[TechnicalInterviewService] Selected problem:', {
        id: problem.id,
        title: problem.title,
        testCaseCount: problem.test_cases?.length || 0,
        hasDescription: !!problem.description
      });
      
      // Rename test_cases to testCases for consistency
      return {
        ...problem,
        testCases: problem.test_cases || []
      };
    }
    
    // Random selection
    return this.getRandomProblem();
  },

  /**
   * Get a random LeetCode problem (excluding System Design and Data Structure Implementation)
   */
  async getRandomProblem() {
    // First, get all eligible problems with their categories and test cases
    const { data: problems, error } = await supabase
      .from('problems')
      .select('*, categories!inner(name), test_cases(*)');
    
    if (error) {
      logger.error('[TechnicalInterviewService] Error fetching problems:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    if (!problems || problems.length === 0) {
      throw new Error('No problems found');
    }

    // Filter out System Design and Data Structure Implementation problems client-side
    const eligibleProblems = problems.filter((problem: any) => {
      const categoryName = problem.categories?.name || '';
      return categoryName !== 'System Design' && 
             categoryName !== 'Data Structure Implementations' &&
             !problem.id.startsWith('sd_'); // Also filter by ID prefix for system design
    });

    if (eligibleProblems.length === 0) {
      throw new Error('No eligible problems found after filtering');
    }
    
    // Pick a random problem from the eligible list
    const randomIndex = Math.floor(Math.random() * eligibleProblems.length);
    const randomProblem = eligibleProblems[randomIndex];
    
    logger.debug('[TechnicalInterviewService] Selected random problem:', {
      id: randomProblem.id,
      title: randomProblem.title,
      category: randomProblem.categories?.name,
      testCaseCount: randomProblem.test_cases?.length || 0,
      hasDescription: !!randomProblem.description
    });
    
    // Rename test_cases to testCases for consistency
    return {
      ...randomProblem,
      testCases: randomProblem.test_cases || []
    };
  },

  /**
   * Get all eligible problems for selection (excluding System Design and Data Structure Implementation)
   */
  async getAllEligibleProblems() {
    const { data: problems, error } = await supabase
      .from('problems')
      .select('id, title, difficulty, categories(name)')
      .order('title', { ascending: true });
    
    if (error) {
      logger.error('[TechnicalInterviewService] Error fetching problems:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    logger.info(`[TechnicalInterviewService] Fetched ${problems?.length || 0} total problems from DB`);

    // Filter out System Design and Data Structure Implementation problems
    const eligibleProblems = problems?.filter((problem: any) => {
      const categoryName = problem.categories?.name || '';
      const isEligible = categoryName !== 'System Design' && 
                        categoryName !== 'Data Structure Implementations' &&
                        !problem.id.startsWith('sd_');
      
      if (!isEligible) {
        logger.debug(`[TechnicalInterviewService] Filtered out: ${problem.title} (${categoryName})`);
      }
      
      return isEligible;
    }) || [];

    logger.info(`[TechnicalInterviewService] ${eligibleProblems.length} eligible problems after filtering`);
    return eligibleProblems;
  },

  /**
   * Create a new technical interview session
   */
  async createSession(userId: string, problemId: string, voice: string): Promise<TechnicalInterviewSession> {
    const { data, error } = await supabase
      .from('technical_interview_sessions')
      .insert({
        user_id: userId,
        problem_id: problemId,
        voice,
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      logger.error('[TechnicalInterviewService] Error creating session:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    logger.info('[TechnicalInterviewService] Created session:', { sessionId: data.id });
    return data as unknown as TechnicalInterviewSession;
  },

  /**
   * Update session when interview ends
   */
  async endSession(sessionId: string, duration: number, passed?: boolean, score?: number) {
    const { data, error } = await supabase
      .from('technical_interview_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        status: 'completed',
        passed,
        overall_score: score,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      logger.error('[TechnicalInterviewService] Error ending session:', { error: error instanceof Error ? error.message : String(error), sessionId });
      throw error;
    }

    logger.info('[TechnicalInterviewService] Ended session:', { sessionId });
    return data;
  },

  /**
   * Add a transcript entry
   */
  async addTranscript(sessionId: string, role: 'user' | 'assistant', content: string) {
    const { data, error } = await supabase
      .from('technical_interview_transcripts')
      .insert({
        session_id: sessionId,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      logger.error('[TechnicalInterviewService] Error adding transcript:', { error: error instanceof Error ? error.message : String(error), sessionId, role });
      throw error;
    }

    return data;
  },

  /**
   * Save a code snapshot
   */
  async saveCodeSnapshot(sessionId: string, code: string) {
    const { data, error } = await supabase
      .from('technical_interview_code_snapshots')
      .insert({
        session_id: sessionId,
        code,
      })
      .select()
      .single();

    if (error) {
      logger.error('[TechnicalInterviewService] Error saving code snapshot:', { error: error instanceof Error ? error.message : String(error), sessionId });
      throw error;
    }

    logger.info('[TechnicalInterviewService] Saved code snapshot for session:', { sessionId });
    return data;
  },

  /**
   * Save test results
   */
  async saveTestResults(sessionId: string, results: TestResult[]) {
    const testResultsData = results.map((result, index) => ({
      session_id: sessionId,
      test_case_number: index + 1,
      passed: result.passed,
      input: JSON.stringify(result.input),
      expected: JSON.stringify(result.expected),
      actual: JSON.stringify(result.actual),
      error: result.stderr || null,
    }));

    const { data, error } = await supabase
      .from('technical_interview_test_results')
      .insert(testResultsData)
      .select();

    if (error) {
      logger.error('[TechnicalInterviewService] Error saving test results:', { error: error instanceof Error ? error.message : String(error), sessionId });
      throw error;
    }

    logger.info('[TechnicalInterviewService] Saved test results for session:', { sessionId });
    return data;
  },

  /**
   * Save interview feedback
   */
  async saveFeedback(
    sessionId: string,
    feedback: {
      problem_solving_score?: number;
      code_quality_score?: number;
      communication_score?: number;
      strengths?: string[];
      areas_for_improvement?: string[];
      detailed_feedback?: string;
      interviewer_notes?: string;
    }
  ) {
    const { data, error } = await supabase
      .from('technical_interview_feedback')
      .insert({
        session_id: sessionId,
        ...feedback,
      })
      .select()
      .single();

    if (error) {
      logger.error('[TechnicalInterviewService] Error saving feedback:', { error: error instanceof Error ? error.message : String(error), sessionId });
      throw error;
    }

    // Mark feedback as generated in session
    await supabase
      .from('technical_interview_sessions')
      .update({ feedback_generated: true })
      .eq('id', sessionId);

    logger.info('[TechnicalInterviewService] Saved feedback for session:', { sessionId });
    return data;
  },

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<TechnicalInterviewSession> {
    const { data, error } = await supabase
      .from('technical_interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('[TechnicalInterviewService] Error fetching session:', error);
      throw error;
    }

    return data as unknown as TechnicalInterviewSession;
  },

  /**
   * Get feedback for a session
   */
  async getFeedback(sessionId: string): Promise<TechnicalInterviewFeedback | null> {
    const { data, error } = await supabase
      .from('technical_interview_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('[TechnicalInterviewService] Error fetching feedback:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get test results for a session
   */
  async getTestResults(sessionId: string) {
    const { data, error } = await supabase
      .from('technical_interview_test_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('test_case_number', { ascending: true });

    if (error) {
      console.error('[TechnicalInterviewService] Error fetching test results:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string) {
    const { data, error } = await supabase
      .from('technical_interview_sessions')
      .select('*, problems(id, title, difficulty)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('[TechnicalInterviewService] Error fetching user sessions:', error);
      throw error;
    }

    return data;
  },
};

