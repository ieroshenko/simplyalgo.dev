import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  SystemDesignSession,
  SystemDesignBoardState,
  DesignEvaluation,
  CompletenessAnalysis,
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
  completeness: CompletenessAnalysis | null;
  loading: boolean;
  error: string | null;
  isTyping: boolean;
  hasDraft: boolean;
  updateBoard: (state: SystemDesignBoardState) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  evaluateDesign: () => Promise<void>;
  clearConversation: () => Promise<void>;
  saveDraft: () => Promise<void>;
  restoreDraft: () => Promise<boolean>;
  isEvaluating: boolean;
}

export const useSystemDesignSession = ({
  problemId,
  userId,
}: UseSystemDesignSessionProps): UseSystemDesignSessionReturn => {
  const [session, setSession] = useState<SystemDesignSession | null>(null);
  const [boardState, setBoardState] = useState<SystemDesignBoardState>({
    elements: [],
    appState: {},
    files: {},
  });
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>
  >([]);
  const [evaluation, setEvaluation] = useState<DesignEvaluation | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedDraftHash, setLastSavedDraftHash] = useState<string | null>(null);

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

      if (!state) {
        console.warn("[SystemDesignChat] updateBoard called with invalid state:", state);
        return;
      }

      console.log("[SystemDesignChat] Board state updated:", {
        elementCount: state.elements?.length || 0,
        nodeCount: state.nodes?.length || 0,
        edgeCount: state.edges?.length || 0,
      });

      setBoardState(state);

      // Clear existing timeout
      if (boardUpdateTimeoutRef.current) {
        clearTimeout(boardUpdateTimeoutRef.current);
      }

      // Debounced save to database and AI reaction (every 3 seconds)
      boardUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          console.log("[SystemDesignChat] Saving board state to database (debounced 3s)");
          await supabase.functions.invoke("system-design-chat", {
            body: {
              action: "update_board_state",
              sessionId: session.id,
              boardState: state,
            },
          });
          console.log("[SystemDesignChat] Board state saved successfully");

          // Check if board changed significantly before triggering AI reaction
          // Detect changes in: node count, edge count, or node labels
          let hasSignificantChange = false;

          if (!lastBoardStateRef.current) {
            hasSignificantChange = true;
          } else {
            // Check for Excalidraw elements
            if (state.elements) {
              const elementCountChanged = state.elements.length !== (lastBoardStateRef.current.elements?.length || 0);
              hasSignificantChange = elementCountChanged;
            }
            // Check for ReactFlow nodes/edges (backwards compatibility)
            else if (state.nodes) {
              const nodeCountChanged = state.nodes.length !== (lastBoardStateRef.current.nodes?.length || 0);
              const edgeCountChanged = (state.edges?.length || 0) !== (lastBoardStateRef.current.edges?.length || 0);

              // Check if any node labels changed
              const labelChanged = state.nodes.some((node, index) => {
                const prevNode = lastBoardStateRef.current!.nodes?.find(n => n.id === node.id);
                return prevNode && prevNode.data?.label !== node.data?.label;
              });

              hasSignificantChange = nodeCountChanged || edgeCountChanged || labelChanged;
            }
          }

          const hasContent = (state.elements && state.elements.length > 0) || (state.nodes && state.nodes.length > 0);
          if (hasSignificantChange && hasContent) {
            console.log("[SystemDesignChat] Board changed significantly, triggering AI reaction");
            setLoading(true);

            const { data, error } = await supabase.functions.invoke("system-design-chat", {
              body: {
                action: "react_to_board_changes",
                sessionId: session.id,
                boardState: state,
              },
            });

            if (error) {
              console.error("[SystemDesignChat] AI reaction failed:", error);
            } else if (data?.message) {
              console.log("[SystemDesignChat] AI reacted to board changes");

              // Reload messages to show the new AI reaction
              const { data: responses } = await supabase
                .from("system_design_responses")
                .select("*")
                .eq("session_id", session.id)
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

              // Update completeness if provided
              if (data.completeness) {
                setCompleteness(data.completeness);
              }
            }

            setLoading(false);
          }
        } catch (err) {
          console.error("[SystemDesignChat] Failed to save board state or get AI reaction:", err);
          setLoading(false);
        }
      }, 3000); // 3 seconds debounce

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

      // Cancel pending board update auto-reaction when user sends a message
      if (boardUpdateTimeoutRef.current) {
        console.log("[SystemDesignChat] Canceling pending auto-reaction - user sent message");
        clearTimeout(boardUpdateTimeoutRef.current);
        boardUpdateTimeoutRef.current = null;
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

        // Update completeness state if provided
        if (data?.completeness) {
          console.log("[SystemDesignChat] Updating completeness state:", data.completeness);
          setCompleteness(data.completeness);
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
      setBoardState({ elements: [], appState: {}, files: {} });
      lastBoardStateRef.current = null;
      setEvaluation(null);
      setCompleteness(null);
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

  const saveDraft = useCallback(async () => {
    if (!session) {
      console.log("[SystemDesignChat] saveDraft: No session, skipping");
      return;
    }

    // Only save if there's actual work (elements or nodes on the board)
    const hasContent = (boardState.elements && boardState.elements.length > 0) ||
                       (boardState.nodes && boardState.nodes.length > 0);
    if (!hasContent) {
      console.log("[SystemDesignChat] saveDraft: No elements/nodes, skipping");
      return;
    }

    try {
      const draftHash = JSON.stringify(boardState ?? {});
      console.log("[SystemDesignChat] Saving current work as draft...");
      const { error: updateError } = await supabase
        .from("system_design_sessions")
        .update({ draft_board_state: boardState, draft_hash: draftHash })
        .eq("id", session.id);

      if (updateError) throw updateError;

      setHasDraft(true);
      setLastSavedDraftHash(draftHash);
      console.log("[SystemDesignChat] ✓ Draft saved successfully");
    } catch (err) {
      console.error("[SystemDesignChat] Failed to save draft:", err);
      setError(err instanceof Error ? err.message : "Failed to save draft");
    }
  }, [session, boardState]);

  const restoreDraft = useCallback(async (): Promise<boolean> => {
    if (!session) {
      console.log("[SystemDesignChat] restoreDraft: No session, skipping");
      return false;
    }

    const backupState = lastBoardStateRef.current ?? boardState;

    try {
      console.log("[SystemDesignChat] Restoring draft...");
      const { data, error: fetchError } = await supabase
        .from("system_design_sessions")
        .select("draft_board_state, draft_hash")
        .eq("id", session.id)
        .single();

      if (fetchError) throw fetchError;

      if (data?.draft_board_state) {
        const draftState = data.draft_board_state as SystemDesignBoardState;
        console.log("[SystemDesignChat] Captured backup of current board state before restore", {
          hasElements: !!backupState?.elements?.length,
          hasNodes: !!backupState?.nodes?.length,
        });
        setBoardState(draftState);
        lastBoardStateRef.current = draftState;
        setLastSavedDraftHash(data.draft_hash ?? null);

        // Clear the draft after restoring
        await supabase
          .from("system_design_sessions")
          .update({ draft_board_state: null, draft_hash: null })
          .eq("id", session.id);

        setHasDraft(false);
        console.log("[SystemDesignChat] ✓ Draft restored successfully");
        return true;
      } else {
        console.log("[SystemDesignChat] No draft found to restore");
        return false;
      }
    } catch (err) {
      console.error("[SystemDesignChat] Failed to restore draft:", err);
      setError(err instanceof Error ? err.message : "Failed to restore draft");
      return false;
    }
  }, [session, boardState]);

  // Check if session has a draft on load
  useEffect(() => {
    if (!session) return;
    let mounted = true;
    const sessionId = session.id;

    const checkDraft = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("system_design_sessions")
          .select("draft_board_state, draft_hash")
          .eq("id", sessionId)
          .single();

        if (fetchError) {
          console.error("[SystemDesignChat] Failed to check draft:", fetchError);
          if (mounted) {
            setError(fetchError.message || "Failed to check draft");
          }
          return;
        }

        if (!mounted) return;

        if (data?.draft_board_state) {
          setHasDraft(true);
          setLastSavedDraftHash(data.draft_hash ?? JSON.stringify(data.draft_board_state));
        }
      } catch (err) {
        console.error("[SystemDesignChat] Failed to check draft:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to check draft");
        }
      }
    };

    checkDraft();

    return () => {
      mounted = false;
    };
  }, [session]);

  // Clear draft badge when current board differs from last saved draft
  useEffect(() => {
    if (!hasDraft || !lastSavedDraftHash) return;

    const currentHash = JSON.stringify(boardState ?? {});
    if (currentHash !== lastSavedDraftHash) {
      setHasDraft(false);
    }
  }, [boardState, hasDraft, lastSavedDraftHash]);

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
    completeness,
    loading,
    error,
    isTyping,
    hasDraft,
    updateBoard,
    sendMessage,
    evaluateDesign,
    clearConversation,
    saveDraft,
    restoreDraft,
    isEvaluating,
  };
};
