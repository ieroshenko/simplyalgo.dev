import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { getErrorMessage } from "@/utils/uiUtils";

interface InterviewSession {
  id: string;
  userId: string;
  callId: string | null;
  resumeText: string;
  voice: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  status: "in_progress" | "completed" | "error";
}

interface UseInterviewSessionReturn {
  sessionId: string | null;
  createSession: (resumeText: string, voice: string) => Promise<string>;
  endSession: (durationSeconds: number) => Promise<void>;
  addTranscript: (role: "user" | "assistant", content: string) => Promise<void>;
  setCallId: (callId: string) => Promise<void>;
  error: string | null;
}

export const useInterviewSession = (): UseInterviewSessionReturn => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(
    async (resumeText: string, voice: string): Promise<string> => {
      try {
        setError(null);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: dbError } = await supabase
          .from("behavioral_interview_sessions")
          .insert({
            user_id: user.id,
            resume_text: resumeText,
            voice: voice,
            status: "in_progress",
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setSessionId(data.id);
        logger.debug('[useInterviewSession] Created session', { sessionId: data.id });
        return data.id;
      } catch (err) {
        logger.error('[useInterviewSession] Failed to create session', { error: err });
        setError(
          getErrorMessage(err, "Failed to create session")
        );
        throw err;
      }
    },
    []
  );

  const endSession = useCallback(
    async (durationSeconds: number) => {
      if (!sessionId) return;

      try {
        setError(null);
        const { error: dbError } = await supabase
          .from("behavioral_interview_sessions")
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            status: "completed",
          })
          .eq("id", sessionId);

        if (dbError) throw dbError;
        logger.debug('[useInterviewSession] Ended session', { sessionId });
      } catch (err) {
        logger.error('[useInterviewSession] Failed to end session', { error: err, sessionId });
        setError(getErrorMessage(err, "Failed to end session"));
      }
    },
    [sessionId]
  );

  const addTranscript = useCallback(
    async (role: "user" | "assistant", content: string) => {
      if (!sessionId) return;

      try {
        const { error: dbError } = await supabase
          .from("behavioral_interview_transcripts")
          .insert({
            session_id: sessionId,
            role: role,
            content: content,
          });

        if (dbError) throw dbError;
        logger.debug('[useInterviewSession] Added transcript', { role, sessionId });
      } catch (err) {
        logger.error('[useInterviewSession] Failed to add transcript', { error: err, role, sessionId });
        // Don't set error state for transcripts to avoid disrupting interview
      }
    },
    [sessionId]
  );

  const setCallId = useCallback(
    async (callId: string) => {
      if (!sessionId) return;

      try {
        const { error: dbError } = await supabase
          .from("behavioral_interview_sessions")
          .update({ call_id: callId })
          .eq("id", sessionId);

        if (dbError) throw dbError;
        logger.debug('[useInterviewSession] Set call ID', { callId, sessionId });
      } catch (err) {
        logger.error('[useInterviewSession] Failed to set call ID', { error: err, callId, sessionId });
      }
    },
    [sessionId]
  );

  return {
    sessionId,
    createSession,
    endSession,
    addTranscript,
    setCallId,
    error,
  };
};
