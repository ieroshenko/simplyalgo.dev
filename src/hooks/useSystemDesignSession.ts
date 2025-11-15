import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  SystemDesignSession,
  SystemDesignBoardState,
  DesignEvaluation,
} from "@/types";

interface UseSystemDesignSessionProps {
  problemId: string;
  userId: string;
}

interface UseSystemDesignSessionReturn {
  session: SystemDesignSession | null;
  boardState: SystemDesignBoardState;
  messages: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>;
  evaluation: DesignEvaluation | null;
  loading: boolean;
  error: string | null;
  isTyping: boolean;
  updateBoard: (state: SystemDesignBoardState) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  evaluateDesign: () => Promise<void>;
  clearConversation: () => Promise<void>;
  isEvaluating: boolean;
}

export const useSystemDesignSession = ({
  problemId,
  userId,
}: UseSystemDesignSessionProps): UseSystemDesignSessionReturn => {
  const [session, setSession] = useState<SystemDesignSession | null>(null);
  const [boardState, setBoardState] = useState<SystemDesignBoardState>({
    nodes: [],
    edges: [],
  });
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>
  >([]);
  const [evaluation, setEvaluation] = useState<DesignEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Debounce refs
  const boardUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoardStateRef = useRef<SystemDesignBoardState | null>(null);

  // Initialize session (find existing or create new)
  const initializeSession = useCallback(async (forceNew = false) => {
    // Don't make request if userId or problemId is empty
    if (!userId || !problemId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to find existing session (skip if forceNew is true)
      let existingSession = null;
      if (!forceNew) {
        const result = await supabase
          .from("system_design_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("problem_id", problemId)
          .eq("is_completed", false)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();
        existingSession = result.data;
        console.log("[SystemDesignChat] initializeSession - found existing:", existingSession?.id);
      } else {
        console.log("[SystemDesignChat] initializeSession - forceNew=true, creating new session");
      }

      let currentSession: SystemDesignSession;

      if (existingSession) {
        // Use existing session
        currentSession = {
          id: existingSession.id,
          userId: existingSession.user_id,
          problemId: existingSession.problem_id,
          contextThreadId: existingSession.context_thread_id,
          isCompleted: existingSession.is_completed,
          score: existingSession.score,
          startedAt: new Date(existingSession.started_at),
          completedAt: existingSession.completed_at
            ? new Date(existingSession.completed_at)
            : undefined,
        };

        // Load board state
        const { data: board } = await supabase
          .from("system_design_boards")
          .select("board_state")
          .eq("session_id", existingSession.id)
          .single();

        if (board?.board_state) {
          const state = board.board_state as SystemDesignBoardState;
          setBoardState(state);
          lastBoardStateRef.current = state;
        }

        // Load messages
        const { data: responses } = await supabase
          .from("system_design_responses")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("created_at", { ascending: true });

        if (responses) {
          setMessages(
            responses.map((r) => ({
              role: r.message_role as "user" | "assistant",
              content: r.content,
              timestamp: new Date(r.created_at),
            })),
          );
        }

        setSession(currentSession);
      } else {
        // Create new session
        const { data, error: invokeError } = await supabase.functions.invoke(
          "system-design-chat",
          {
            body: {
              action: "start_design_session",
              problemId,
              userId,
            },
          },
        );

        if (invokeError) throw invokeError;

        currentSession = {
          id: data.sessionId,
          userId,
          problemId,
          contextThreadId: data.contextThreadId,
          isCompleted: false,
          startedAt: new Date(),
        };

        setSession(currentSession);

        // Only set initial message for NEW sessions
        if (data.message) {
          setMessages([
            {
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
            },
          ]);
        }

        // Load initial board state if provided
        if (data.boardState) {
          setBoardState(data.boardState);
          lastBoardStateRef.current = data.boardState;
        }
      }
    } catch (err) {
      console.error("[SystemDesignChat] Error initializing session:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize session");
    } finally {
      setLoading(false);
    }
  }, [problemId, userId]);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const updateBoard = useCallback(
    async (state: SystemDesignBoardState) => {
      if (!session) {
        console.log("[SystemDesignChat] updateBoard called but no session");
        return;
      }

      if (!state || !state.nodes) {
        console.warn("[SystemDesignChat] updateBoard called with invalid state:", state);
        return;
      }

      console.log("[SystemDesignChat] Board state updated:", {
        nodeCount: state.nodes.length,
        edgeCount: state.edges.length,
      });

      setBoardState(state);

      // Clear existing timeout
      if (boardUpdateTimeoutRef.current) {
        clearTimeout(boardUpdateTimeoutRef.current);
      }

      // Debounced save to database (every 5 seconds)
      boardUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          console.log("[SystemDesignChat] Saving board state to database (debounced 5s)");
          await supabase.functions.invoke("system-design-chat", {
            body: {
              action: "update_board_state",
              sessionId: session.id,
              boardState: state,
            },
          });
          console.log("[SystemDesignChat] Board state saved successfully");
        } catch (err) {
          console.error("[SystemDesignChat] Failed to save board state:", err);
        }
      }, 5000);

      // Note: Removed automatic AI reactions to board changes
      // The coach should only respond when the user explicitly asks a question
      // Update lastBoardState for tracking purposes
      lastBoardStateRef.current = state;
    },
    [session],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!session || !message.trim()) {
        console.log("[SystemDesignChat] sendMessage called but no session or empty message");
        return;
      }

      console.log("[SystemDesignChat] Sending message:", {
        message,
        sessionId: session.id,
      });

      const userMessage = {
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true); // Start typing indicator

      try {
        console.log("[SystemDesignChat] Invoking Edge Function: coach_message");
        const { data, error: invokeError } = await supabase.functions.invoke(
          "system-design-chat",
          {
            body: {
              action: "coach_message",
              sessionId: session.id,
              message,
            },
          },
        );

        console.log("[SystemDesignChat] Edge Function response:", { data, error: invokeError });

        if (invokeError) throw invokeError;

        if (data?.message) {
          console.log("[SystemDesignChat] Adding AI response to messages");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
            },
          ]);
        } else {
          console.warn("[SystemDesignChat] No message in response data:", data);
        }
      } catch (err) {
        console.error("[SystemDesignChat] Error sending message:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
        // Remove user message on error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsTyping(false); // Stop typing indicator
      }
    },
    [session],
  );

  const clearConversation = useCallback(async () => {
    console.log("[SystemDesignChat] ========== CLEAR CONVERSATION START ==========");
    console.log("[SystemDesignChat] Current session:", session);
    
    if (!session) {
      console.warn("[SystemDesignChat] No session found, aborting");
      return;
    }

    const sessionIdToDelete = session.id;
    console.log("[SystemDesignChat] Will delete session:", sessionIdToDelete);

    try {
      // Start typing animation to show we're working on it
      setIsTyping(true);

      // Small delay to show fade-out animation
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log("[SystemDesignChat] Step 1: Deleting responses...");
      const { error: responsesError } = await supabase
        .from("system_design_responses")
        .delete()
        .eq("session_id", sessionIdToDelete);
      
      if (responsesError) {
        console.error("[SystemDesignChat] Responses delete error:", responsesError);
        throw responsesError;
      }
      console.log("[SystemDesignChat] ✓ Responses deleted");

      console.log("[SystemDesignChat] Step 2: Deleting board state...");
      const { error: boardError } = await supabase
        .from("system_design_boards")
        .delete()
        .eq("session_id", sessionIdToDelete);
      
      if (boardError) {
        console.error("[SystemDesignChat] Board delete error:", boardError);
        throw boardError;
      }
      console.log("[SystemDesignChat] ✓ Board deleted");

      console.log("[SystemDesignChat] Step 3: Deleting session...");
      const { error: sessionError } = await supabase
        .from("system_design_sessions")
        .delete()
        .eq("id", sessionIdToDelete);
      
      if (sessionError) {
        console.error("[SystemDesignChat] Session delete error:", sessionError);
        throw sessionError;
      }
      console.log("[SystemDesignChat] ✓ Session deleted");

      console.log("[SystemDesignChat] Step 4: Resetting local state...");
      setMessages([]);
      setBoardState({ nodes: [], edges: [] });
      lastBoardStateRef.current = null;
      setEvaluation(null);
      setSession(null);
      console.log("[SystemDesignChat] ✓ Local state reset");

      console.log("[SystemDesignChat] Step 5: Creating new session...");
      const { data: newSessionData, error: createError } = await supabase.functions.invoke(
        "system-design-chat",
        {
          body: {
            action: "start_design_session",
            problemId,
            userId,
          },
        },
      );

      if (createError) {
        console.error("[SystemDesignChat] Create session error:", createError);
        throw createError;
      }

      console.log("[SystemDesignChat] New session data:", newSessionData);

      const newSession: SystemDesignSession = {
        id: newSessionData.sessionId,
        userId,
        problemId,
        contextThreadId: newSessionData.contextThreadId,
        isCompleted: false,
        startedAt: new Date(),
      };

      console.log("[SystemDesignChat] Step 6: Setting new session...");
      setSession(newSession);

      if (newSessionData.message) {
        console.log("[SystemDesignChat] Step 7: Setting initial message...");
        setMessages([
          {
            role: "assistant",
            content: newSessionData.message,
            timestamp: new Date(),
          },
        ]);
      }
      
      setIsTyping(false);

      console.log("[SystemDesignChat] ========== CLEAR CONVERSATION SUCCESS ==========");
    } catch (err) {
      console.error("[SystemDesignChat] ========== CLEAR CONVERSATION ERROR ==========");
      console.error("[SystemDesignChat] Error details:", err);
      setError(err instanceof Error ? err.message : "Failed to clear conversation");
      setIsTyping(false);
    }
  }, [session, problemId, userId]);

  const evaluateDesign = useCallback(async () => {
    if (!session || isEvaluating) return;

    // Debounce evaluation button
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
    }

    evaluationTimeoutRef.current = setTimeout(async () => {
      setIsEvaluating(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "system-design-chat",
          {
            body: {
              action: "evaluate_final_design",
              sessionId: session.id,
              boardState: boardState,
            },
          },
        );

        if (invokeError) throw invokeError;

        if (data?.evaluation) {
          setEvaluation(data.evaluation);
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  isCompleted: true,
                  score: data.evaluation.score,
                  completedAt: new Date(),
                }
              : null,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to evaluate design");
      } finally {
        setIsEvaluating(false);
      }
    }, 500); // 500ms debounce for evaluation button
  }, [session, boardState, isEvaluating]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (boardUpdateTimeoutRef.current) {
        clearTimeout(boardUpdateTimeoutRef.current);
      }
      if (evaluationTimeoutRef.current) {
        clearTimeout(evaluationTimeoutRef.current);
      }
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  return {
    session,
    boardState,
    messages,
    evaluation,
    loading,
    error,
    isTyping,
    updateBoard,
    sendMessage,
    evaluateDesign,
    clearConversation,
    isEvaluating,
  };
};
