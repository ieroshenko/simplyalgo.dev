import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { getErrorMessage } from "@/utils/uiUtils";
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
        logger.debug("initializeSession - found existing", { component: "SystemDesignChat", sessionId: existingSession?.id });
      } else {
        logger.debug("initializeSession - forceNew=true, creating new session", { component: "SystemDesignChat" });
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
      logger.error("Error initializing session", err, { component: "SystemDesignChat" });
      setError(getErrorMessage(err, "Failed to initialize session"));
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
        logger.debug("updateBoard called but no session", { component: "SystemDesignChat" });
        return;
      }

      if (!state) {
        logger.warn("updateBoard called with invalid state", { component: "SystemDesignChat", state });
        return;
      }

      logger.debug("Board state updated", {
        component: "SystemDesignChat",
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
          logger.debug("Saving board state to database (debounced 3s)", { component: "SystemDesignChat" });
          await supabase.functions.invoke("system-design-chat", {
            body: {
              action: "update_board_state",
              sessionId: session.id,
              boardState: state,
            },
          });
          logger.debug("Board state saved successfully", { component: "SystemDesignChat" });

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
            logger.debug("Board changed significantly, triggering AI reaction", { component: "SystemDesignChat" });
            setLoading(true);

            const { data, error } = await supabase.functions.invoke("system-design-chat", {
              body: {
                action: "react_to_board_changes",
                sessionId: session.id,
                boardState: state,
              },
            });

            if (error) {
              logger.error("AI reaction failed", error, { component: "SystemDesignChat" });
            } else if (data?.message) {
              logger.debug("AI reacted to board changes", { component: "SystemDesignChat" });

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
          logger.error("Failed to save board state or get AI reaction", err, { component: "SystemDesignChat" });
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
        logger.debug("sendMessage called but no session or empty message", { component: "SystemDesignChat" });
        return;
      }

      // Cancel pending board update auto-reaction when user sends a message
      if (boardUpdateTimeoutRef.current) {
        logger.debug("Canceling pending auto-reaction - user sent message", { component: "SystemDesignChat" });
        clearTimeout(boardUpdateTimeoutRef.current);
        boardUpdateTimeoutRef.current = null;
      }

      logger.debug("Sending message", { component: "SystemDesignChat", message, sessionId: session.id });

      const userMessage = {
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true); // Start typing indicator

      try {
        logger.debug("Invoking Edge Function: coach_message", { component: "SystemDesignChat" });
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

        logger.debug("Edge Function response", { component: "SystemDesignChat", data, error: invokeError });

        if (invokeError) throw invokeError;

        if (data?.message) {
          logger.debug("Adding AI response to messages", { component: "SystemDesignChat" });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
            },
          ]);
        } else {
          logger.warn("No message in response data", { component: "SystemDesignChat", data });
        }

        // Update completeness state if provided
        if (data?.completeness) {
          logger.debug("Updating completeness state", { component: "SystemDesignChat", completeness: data.completeness });
          setCompleteness(data.completeness);
        }
      } catch (err) {
        logger.error("Error sending message", err, { component: "SystemDesignChat" });
        setError(getErrorMessage(err, "Failed to send message"));
        // Remove user message on error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsTyping(false); // Stop typing indicator
      }
    },
    [session],
  );

  const clearConversation = useCallback(async () => {
    logger.debug("========== CLEAR CONVERSATION START ==========", { component: "SystemDesignChat" });
    logger.debug("Current session", { component: "SystemDesignChat", session });

    if (!session) {
      logger.warn("No session found, aborting", { component: "SystemDesignChat" });
      return;
    }

    const sessionIdToDelete = session.id;
    logger.debug("Will delete session", { component: "SystemDesignChat", sessionIdToDelete });

    try {
      // Start typing animation to show we're working on it
      setIsTyping(true);

      // Small delay to show fade-out animation
      await new Promise(resolve => setTimeout(resolve, 300));

      logger.debug("Step 1: Deleting responses...", { component: "SystemDesignChat" });
      const { error: responsesError } = await supabase
        .from("system_design_responses")
        .delete()
        .eq("session_id", sessionIdToDelete);

      if (responsesError) {
        logger.error("Responses delete error", responsesError, { component: "SystemDesignChat" });
        throw responsesError;
      }
      logger.debug("Responses deleted successfully", { component: "SystemDesignChat" });

      logger.debug("Step 2: Deleting board state...", { component: "SystemDesignChat" });
      const { error: boardError } = await supabase
        .from("system_design_boards")
        .delete()
        .eq("session_id", sessionIdToDelete);

      if (boardError) {
        logger.error("Board delete error", boardError, { component: "SystemDesignChat" });
        throw boardError;
      }
      logger.debug("Board deleted successfully", { component: "SystemDesignChat" });

      logger.debug("Step 3: Deleting session...", { component: "SystemDesignChat" });
      const { error: sessionError } = await supabase
        .from("system_design_sessions")
        .delete()
        .eq("id", sessionIdToDelete);

      if (sessionError) {
        logger.error("Session delete error", sessionError, { component: "SystemDesignChat" });
        throw sessionError;
      }
      logger.debug("Session deleted successfully", { component: "SystemDesignChat" });

      logger.debug("Step 4: Resetting local state...", { component: "SystemDesignChat" });
      setMessages([]);
      setBoardState({ elements: [], appState: {}, files: {} });
      lastBoardStateRef.current = null;
      setEvaluation(null);
      setCompleteness(null);
      setSession(null);
      logger.debug("Local state reset successfully", { component: "SystemDesignChat" });

      logger.debug("Step 5: Creating new session...", { component: "SystemDesignChat" });
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
        logger.error("Create session error", createError, { component: "SystemDesignChat" });
        throw createError;
      }

      logger.debug("New session data", { component: "SystemDesignChat", newSessionData });

      const newSession: SystemDesignSession = {
        id: newSessionData.sessionId,
        userId,
        problemId,
        contextThreadId: newSessionData.contextThreadId,
        isCompleted: false,
        startedAt: new Date(),
      };

      logger.debug("Step 6: Setting new session...", { component: "SystemDesignChat" });
      setSession(newSession);

      if (newSessionData.message) {
        logger.debug("Step 7: Setting initial message...", { component: "SystemDesignChat" });
        setMessages([
          {
            role: "assistant",
            content: newSessionData.message,
            timestamp: new Date(),
          },
        ]);
      }

      setIsTyping(false);

      logger.debug("========== CLEAR CONVERSATION SUCCESS ==========", { component: "SystemDesignChat" });
    } catch (err) {
      logger.error("========== CLEAR CONVERSATION ERROR ==========", err, { component: "SystemDesignChat" });
      setError(getErrorMessage(err, "Failed to clear conversation"));
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
        setError(getErrorMessage(err, "Failed to evaluate design"));
      } finally {
        setIsEvaluating(false);
      }
    }, 500); // 500ms debounce for evaluation button
  }, [session, boardState, isEvaluating]);

  const saveDraft = useCallback(async () => {
    if (!session) {
      logger.debug("saveDraft: No session, skipping", { component: "SystemDesignChat" });
      return;
    }

    // Only save if there's actual work (elements or nodes on the board)
    const hasContent = (boardState.elements && boardState.elements.length > 0) ||
      (boardState.nodes && boardState.nodes.length > 0);
    if (!hasContent) {
      logger.debug("saveDraft: No elements/nodes, skipping", { component: "SystemDesignChat" });
      return;
    }

    try {
      const draftHash = JSON.stringify(boardState ?? {});
      logger.debug("Saving current work as draft...", { component: "SystemDesignChat" });
      const { error: updateError } = await supabase
        .from("system_design_sessions")
        .update({ draft_board_state: boardState, draft_hash: draftHash })
        .eq("id", session.id);

      if (updateError) throw updateError;

      setHasDraft(true);
      setLastSavedDraftHash(draftHash);
      logger.debug("Draft saved successfully", { component: "SystemDesignChat" });
    } catch (err) {
      logger.error("Failed to save draft", err, { component: "SystemDesignChat" });
      setError(getErrorMessage(err, "Failed to save draft"));
    }
  }, [session, boardState]);

  const restoreDraft = useCallback(async (): Promise<boolean> => {
    if (!session) {
      logger.debug("restoreDraft: No session, skipping", { component: "SystemDesignChat" });
      return false;
    }

    const backupState = lastBoardStateRef.current ?? boardState;

    try {
      logger.debug("Restoring draft...", { component: "SystemDesignChat" });
      const { data, error: fetchError } = await supabase
        .from("system_design_sessions")
        .select("draft_board_state, draft_hash")
        .eq("id", session.id)
        .single();

      if (fetchError) throw fetchError;

      if (data?.draft_board_state) {
        const draftState = data.draft_board_state as SystemDesignBoardState;
        logger.debug("Captured backup of current board state before restore", {
          component: "SystemDesignChat",
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
        logger.debug("Draft restored successfully", { component: "SystemDesignChat" });
        return true;
      } else {
        logger.debug("No draft found to restore", { component: "SystemDesignChat" });
        return false;
      }
    } catch (err) {
      logger.error("Failed to restore draft", err, { component: "SystemDesignChat" });
      setError(getErrorMessage(err, "Failed to restore draft"));
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
          logger.error("Failed to check draft", fetchError, { component: "SystemDesignChat" });
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
        logger.error("Failed to check draft", err, { component: "SystemDesignChat" });
        if (mounted) {
          setError(getErrorMessage(err, "Failed to check draft"));
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
    const boardUpdateTimeout = boardUpdateTimeoutRef.current;
    const evaluationTimeout = evaluationTimeoutRef.current;
    const reactionTimeout = reactionTimeoutRef.current;

    return () => {
      if (boardUpdateTimeout) {
        clearTimeout(boardUpdateTimeout);
      }
      if (evaluationTimeout) {
        clearTimeout(evaluationTimeout);
      }
      if (reactionTimeout) {
        clearTimeout(reactionTimeout);
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
