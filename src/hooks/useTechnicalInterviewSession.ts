import { useState, useCallback } from "react";
import { TechnicalInterviewService, TechnicalInterviewSession } from "@/services/technicalInterviewService";
import { TestResult } from "@/types";

interface UseTechnicalInterviewSessionReturn {
  sessionId: string | null;
  session: TechnicalInterviewSession | null;
  createSession: (userId: string, problemId: string, voice: string) => Promise<void>;
  endSession: (duration: number, passed?: boolean, score?: number) => Promise<void>;
  addTranscript: (role: "user" | "assistant", content: string) => Promise<void>;
  saveCodeSnapshot: (code: string) => Promise<void>;
  saveTestResults: (results: TestResult[]) => Promise<void>;
  saveFeedback: (feedback: {
    problem_solving_score?: number;
    code_quality_score?: number;
    communication_score?: number;
    strengths?: string[];
    areas_for_improvement?: string[];
    detailed_feedback?: string;
    interviewer_notes?: string;
  }) => Promise<void>;
  error: string | null;
}

export const useTechnicalInterviewSession = (): UseTechnicalInterviewSessionReturn => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<TechnicalInterviewSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (userId: string, problemId: string, voice: string) => {
    try {
      console.log('[useTechnicalInterviewSession] Creating session for problem:', problemId);
      const newSession = await TechnicalInterviewService.createSession(userId, problemId, voice);
      setSessionId(newSession.id);
      setSession(newSession);
      setError(null);
      console.log('[useTechnicalInterviewSession] Session created:', newSession.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session";
      console.error('[useTechnicalInterviewSession] Create session error:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const endSession = useCallback(async (duration: number, passed?: boolean, score?: number) => {
    if (!sessionId) {
      console.warn('[useTechnicalInterviewSession] No active session to end');
      return;
    }

    try {
      console.log('[useTechnicalInterviewSession] Ending session:', sessionId);
      await TechnicalInterviewService.endSession(sessionId, duration, passed, score);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to end session";
      console.error('[useTechnicalInterviewSession] End session error:', err);
      setError(errorMessage);
      throw err;
    }
  }, [sessionId]);

  const addTranscript = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!sessionId) {
      console.warn('[useTechnicalInterviewSession] No active session for transcript');
      return;
    }

    try {
      console.log(`[useTechnicalInterviewSession] Adding ${role} transcript to session ${sessionId}`);
      await TechnicalInterviewService.addTranscript(sessionId, role, content);
    } catch (err) {
      console.error('[useTechnicalInterviewSession] Add transcript error:', err);
      // Don't set error state or throw - transcripts are non-critical
    }
  }, [sessionId]);

  const saveCodeSnapshot = useCallback(async (code: string) => {
    if (!sessionId) {
      console.warn('[useTechnicalInterviewSession] No active session for code snapshot');
      return;
    }

    try {
      console.log('[useTechnicalInterviewSession] Saving code snapshot for session:', sessionId);
      await TechnicalInterviewService.saveCodeSnapshot(sessionId, code);
    } catch (err) {
      console.error('[useTechnicalInterviewSession] Save code snapshot error:', err);
      // Don't set error state or throw - snapshots are non-critical
    }
  }, [sessionId]);

  const saveTestResults = useCallback(async (results: TestResult[]) => {
    if (!sessionId) {
      console.warn('[useTechnicalInterviewSession] No active session for test results');
      return;
    }

    try {
      console.log('[useTechnicalInterviewSession] Saving test results for session:', sessionId);
      await TechnicalInterviewService.saveTestResults(sessionId, results);
    } catch (err) {
      console.error('[useTechnicalInterviewSession] Save test results error:', err);
      // Don't set error state or throw - test results are non-critical
    }
  }, [sessionId]);

  const saveFeedback = useCallback(async (feedback: {
    problem_solving_score?: number;
    code_quality_score?: number;
    communication_score?: number;
    strengths?: string[];
    areas_for_improvement?: string[];
    detailed_feedback?: string;
    interviewer_notes?: string;
  }) => {
    if (!sessionId) {
      console.warn('[useTechnicalInterviewSession] No active session for feedback');
      return;
    }

    try {
      console.log('[useTechnicalInterviewSession] Saving feedback for session:', sessionId);
      await TechnicalInterviewService.saveFeedback(sessionId, feedback);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save feedback";
      console.error('[useTechnicalInterviewSession] Save feedback error:', err);
      setError(errorMessage);
      throw err;
    }
  }, [sessionId]);

  return {
    sessionId,
    session,
    createSession,
    endSession,
    addTranscript,
    saveCodeSnapshot,
    saveTestResults,
    saveFeedback,
    error,
  };
};

