import { useState, useCallback } from "react";
import { TechnicalInterviewService, TechnicalInterviewSession } from "@/services/technicalInterviewService";
import { TestResult } from "@/types";
import { logger } from "@/utils/logger";

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
      logger.debug("Creating session for problem", { component: "TechnicalInterviewSession", problemId });
      const newSession = await TechnicalInterviewService.createSession(userId, problemId, voice);
      setSessionId(newSession.id);
      setSession(newSession);
      setError(null);
      logger.debug("Session created", { component: "TechnicalInterviewSession", sessionId: newSession.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session";
      logger.error("Create session error", err, { component: "TechnicalInterviewSession" });
      setError(errorMessage);
      throw err;
    }
  }, []);

  const endSession = useCallback(async (duration: number, passed?: boolean, score?: number) => {
    if (!sessionId) {
      logger.warn("No active session to end", { component: "TechnicalInterviewSession" });
      return;
    }

    try {
      logger.debug("Ending session", { component: "TechnicalInterviewSession", sessionId });
      await TechnicalInterviewService.endSession(sessionId, duration, passed, score);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to end session";
      logger.error("End session error", err, { component: "TechnicalInterviewSession" });
      setError(errorMessage);
      throw err;
    }
  }, [sessionId]);

  const addTranscript = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!sessionId) {
      logger.warn("No active session for transcript", { component: "TechnicalInterviewSession" });
      return;
    }

    try {
      logger.debug("Adding transcript to session", { component: "TechnicalInterviewSession", role, sessionId });
      await TechnicalInterviewService.addTranscript(sessionId, role, content);
    } catch (err) {
      logger.error("Add transcript error", err, { component: "TechnicalInterviewSession" });
      // Don't set error state or throw - transcripts are non-critical
    }
  }, [sessionId]);

  const saveCodeSnapshot = useCallback(async (code: string) => {
    if (!sessionId) {
      logger.warn("No active session for code snapshot", { component: "TechnicalInterviewSession" });
      return;
    }

    try {
      logger.debug("Saving code snapshot for session", { component: "TechnicalInterviewSession", sessionId });
      await TechnicalInterviewService.saveCodeSnapshot(sessionId, code);
    } catch (err) {
      logger.error("Save code snapshot error", err, { component: "TechnicalInterviewSession" });
      // Don't set error state or throw - snapshots are non-critical
    }
  }, [sessionId]);

  const saveTestResults = useCallback(async (results: TestResult[]) => {
    if (!sessionId) {
      logger.warn("No active session for test results", { component: "TechnicalInterviewSession" });
      return;
    }

    try {
      logger.debug("Saving test results for session", { component: "TechnicalInterviewSession", sessionId });
      await TechnicalInterviewService.saveTestResults(sessionId, results);
    } catch (err) {
      logger.error("Save test results error", err, { component: "TechnicalInterviewSession" });
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
      logger.warn("No active session for feedback", { component: "TechnicalInterviewSession" });
      return;
    }

    try {
      logger.debug("Saving feedback for session", { component: "TechnicalInterviewSession", sessionId });
      await TechnicalInterviewService.saveFeedback(sessionId, feedback);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save feedback";
      logger.error("Save feedback error", err, { component: "TechnicalInterviewSession" });
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

