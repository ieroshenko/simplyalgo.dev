import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {  CoachStep, CoachHighlightArea, InteractiveCoachSession } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { OverlayPositionManager } from "../services/overlayPositionManager";

interface UseCoachingProps {
  problemId: string;
  userId: string;
  problemDescription?: string;
  editorRef: React.RefObject<{
    getValue: () => string;
    setValue: (value: string) => void;
    deltaDecorations: (oldDecorations: string[], newDecorations: unknown[]) => string[];
    getScrollTop: () => number;
    getVisibleRanges: () => unknown[];
    getPosition: () => { lineNumber: number; column: number } | null;
    getDomNode?: () => HTMLElement | null;
    getScrolledVisiblePosition?: (position: { lineNumber: number; column: number }) => { left: number; top: number; height: number } | null;
  } | null>;
  onCodeInsert?: (code: string) => Promise<void>;
}

interface CoachingState {
  session: InteractiveCoachSession | null;
  isCoachModeActive: boolean;
  currentHighlight: CoachHighlightArea | null;
  showInputOverlay: boolean;
  inputPosition: { x: number; y: number } | null;
  isWaitingForResponse: boolean;
  isValidating: boolean;
  lastValidation: {
    isCorrect: boolean;
    feedback: string;
    nextAction: string;
    codeToAdd: string;
  } | undefined;
  feedback: {
    show: boolean;
    type: string | null;
    message: string;
    showConfetti: boolean;
  };
  optimizationSessionType?: 'optimization' | 'alternative'; // Track current session type
  lastOptimizationStep?: {
    question: string;
    hint?: string;
    sessionType?: 'optimization' | 'alternative';
    highlightArea?: CoachHighlightArea;
  };
  // Enhanced positioning system
  positionManager?: OverlayPositionManager;
}

export const useCoachingNew = ({ problemId, userId, problemDescription, editorRef, onCodeInsert }: UseCoachingProps) => {
  // Initialize position manager for centralized overlay positioning
  const positionManager = useMemo(() => {
    if (problemId) {
      return new OverlayPositionManager(problemId);
    }
    return undefined;
  }, [problemId]);

  const [coachingState, setCoachingState] = useState<CoachingState>({
    session: null,
    isCoachModeActive: false,
    currentHighlight: null,
    showInputOverlay: false,
    inputPosition: null,
    isWaitingForResponse: false,
    isValidating: false,
    lastValidation: undefined,
    feedback: {
      show: false,
      type: null,
      message: "",
      showConfetti: false,
    },
    positionManager,
  });

  // Context tracking for Responses API optimization
  const [contextState, setContextState] = useState<{
    responseId: string | null;
    contextInitialized: boolean;
    lastCodeSnapshot: string;
  }>({
    responseId: null,
    contextInitialized: false,
    lastCodeSnapshot: '',
  });

  // Update position manager in coaching state when it changes
  useEffect(() => {
    setCoachingState(prev => ({
      ...prev,
      positionManager,
    }));
  }, [positionManager]);

  const highlightDecorationsRef = useRef<string[]>([]);
  const startTimeRef = useRef<Date | null>(null);

  // Helper: detect whether a code snippet is already present (normalized)
  const codeContainsSnippet = useCallback((full: string, snippet: string) => {
    const normalize = (s: string) =>
      s
        .replace(/#.*$/gm, "") // strip inline comments
        .replace(/\s+/g, " ") // collapse whitespace
        .trim();
    const f = normalize(full);
    const sn = normalize(snippet);
    return f.includes(sn);
  }, []);

  // Apply highlight to editor
  const applyHighlight = useCallback((highlightArea: CoachHighlightArea | null) => {
    if (!editorRef.current) return;
    
    try {
      if (highlightArea) {
        const newDecorations = [{
          range: {
            startLineNumber: highlightArea.startLine,
            startColumn: 1,
            endLineNumber: highlightArea.startLine, // Only highlight single line, not range
            endColumn: 1000
          },
          options: {
            className: 'coach-highlight-area',
            isWholeLine: true
          }
        }];
        
        highlightDecorationsRef.current = editorRef.current.deltaDecorations(
          highlightDecorationsRef.current,
          newDecorations
        );
      } else {
        // Clear highlights
        highlightDecorationsRef.current = editorRef.current.deltaDecorations(
          highlightDecorationsRef.current,
          []
        );
      }
    } catch (error) {
      console.error("Error applying highlight:", error);
    }
  }, [editorRef]);

  // Calculate position for overlay
  const getScreenPosition = useCallback((lineNumber: number) => {
    try {
      if (!editorRef.current) {
        return { x: 100, y: 150 };
      }

      const position = { lineNumber, column: 1 };
      const screenPos = editorRef.current.getScrolledVisiblePosition?.(position);
      
      if (screenPos) {
        const belowY = (screenPos.top || 0) + (screenPos.height || 20) + 12;
        return {
          x: Math.max(50, Math.min(window.innerWidth - 400, (screenPos.left || 0) + 50)),
          y: Math.max(30, Math.min(window.innerHeight - 300, belowY))
        };
      }
      
      // Fallback positioning
      const estimatedY = 150 + (lineNumber * 20);
      return {
        x: Math.max(50, Math.min(window.innerWidth - 400, 100)),
        y: Math.max(30, Math.min(window.innerHeight - 300, estimatedY))
      };
    } catch (error) {
      console.warn('Error calculating position:', error);
      return { x: 100, y: 150 };
    }
  }, [editorRef]);

  // Calculate position for overlay using the new positioning system
  const getPositionBelowLastLine = useCallback(() => {
    try {
      if (!editorRef.current || !positionManager) {
        return { x: 100, y: Math.min(window.innerHeight - 220, 180) };
      }

      // Get editor bounds
      const editorNode = editorRef.current.getDomNode?.();
      const editorRect = editorNode?.getBoundingClientRect();
      
      if (!editorRect) {
        // Use fallback positioning when editor bounds unavailable
        const fallbackPosition = positionManager.getPositionWithFallback();
        return { x: fallbackPosition.x, y: fallbackPosition.y };
      }

      const editorBounds = {
        left: editorRect.left,
        top: editorRect.top,
        right: editorRect.right,
        bottom: editorRect.bottom,
        width: editorRect.width,
        height: editorRect.height,
      };

      // Get the last line number for positioning
      const code = editorRef.current.getValue();
      const totalLines = Math.max(1, (code || "").split('\n').length);

      // Use OverlayPositionManager for smart positioning
      const position = positionManager.getPositionWithFallback(editorBounds, totalLines);
      return { x: position.x, y: position.y };
    } catch (error) {
      console.warn('Error calculating position using OverlayPositionManager:', error);
      // Fallback to basic positioning
      return { x: 100, y: Math.min(window.innerHeight - 220, 180) };
    }
  }, [editorRef, positionManager]);

  // Show interactive question overlay
  const showInteractiveQuestion = useCallback(({ question, hint, highlightArea }: {
    question: string;
    hint?: string;
    highlightArea?: CoachHighlightArea;
  }) => {
    console.log("🎯 [SHOW QUESTION] Showing interactive question:", { question, hint, highlightArea });

    // Use the highlight area provided by the AI backend - it already calculates the correct insertion point
    const finalHighlight = highlightArea || null;

    // Apply highlight if provided
    if (finalHighlight) {
      applyHighlight(finalHighlight);
    }

    // Calculate position for the overlay: always below the last line to avoid covering code
    const screenPosition = getPositionBelowLastLine();

    setCoachingState(prev => ({
      ...prev,
      showInputOverlay: true,
      isWaitingForResponse: false, // Now that overlay is showing, stop loading
      // Preserve previous overlay position if already set
      inputPosition: prev.inputPosition || screenPosition,
      currentHighlight: finalHighlight || null,
      session: prev.session ? {
        ...prev.session,
        isCompleted: false, // Showing a question implies active session
        currentQuestion: question,
        currentHint: hint,
        highlightArea: finalHighlight ? {
          startLine: finalHighlight.startLine,
          endLine: finalHighlight.endLine,
          startColumn: 1,
          endColumn: 1,
        } : prev.session.highlightArea,
      } : prev.session,
    }));
    
    console.log("🎯 [STATE] Overlay now showing:", {
      showInputOverlay: true,
      isWaitingForResponse: false,
      currentQuestion: question
    });
  }, [applyHighlight, getPositionBelowLastLine]);

  // Start coaching session
  const startCoaching = useCallback(async () => {
    if (!editorRef.current) {
      console.error("🚨 [COACHING] Editor not available");
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

      console.log("✅ [COACHING] Session started:", data);

      startTimeRef.current = new Date();

      // Update context state for Responses API optimization
      setContextState({
        responseId: data.responseId || null,
        contextInitialized: !!data.responseId,
        lastCodeSnapshot: currentCode,
      });

      // Check if session started as already completed
      if (data.isCompleted) {
        console.log("✅ [COACHING] Solution already complete at session start", { 
          isOptimizable: data.isOptimizable 
        });

        // Initialize session state as completed - show the congratulations message in overlay
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
          isOptimizable: data.isOptimizable, // ← Use backend's optimization check
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
        // Keep isWaitingForResponse: true until overlay is ready to show
        currentHighlight: data.highlightArea || null,
      }));

      // Immediately validate current code so we don't show a question if the user already solved it
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
          // Consider it solved — backend validation now includes optimization check
          applyHighlight(null);
          const pos = getPositionBelowLastLine();

          console.log("✅ [COACHING] Solution validated as complete", { 
            isOptimizable: validation.isOptimizable 
          });

          setCoachingState(prev => ({
            ...prev,
            isOptimizable: validation.isOptimizable, // ← Use backend's optimization check from validation
            session: prev.session ? { 
              ...prev.session, 
              isCompleted: true, 
              currentQuestion: '', // ← Ensure question is cleared
              currentHint: undefined 
            } : prev.session,
            lastValidation: null, // ← Clear validation to prevent showing nextStep
            showInputOverlay: true,
            inputPosition: pos,
            isWaitingForResponse: false,
            currentHighlight: null,
            feedback: { ...prev.feedback, show: false },
          }));
        } else {
          // Not solved yet — show first interactive step
          showInteractiveQuestion({
            question: data.question,
            hint: data.hint,
            highlightArea: data.highlightArea,
          });
        }
      } catch (vError) {
        console.warn('[COACHING] Initial validation failed; proceeding with first question', vError);
        showInteractiveQuestion({
          question: data.question,
          hint: data.hint,
          highlightArea: data.highlightArea,
        });
      }

    } catch (error) {
      console.error("🚨 [COACHING] Error starting coaching:", error);
      
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
  }, [problemId, userId, editorRef, problemDescription, showInteractiveQuestion]);

  // Stop coaching session (moved up to avoid forward-reference lint)
  const stopCoaching = useCallback(() => {
    if (applyHighlight) {
      applyHighlight(null);
    }
    if (startTimeRef.current) {
      startTimeRef.current = null;
    }
    
    // Reset context state for clean start
    setContextState({
      responseId: null,
      contextInitialized: false,
      lastCodeSnapshot: '',
    });
    
    setCoachingState({
      session: null,
      isCoachModeActive: false,
      currentHighlight: null,
      showInputOverlay: false,
      inputPosition: null,
      isWaitingForResponse: false,
      isValidating: false,
      lastValidation: undefined,
      feedback: {
        show: false,
        type: null,
        message: "",
        showConfetti: false,
      },
    });
  }, [applyHighlight]);

  // Submit coaching code for validation
  const submitCoachingCode = useCallback(async (userCode: string, userInput: string = "") => {
    if (!coachingState.session) {
      console.error("🚨 [COACHING] No active session");
      return;
    }

    console.log("🎯 [SUBMIT] Submitting code for validation:", { userCode, userInput });

    setCoachingState(prev => ({
      ...prev,
      isValidating: true,
      isWaitingForResponse: true,
      showInputOverlay: false,
    }));

    try {
      const currentCode = editorRef.current?.getValue() || "";

      if (coachingState.isOptimizationMode) {
        // Validate optimization step instead of correctness
        console.debug('[COACHING][payload] validate_optimization_step codeLen=', currentCode.length);
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
        console.log('✅ [OPTIMIZATION] Validation response:', data);

        setCoachingState(prev => ({ ...prev, isValidating: false, isWaitingForResponse: false }));

        // Require explicit success to complete optimization; upstream may omit isCorrect
        if (data?.nextAction === 'complete_optimization' && data?.isCorrect === true) {
          // Only complete optimization when the step is actually correct
          applyHighlight(null);
          const pos = getPositionBelowLastLine();
          setCoachingState(prev => ({
            ...prev,
            isOptimizationMode: false,
            session: prev.session ? { ...prev.session, isCompleted: true, currentQuestion: '', currentHint: undefined } : prev.session,
            lastValidation: null, // Clear validation result to prevent showing nextStep questions
            showInputOverlay: true,
            inputPosition: pos,
            feedback: { show: true, type: 'success', message: data?.feedback || 'Optimization complete!', showConfetti: true },
          }));
          return;
        }

        // If incorrect, show feedback and offer insertion when provided
        if (data && data.isCorrect === false) {
          setCoachingState(prev => ({
            ...prev,
            lastValidation: {
              isCorrect: false,
              feedback: data.feedback || 'Not quite. Adjust your code based on the hint.',
              nextAction: data.nextAction || 'retry',
              codeToAdd: data.codeToAdd || '',
            },
            showInputOverlay: true,
          }));
          if (data.highlightArea) {
            applyHighlight(data.highlightArea);
          }
          return;
        }

        // Expect a nextStep payload (string JSON or object). Show next optimization question
        const step = typeof data?.nextStep === 'string' ? (() => { try { return JSON.parse(data.nextStep); } catch { return null; } })() : data?.nextStep || null;
        if (step && step.question) {
          showInteractiveQuestion({ question: step.question, hint: step.hint, highlightArea: step.highlightArea });
          setCoachingState(prev => ({ ...prev, lastValidation: null, showInputOverlay: true, lastOptimizationStep: step }));
          return;
        }

        // Fallback: gentle guidance
        setCoachingState(prev => ({
          ...prev,
          showInputOverlay: true,
          feedback: { show: true, type: 'hint', message: data?.feedback || 'Consider a small optimization change next.', showConfetti: false },
        }));
        return;
      }

      // Default: validate correctness flow
      console.debug('[COACHING][payload] validate_coaching_submission codeLen=', currentCode.length);
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'validate_coaching_submission',
          sessionId: coachingState.session.id,
          studentCode: userCode,
          studentResponse: userInput,
          currentEditorCode: currentCode,
          code: currentCode,
          // Context tracking for token optimization
          previousResponseId: contextState.responseId,
        },
      });

      if (error) throw error;

      console.log("✅ [COACHING] Validation response:", data);

      // Update context state with new response ID
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
        console.log("🎉 [COACHING] Code validated successfully!");

        if (data.codeToAdd && data.codeToAdd.trim()) {
          const codeToInsert = data.codeToAdd.trim();
          try {
            const editor = editorRef.current;
            const before = editor?.getValue() || "";

            // Use same smart insertion as chat snippets
            if (!codeContainsSnippet(before, codeToInsert)) {
              console.log("🎯 [INSERT CODE] Using smart insertion for coaching code");
              
              const position = editor?.getPosition();
              const cursorPosition = {
                line: position?.lineNumber ? position.lineNumber - 1 : 0,
                column: position?.column || 0,
              };

              const snippet = {
                id: `coaching-${Date.now()}`,
                code: codeToInsert,
                language: "python", // TODO: detect from problem
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
                  console.error("❌ [COACHING] Smart insertion failed:", insertError);
                  throw new Error(`Smart insertion failed: ${insertError.message}`);
                } else if (insertResult?.newCode) {
                  console.log("✅ [COACHING] Smart insertion successful");
                  editor?.setValue(insertResult.newCode);
                } else {
                  console.warn("⚠️ [COACHING] No new code returned from smart insertion");
                  throw new Error("Smart insertion returned no code");
                }
              } catch (error) {
                console.error("❌ [COACHING] Smart insertion error:", error);
                throw error; // Re-throw to be caught by outer try-catch
              }
            } else {
              console.log("[COACHING] Suggested code already present; skipping insertion.");
            }

            // After insertion, show next question if available
            if (data.nextStep?.question) {
              console.log("🎯 [COACHING] Showing next question after code insertion");
              showInteractiveQuestion({
                question: data.nextStep.question,
                hint: data.nextStep.hint,
                highlightArea: data.nextStep.highlightArea,
              });
            } else {
              // No next question - just show success message
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
            console.error("🚨 [COACHING] Insertion/revalidation failed:", insertError);
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
          // No code to add, student's answer was correct
          console.log("✅ [COACHING] Answer correct, no code to add");

          // Store validation result to show feedback
          setCoachingState(prev => ({
            ...prev,
            lastValidation: data,
            showInputOverlay: true,
            isWaitingForResponse: false,
          }));

          // Check if solution is complete or if there's a next step
          const isComplete = data.nextAction === "complete_session" || !data.nextStep?.question;
          
          if (!isComplete && data.nextStep?.question) {
            // Show next question after a brief moment to let user see success feedback
            setTimeout(() => {
              showInteractiveQuestion({
                question: data.nextStep.question,
                hint: data.nextStep.hint,
                highlightArea: data.nextStep.highlightArea,
              });
            }, 2000); // 2 second delay to show success feedback
          } else {
            // Step completed without next step - finish session
            console.log("🎉 [COACHING] Solution complete, ending session");
            
            setCoachingState(prev => ({
              ...prev,
              session: prev.session ? { 
                ...prev.session, 
                isCompleted: true,
                currentQuestion: "", // Clear the question
                currentHint: undefined, // Clear the hint
              } : null,
              lastValidation: null, // Clear validation result to prevent showing nextStep questions
              // Hide overlay to prevent showing question + success together
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
            
            console.log("🎯 [STATE] Solution completed - state updated:", {
              isCompleted: true,
              currentQuestion: "",
              showInputOverlay: false,
              feedback: "success"
            });
            
            // Clear highlights
            if (applyHighlight) {
              applyHighlight(null);
            }
            
            setTimeout(stopCoaching, 1500);
          }
        }
      // Require explicit success to complete session; avoids completing on undefined/null
      } else if (data.isCorrect === true && data.nextAction === "complete_session") {
        console.log("🎉 [COACHING] Session completed!");
        
        // CRITICAL: Clear all overlay state when completing
        setCoachingState(prev => ({
          ...prev,
          session: prev.session ? { 
            ...prev.session, 
            isCompleted: true,
            currentQuestion: "", // ← Clear the stale question
            currentHint: undefined, // ← Clear the hint
          } : null,
          lastValidation: data, // ← Store the validation result for optimization logic
          showInputOverlay: true, // ← Keep overlay open for completion actions
          inputPosition: prev.inputPosition,
          currentHighlight: null,
          isOptimizable: data.isOptimizable, // ← Set optimization flag
          feedback: {
            show: true,
            type: "success", 
            message: "🎉 Congratulations! You've completed the coaching session!",
            showConfetti: true,
          },
        }));
        
        // Clear any editor highlights
        if (applyHighlight) {
          applyHighlight(null);
        }
      } else {
        console.log("🎯 [COACHING] Code needs correction - showing feedback");
        
        // Store the validation result for retry
        setCoachingState(prev => ({
          ...prev,
          lastValidation: data,
          showInputOverlay: true, // Keep overlay open for retry
          inputPosition: prev.inputPosition,
        }));
      }
      
    } catch (error) {
      console.error("🚨 [COACHING] Error submitting code:", error);
      
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
  }, [coachingState.session, editorRef, onCodeInsert, showInteractiveQuestion, codeContainsSnippet, stopCoaching, problemDescription]);

  // Insert correct code from AI validation
  const insertCorrectCode = useCallback(async () => {
    if (!coachingState.lastValidation?.codeToAdd) return;

    // Strip markdown code fences if present (e.g. ```python ... ```)
    const rawCode = coachingState.lastValidation.codeToAdd;
    const codeToInsert = rawCode.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();

    try {
      const editor = editorRef.current;
      const before = editor?.getValue() || "";

      if (!codeContainsSnippet(before, codeToInsert)) {
        const lines = codeToInsert.split('\n').filter(l => l.trim().length > 0);
        const looksLarge = lines.length > 8 || /\b(def\s+\w+\s*\(|class\s+\w+|if\s+__name__\s*==)/.test(codeToInsert);
        
        // For coaching corrections, default to 'replace' mode to fix incorrect code
        let insertionType: 'smart' | 'replace' = 'replace';
        
        if (looksLarge) {
          const ok = window.confirm('The suggested fix looks large and may replace part of your function. Proceed?');
          if (!ok) {
            setCoachingState(prev => ({
              ...prev,
              feedback: { show: true, type: 'hint', message: 'Insertion canceled. You can paste manually or apply a smaller change.', showConfetti: false },
            }));
            return;
          }
        } else {
          // For smaller corrections, use smart replacement without confirmation
          console.log("🎯 [COACHING] Using smart replacement for code correction");
        }
        console.log("🎯 [INSERT CODE] Using smart insertion for correct code");
        
        const position = editor?.getPosition();
        const cursorPosition = {
          line: position?.lineNumber ? position.lineNumber - 1 : 0,
          column: position?.column || 0,
        };

        const snippet = {
          id: `coaching-${Date.now()}`,
          code: codeToInsert,
          language: "python", // TODO: detect from problem
          isValidated: true,
          insertionType: insertionType as const,
          insertionHint: {
            type: "statement",
            scope: "function",
            description: "AI coaching generated code"
          }
        };

        try {
          console.log("🔧 [COACHING] Using shared insertion logic for consistency with chat mode");
          
          // Use the shared onCodeInsert callback with coaching context
          await onCodeInsert(codeToInsert, cursorPosition, insertionType, {
            isCoachingCorrection: true,
            feedback: coachingState.lastValidation.feedback
          });
          
          console.log("✅ [COACHING] Shared insertion completed successfully");
        } catch (error) {
          console.error("❌ [COACHING] Shared insertion error:", error);
          throw error; // Re-throw to be caught by outer try-catch
        }
      } else {
        console.log("[COACHING] Suggested code already present; skipping insertion.");
      }

      // After insertion, keep overlay open but change to "next step" mode
      setCoachingState(prev => ({ 
        ...prev, 
        showInputOverlay: true,
        lastValidation: undefined, 
        isWaitingForResponse: false,
        inputMode: "next_step", // New mode to track post-insertion state
        feedback: {
          show: true,
          type: "success", 
          message: "✅ Code inserted! What do you think about this approach?",
          showConfetti: false,
        },
      }));
    } catch (aiError) {
      console.error("🚨 [AI INSERTION] Failed:", aiError);
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
  }, [coachingState.lastValidation, coachingState.session, onCodeInsert, editorRef, showInteractiveQuestion, codeContainsSnippet, stopCoaching, problemDescription]);

  // Stop coaching session (removed duplicate later)

  // Cancel current input
  const cancelInput = useCallback(() => {
    setCoachingState(prev => ({
      ...prev,
      showInputOverlay: false,
      inputPosition: null,
    }));
  }, []);

  // Close feedback overlay
  const closeFeedback = useCallback(() => {
    setCoachingState(prev => ({
      ...prev,
      feedback: { ...prev.feedback, show: false },
    }));
  }, []);

  // Get elapsed time
  const getElapsedTime = useCallback(() => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
  }, []);

  // Legacy submit response function - simplified for compatibility
  const submitResponse = useCallback(async (response: string) => {
    console.log("🎯 [LEGACY] submitResponse called - redirecting to submitCoachingCode");
    await submitCoachingCode(response, response);
  }, [submitCoachingCode]);

  // Skip current step
  const skipStep = useCallback(() => {
    console.log("🎯 [SKIP] Skip step called - ending coaching session");
    stopCoaching();
  }, [stopCoaching]);

  // Start optimization flow
  const startOptimization = useCallback(async () => {
    try {
      // Show global loading spinner (same as coach mode)
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
      // Reuse overlay to show first optimization step (question/hint/highlight if returned)
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
        // Ensure overlay shows the new step (hide validation panel)
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
      console.error('❌ [OPTIMIZATION] Failed to start:', e);
      setCoachingState(prev => ({
        ...prev,
        feedback: { show: true, type: 'error', message: 'Failed to start optimization. Please try again.', showConfetti: false },
        isWaitingForResponse: false,
        isOptimizationMode: false,
      }));
    }
  }, [editorRef, problemId, userId, problemDescription, showInteractiveQuestion]);

  // Handle position changes for persistence
  const handlePositionChange = useCallback((position: { x: number; y: number }) => {
    if (positionManager) {
      try {
        // Get editor bounds for validation
        const editorNode = editorRef.current?.getDomNode?.();
        const editorRect = editorNode?.getBoundingClientRect();
        
        if (editorRect) {
          const editorBounds = {
            left: editorRect.left,
            top: editorRect.top,
            right: editorRect.right,
            bottom: editorRect.bottom,
            width: editorRect.width,
            height: editorRect.height,
          };
          
          const overlayPosition = {
            x: position.x,
            y: position.y,
            timestamp: Date.now(),
            screenSize: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          };
          
          // Validate and save position
          const validatedPosition = positionManager.validatePosition(overlayPosition, editorBounds);
          positionManager.savePosition(validatedPosition);
        }
      } catch (error) {
        console.warn('Failed to save position:', error);
      }
    }
  }, [positionManager, editorRef]);

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
