import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        console.log("[Session] Created session:", data.id);
        return data.id;
      } catch (err) {
        console.error("[Session] Failed to create session:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create session"
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
        console.log("[Session] Ended session:", sessionId);
      } catch (err) {
        console.error("[Session] Failed to end session:", err);
        setError(err instanceof Error ? err.message : "Failed to end session");
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
        console.log(`[Session] Added ${role} transcript`);
      } catch (err) {
        console.error("[Session] Failed to add transcript:", err);
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
        console.log("[Session] Set call ID:", callId);
      } catch (err) {
        console.error("[Session] Failed to set call ID:", err);
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
