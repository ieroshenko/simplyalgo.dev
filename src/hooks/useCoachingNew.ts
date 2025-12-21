/**
 * Main coaching hook - composes sub-hooks for a complete coaching experience
 */
import { useCallback, useRef } from "react";
import { CoachHighlightArea, InteractiveCoachSession } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

// Import from coaching module
import {
  UseCoachingProps,
  CoachingState,
  codeContainsSnippet,
  stripCodeFences,
  isLargeInsertion,
} from "./coaching";
import { useCoachingEditor } from "./coaching/useCoachingEditor";
import { useCoachingPosition } from "./coaching/useCoachingPosition";
import { useCoachingState } from "./coaching/useCoachingState";

// Re-export for backwards compatibility
export type { CoachingState } from "./coaching";

export const useCoachingNew = ({
  problemId,
  userId,
  problemDescription,
  editorRef,
  onCodeInsert,
  confirmLargeInsert,
}: UseCoachingProps) => {
  // Compose sub-hooks
  const { positionManager, getPositionBelowLastLine, handlePositionChange } = useCoachingPosition(problemId, editorRef);
  const { applyHighlight, getScreenPosition, highlightDecorationsRef } = useCoachingEditor(editorRef);
  const {
    coachingState,
    contextState,
    startTimeRef,
    setCoachingState,
    setContextState,
    showInteractiveQuestion: showInteractiveQuestionBase,
    resetCoachingState,
    cancelInput,
    closeFeedback,
    getElapsedTime,
  } = useCoachingState(positionManager);

  // Wrap showInteractiveQuestion with required dependencies
  const showInteractiveQuestion = useCallback(({ question, hint, highlightArea }: {
    question: string;
    hint?: string;
    highlightArea?: CoachHighlightArea;
  }) => {
    showInteractiveQuestionBase({ question, hint, highlightArea }, applyHighlight, getPositionBelowLastLine);
  }, [showInteractiveQuestionBase, applyHighlight, getPositionBelowLastLine]);

  // Stop coaching session
  const stopCoaching = useCallback(() => {
    resetCoachingState(applyHighlight);
  }, [resetCoachingState, applyHighlight]);

  // Start coaching session
  const startCoaching = useCallback(async () => {
    if (!editorRef.current) {
      logger.error("Editor not available", null, { component: "Coaching" });
      return;
    }

    setCoachingState(prev => ({
      ...prev,
      isWaitingForResponse: true,
      feedback: { ...prev.feedback, show: false },
    }));

    try {
      const currentCode = editorRef.current.getValue();
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'start_interactive_coaching',
          problemId,
          userId,
          currentCode,
          difficulty: 'beginner',
          problemDescription: problemDescription || `Problem ${problemId}`,
        },
      });

      if (error) throw error;

      logger.debug("Session started", { component: "Coaching", data });

      startTimeRef.current = new Date();

      // Update context state for Responses API optimization
      setContextState({
        responseId: data.responseId || null,
        contextInitialized: !!data.responseId,
        lastCodeSnapshot: currentCode,
      });

      // Check if session started as already completed
      if (data.isCompleted) {
        logger.debug("Solution already complete at session start", { component: "Coaching", isOptimizable: data.isOptimizable });

        setCoachingState(prev => ({
          ...prev,
          session: {
            id: data.sessionId,
            currentStepNumber: 1,
            isCompleted: true,
            currentQuestion: data.question || '🎉 Your solution is correct!',
            currentHint: data.hint,
            highlightArea: null,
          } as InteractiveCoachSession,
          isCoachModeActive: true,
          isOptimizable: data.isOptimizable,
          showInputOverlay: true,
          inputPosition: getPositionBelowLastLine(),
          isWaitingForResponse: false,
          currentHighlight: null,
          feedback: {
            show: true,
            type: "success",
            message: "🎉 All test cases passed!",
            showConfetti: true,
          },
        }));

        return;
      }

      // Initialize session state locally
      setCoachingState(prev => ({
        ...prev,
        session: {
          id: data.sessionId,
          currentStepNumber: 1,
          isCompleted: false,
          currentQuestion: data.question,
          currentHint: data.hint,
          highlightArea: data.highlightArea,
        } as InteractiveCoachSession,
        isCoachModeActive: true,
        currentHighlight: data.highlightArea || null,
      }));

      // Immediately validate current code
      try {
        const { data: validation, error: vErr } = await supabase.functions.invoke('ai-chat', {
          body: {
            action: 'validate_coaching_submission',
            sessionId: data.sessionId,
            studentCode: currentCode,
            currentEditorCode: currentCode,
            problemDescription: problemDescription || `Problem ${problemId}`,
            userId,
          },
        });

        if (vErr) throw vErr;

        if (validation?.nextAction === 'complete_session' || (validation?.isCorrect && validation?.nextAction === 'insert_and_continue' && validation?.codeToAdd === '')) {
          applyHighlight(null);
          const pos = getPositionBelowLastLine();

          logger.debug("Solution validated as complete", { component: "Coaching", isOptimizable: validation.isOptimizable });

          setCoachingState(prev => ({
            ...prev,
            isOptimizable: validation.isOptimizable,
            session: prev.session ? {
              ...prev.session,
              isCompleted: true,
              currentQuestion: '',
              currentHint: undefined
            } : prev.session,
            lastValidation: null,
            showInputOverlay: true,
            inputPosition: pos,
            isWaitingForResponse: false,
            currentHighlight: null,
            feedback: { ...prev.feedback, show: false },
          }));
        } else {
          showInteractiveQuestion({
            question: data.question,
            hint: data.hint,
            highlightArea: data.highlightArea,
          });
        }
      } catch (vError) {
        logger.warn("Initial validation failed; proceeding with first question", { component: "Coaching", error: vError });
        showInteractiveQuestion({
          question: data.question,
          hint: data.hint,
          highlightArea: data.highlightArea,
        });
      }

    } catch (error) {
      logger.error("Error starting coaching", error, { component: "Coaching" });

      setCoachingState(prev => ({
        ...prev,
        isWaitingForResponse: false,
        feedback: {
          show: true,
          type: "error",
          message: "Failed to start coaching session. Please try again.",
          showConfetti: false,
        },
      }));
    }
  }, [problemId, userId, editorRef, problemDescription, showInteractiveQuestion, applyHighlight, getPositionBelowLastLine, setCoachingState, setContextState, startTimeRef]);

  // Submit coaching code for validation
  const submitCoachingCode = useCallback(async (userCode: string, userInput: string = "") => {
    if (!coachingState.session) {
      logger.error("No active session", null, { component: "Coaching" });
      return;
    }

    logger.debug("Submitting code for validation", { component: "Coaching", userCode, userInput });

    setCoachingState(prev => ({
      ...prev,
      isValidating: true,
      isWaitingForResponse: true,
      showInputOverlay: false,
    }));

    try {
      const currentCode = editorRef.current?.getValue() || "";

      if (coachingState.isOptimizationMode) {
        // Validate optimization step
        logger.debug("validate_optimization_step payload", { component: "Coaching", codeLen: currentCode.length });
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            action: 'validate_optimization_step',
            sessionId: coachingState.session.id,
            currentEditorCode: currentCode,
            code: currentCode,
            problemDescription: problemDescription || `Problem ${problemId}`,
            previousStep: coachingState.lastOptimizationStep || undefined,
          },
        });

        if (error) throw error;
        logger.debug("Optimization validation response", { component: "Coaching", data });

        setCoachingState(prev => ({ ...prev, isValidating: false, isWaitingForResponse: false }));

        if (data?.nextAction === 'complete_optimization' && data?.isCorrect === true) {
          applyHighlight(null);
          const pos = getPositionBelowLastLine();
          setCoachingState(prev => ({
            ...prev,
            isOptimizationMode: false,
            session: prev.session ? { ...prev.session, isCompleted: true, currentQuestion: '', currentHint: undefined } : prev.session,
            lastValidation: null,
            showInputOverlay: true,
            inputPosition: pos,
            feedback: { show: true, type: 'success', message: data?.feedback || 'Optimization complete!', showConfetti: true },
          }));
          return;
        }

        if (data && data.isCorrect === false) {
          setCoachingState(prev => ({
            ...prev,
            lastValidation: {
              isCorrect: false,
              feedback: data.feedback || 'Not quite. Adjust your code based on the hint.',
              codeToAdd: data.codeToAdd || '',
            },
            showInputOverlay: true,
          }));
          if (data.highlightArea) {
            applyHighlight(data.highlightArea);
          }
          return;
        }

        const step = typeof data?.nextStep === 'string' ? (() => { try { return JSON.parse(data.nextStep); } catch { return null; } })() : data?.nextStep || null;
        if (step && step.question) {
          showInteractiveQuestion({ question: step.question, hint: step.hint, highlightArea: step.highlightArea });
          setCoachingState(prev => ({ ...prev, lastValidation: null, showInputOverlay: true, lastOptimizationStep: step }));
          return;
        }

        setCoachingState(prev => ({
          ...prev,
          showInputOverlay: true,
          feedback: { show: true, type: 'hint', message: data?.feedback || 'Consider a small optimization change next.', showConfetti: false },
        }));
        return;
      }

      // Default: validate correctness flow
      logger.debug("validate_coaching_submission payload", { component: "Coaching", codeLen: currentCode.length });
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'validate_coaching_submission',
          sessionId: coachingState.session.id,
          studentCode: userCode,
          studentResponse: userInput,
          currentEditorCode: currentCode,
          code: currentCode,
          previousResponseId: contextState.responseId,
        },
      });

      if (error) throw error;

      logger.debug("Validation response", { component: "Coaching", data });

      if (data.responseId) {
        setContextState(prev => ({
          ...prev,
          responseId: data.responseId,
          contextInitialized: true,
          lastCodeSnapshot: currentCode,
        }));
      }

      setCoachingState(prev => ({ ...prev, isValidating: false, isWaitingForResponse: false }));

      if (data.isCorrect && data.nextAction === "insert_and_continue") {
        logger.debug("Code validated successfully", { component: "Coaching" });

        if (data.codeToAdd && data.codeToAdd.trim()) {
          const codeToInsert = data.codeToAdd.trim();
          try {
            const editor = editorRef.current;
            const before = editor?.getValue() || "";

            if (!codeContainsSnippet(before, codeToInsert)) {
              logger.debug("Using smart insertion for coaching code", { component: "Coaching" });

              const position = editor?.getPosition();
              const cursorPosition = {
                line: position?.lineNumber ? position.lineNumber - 1 : 0,
                column: position?.column || 0,
              };

              const snippet = {
                id: `coaching-${Date.now()}`,
                code: codeToInsert,
                language: "python",
                isValidated: true,
                insertionType: "smart" as const,
                insertionHint: {
                  type: "statement",
                  scope: "function",
                  description: "AI coaching generated code"
                }
              };

              try {
                const { data: insertResult, error: insertError } = await supabase.functions.invoke("ai-chat", {
                  body: {
                    action: "insert_snippet",
                    code: before,
                    snippet,
                    cursorPosition,
                    problemDescription: problemDescription || "",
                    message: `[coaching snippet insertion] Fix these issues: ${data.feedback || 'Apply suggested code changes'}`,
                    conversationHistory: [],
                  },
                });

                if (insertError) {
                  logger.error("Smart insertion failed", insertError, { component: "Coaching" });
                  throw new Error(`Smart insertion failed: ${insertError.message}`);
                } else if (insertResult?.newCode) {
                  logger.debug("Smart insertion successful", { component: "Coaching" });
                  editor?.setValue(insertResult.newCode);
                } else {
                  logger.warn("No new code returned from smart insertion", { component: "Coaching" });
                  throw new Error("Smart insertion returned no code");
                }
              } catch (error) {
                logger.error("Smart insertion error", error, { component: "Coaching" });
                throw error;
              }
            } else {
              logger.debug("Suggested code already present; skipping insertion", { component: "Coaching" });
            }

            if (data.nextStep?.question) {
              logger.debug("Showing next question after code insertion", { component: "Coaching" });
              showInteractiveQuestion({
                question: data.nextStep.question,
                hint: data.nextStep.hint,
                highlightArea: data.nextStep.highlightArea,
              });
            } else {
              setCoachingState(prev => ({
                ...prev,
                isWaitingForResponse: false,
                feedback: {
                  show: true,
                  type: "success",
                  message: "✅ Code inserted successfully! Continue working or validate your solution.",
                  showConfetti: false,
                },
              }));
            }
          } catch (insertError) {
            logger.error("Insertion/revalidation failed", insertError, { component: "Coaching" });
            setCoachingState(prev => ({
              ...prev,
              feedback: {
                show: true,
                type: "error",
                message: "Code insertion failed. Please try again.",
                showConfetti: false,
              },
            }));
          }
        } else {
          logger.debug("Answer correct, no code to add", { component: "Coaching" });

          setCoachingState(prev => ({
            ...prev,
            lastValidation: data,
            showInputOverlay: true,
            isWaitingForResponse: false,
          }));

          const isComplete = data.nextAction === "complete_session" || !data.nextStep?.question;

          if (!isComplete && data.nextStep?.question) {
            setTimeout(() => {
              showInteractiveQuestion({
                question: data.nextStep.question,
                hint: data.nextStep.hint,
                highlightArea: data.nextStep.highlightArea,
              });
            }, 2000);
          } else {
            logger.debug("Solution complete, ending session", { component: "Coaching" });

            setCoachingState(prev => ({
              ...prev,
              session: prev.session ? {
                ...prev.session,
                isCompleted: true,
                currentQuestion: "",
                currentHint: undefined,
              } : null,
              lastValidation: null,
              showInputOverlay: false,
              inputPosition: null,
              currentHighlight: null,
              feedback: {
                show: true,
                type: "success",
                message: "🎉 Well done! Solution complete. Check if there are optimizations available.",
                showConfetti: true,
              },
            }));

            logger.debug("Solution completed - state updated", { component: "Coaching", isCompleted: true, showInputOverlay: false });

            applyHighlight(null);
            setTimeout(stopCoaching, 1500);
          }
        }
      } else if (data.isCorrect === true && data.nextAction === "complete_session") {
        logger.debug("Session completed", { component: "Coaching" });

        setCoachingState(prev => ({
          ...prev,
          session: prev.session ? {
            ...prev.session,
            isCompleted: true,
            currentQuestion: "",
            currentHint: undefined,
          } : null,
          lastValidation: data,
          showInputOverlay: true,
          inputPosition: prev.inputPosition,
          currentHighlight: null,
          isOptimizable: data.isOptimizable,
          feedback: {
            show: true,
            type: "success",
            message: "🎉 Congratulations! You've completed the coaching session!",
            showConfetti: true,
          },
        }));

        applyHighlight(null);
      } else {
        logger.debug("Code needs correction - showing feedback", { component: "Coaching" });

        setCoachingState(prev => ({
          ...prev,
          lastValidation: data,
          showInputOverlay: true,
          inputPosition: prev.inputPosition,
        }));
      }

    } catch (error) {
      logger.error("Error submitting code", error, { component: "Coaching" });

      setCoachingState(prev => ({
        ...prev,
        isValidating: false,
        isWaitingForResponse: false,
        feedback: {
          show: true,
          type: "error",
          message: "Failed to validate your submission. Please try again.",
          showConfetti: false,
        },
      }));
    }
  }, [coachingState.session, editorRef, showInteractiveQuestion, stopCoaching, problemDescription, applyHighlight, getPositionBelowLastLine, contextState.responseId, problemId, coachingState.isOptimizationMode, coachingState.lastOptimizationStep, setCoachingState, setContextState]);

  // Insert correct code from AI validation
  const insertCorrectCode = useCallback(async () => {
    if (!coachingState.lastValidation?.codeToAdd) return;

    const codeToInsert = stripCodeFences(coachingState.lastValidation.codeToAdd);

    try {
      const editor = editorRef.current;
      const before = editor?.getValue() || "";

      if (!codeContainsSnippet(before, codeToInsert)) {
        if (isLargeInsertion(codeToInsert)) {
          const lines = codeToInsert.split('\n').filter(l => l.trim().length > 0);
          const ok = confirmLargeInsert
            ? await confirmLargeInsert({ code: codeToInsert, lineCount: lines.length })
            : window.confirm('The suggested fix looks large and may replace part of your function. Proceed?');
          if (!ok) {
            setCoachingState(prev => ({
              ...prev,
              feedback: { show: true, type: 'hint', message: 'Insertion canceled. You can paste manually or apply a smaller change.', showConfetti: false },
            }));
            return;
          }
        } else {
          logger.debug("Using smart replacement for code correction", { component: "Coaching" });
        }

        logger.debug("Using shared insertion logic for consistency with chat mode", { component: "Coaching" });

        if (onCodeInsert) {
          await onCodeInsert(codeToInsert);
        }

        logger.debug("Shared insertion completed successfully", { component: "Coaching" });
      } else {
        logger.debug("Suggested code already present; skipping insertion", { component: "Coaching" });
      }

      setCoachingState(prev => ({
        ...prev,
        showInputOverlay: true,
        lastValidation: undefined,
        isWaitingForResponse: false,
        feedback: {
          show: true,
          type: "success",
          message: "✅ Code inserted! What do you think about this approach?",
          showConfetti: false,
        },
      }));
    } catch (aiError) {
      logger.error("AI insertion failed", aiError, { component: "Coaching" });
      setCoachingState(prev => ({
        ...prev,
        feedback: {
          show: true,
          type: "error",
          message: "Code insertion failed. Please try again or continue manually.",
          showConfetti: false,
        },
      }));
    }
  }, [coachingState.lastValidation, onCodeInsert, editorRef, confirmLargeInsert, setCoachingState]);

  // Legacy submit response function
  const submitResponse = useCallback(async (response: string) => {
    logger.debug("submitResponse called - redirecting to submitCoachingCode", { component: "Coaching" });
    await submitCoachingCode(response, response);
  }, [submitCoachingCode]);

  // Skip current step
  const skipStep = useCallback(() => {
    logger.debug("Skip step called - ending coaching session", { component: "Coaching" });
    stopCoaching();
  }, [stopCoaching]);

  // Start optimization flow
  const startOptimization = useCallback(async (type: 'optimization' | 'alternative' = 'optimization') => {
    try {
      setCoachingState(prev => ({ ...prev, isWaitingForResponse: true, isValidating: false, isOptimizationMode: true }));
      const editor = editorRef.current;
      const currentCode = editor?.getValue() || "";
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'start_optimization_coaching',
          problemId,
          userId,
          currentCode,
          difficulty: 'beginner',
          problemDescription: problemDescription || `Problem ${problemId}`,
        },
      });
      if (error) throw error;

      const step = typeof data?.step === 'string' ? (() => { try { return JSON.parse(data.step); } catch { return null; } })() : null;
      if (data?.nextAction === 'complete_optimization') {
        setCoachingState(prev => ({
          ...prev,
          feedback: { show: true, type: 'success', message: data?.message || 'Already optimal. Great job!', showConfetti: true },
          isWaitingForResponse: false,
          isOptimizationMode: false,
        }));
        return;
      }
      if (step) {
        showInteractiveQuestion({
          question: step.question,
          hint: step.hint,
          highlightArea: step.highlightArea,
        });
        setCoachingState(prev => ({
          ...prev,
          lastValidation: undefined,
          lastOptimizationStep: step,
          isWaitingForResponse: false,
          showInputOverlay: true,
          isOptimizationMode: true,
        }));
      }
    } catch (e) {
      logger.error("Failed to start optimization", e, { component: "Coaching" });
      setCoachingState(prev => ({
        ...prev,
        feedback: { show: true, type: 'error', message: 'Failed to start optimization. Please try again.', showConfetti: false },
        isWaitingForResponse: false,
        isOptimizationMode: false,
      }));
    }
  }, [editorRef, problemId, userId, problemDescription, showInteractiveQuestion, setCoachingState]);

  return {
    coachingState,
    startCoaching,
    stopCoaching,
    submitResponse,
    submitCoachingCode,
    insertCorrectCode,
    cancelInput,
    closeFeedback,
    skipStep,
    startOptimization,
    getElapsedTime,
    handlePositionChange,
  };
};
