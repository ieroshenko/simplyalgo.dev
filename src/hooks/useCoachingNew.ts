import { useState, useCallback, useRef } from "react";
import { CoachingState, CoachStep, CoachHighlightArea, InteractiveCoachSession } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { insertCodeSnippet } from "@/utils/codeInsertion";

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

export const useCoachingNew = ({ problemId, userId, problemDescription, editorRef, onCodeInsert }: UseCoachingProps) => {
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
  });

  const highlightDecorationsRef = useRef<string[]>([]);
  const startTimeRef = useRef<Date | null>(null);

  // Apply highlight to editor
  const applyHighlight = useCallback((highlightArea: CoachHighlightArea | null) => {
    if (!editorRef.current) return;
    
    try {
      if (highlightArea) {
        const newDecorations = [{
          range: {
            startLineNumber: highlightArea.startLine,
            startColumn: 1,
            endLineNumber: highlightArea.endLine,
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
        return {
          x: Math.max(50, Math.min(window.innerWidth - 400, screenPos.left + 50)),
          y: Math.max(30, Math.min(window.innerHeight - 300, screenPos.top + 50))
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

  // Show interactive question overlay
  const showInteractiveQuestion = useCallback(({ question, hint, highlightArea }: {
    question: string;
    hint?: string;
    highlightArea?: CoachHighlightArea;
  }) => {
    console.log("🎯 [SHOW QUESTION] Showing interactive question:", { question, hint, highlightArea });

    // Apply highlight if provided
    if (highlightArea) {
      applyHighlight(highlightArea);
    }

    // Calculate position for the overlay
    const lineNumber = highlightArea?.startLine || 1;
    const screenPosition = getScreenPosition(lineNumber);

    setCoachingState(prev => ({
      ...prev,
      showInputOverlay: true,
      inputPosition: screenPosition,
      currentHighlight: highlightArea || null,
    }));
  }, [applyHighlight, getScreenPosition]);

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
        isWaitingForResponse: false,
        currentHighlight: data.highlightArea || null,
      }));

      // Show the first interactive question immediately
      showInteractiveQuestion({
        question: data.question,
        hint: data.hint,
        highlightArea: data.highlightArea,
      });

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

  // Submit coaching code for validation
  const submitCoachingCode = useCallback(async (userCode: string, userInput: string) => {
    if (!coachingState.session) {
      console.error("🚨 [COACHING] No active session");
      return;
    }

    console.log("🎯 [SUBMIT] Submitting code for validation:", { userCode, userInput });

    setCoachingState(prev => ({
      ...prev,
      isValidating: true,
      showInputOverlay: false,
    }));

    try {
      const currentCode = editorRef.current?.getValue() || "";
      
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'validate_coaching_submission',
          sessionId: coachingState.session.id,
          studentCode: userCode,
          studentResponse: userInput,
          currentEditorCode: currentCode,
        },
      });

      if (error) throw error;

      console.log("✅ [COACHING] Validation response:", data);

      setCoachingState(prev => ({
        ...prev,
        isValidating: false,
      }));

      if (data.isCorrect && data.nextAction === "insert_and_continue") {
        console.log("🎉 [COACHING] Code validated successfully!");
        
        // Handle code insertion if needed
        if (data.codeToAdd && data.codeToAdd.trim()) {
          const codeToInsert = data.codeToAdd.trim();
          console.log("🎯 [COACHING] Code to insert:", codeToInsert);
          
          try {
            if (onCodeInsert) {
              await onCodeInsert(codeToInsert);
            } else if (editorRef.current) {
              const currentCode = editorRef.current.getValue();
              const snippet = {
                id: `coaching-${Date.now()}`,
                code: codeToInsert,
                language: "python",
                isValidated: true,
                insertionType: "smart" as const,
                insertionHint: {
                  type: "statement" as const,
                  scope: "function" as const,
                  description: "Coaching validated code"
                }
              };

              const result = insertCodeSnippet(currentCode, snippet);
              editorRef.current.setValue(result.newCode);
              console.log("✅ [COACHING] Code inserted successfully");
            }

            // Show next step after insertion
            if (data.nextStep) {
              setTimeout(() => {
                showInteractiveQuestion({
                  question: data.nextStep.question,
                  hint: data.nextStep.hint,
                  highlightArea: data.nextStep.highlightArea,
                });
              }, 1000);
            }
          } catch (insertError) {
            console.error("🚨 [COACHING] Error inserting code:", insertError);
            // Still show next step even if insertion fails
            if (data.nextStep) {
              showInteractiveQuestion({
                question: data.nextStep.question,
                hint: data.nextStep.hint,
                highlightArea: data.nextStep.highlightArea,
              });
            }
          }
        } else {
          // No code to insert, show next step immediately
          console.log("🎯 [COACHING] No code to insert, showing next step immediately");
          if (data.nextStep) {
            setTimeout(() => {
              showInteractiveQuestion({
                question: data.nextStep.question,
                hint: data.nextStep.hint,
                highlightArea: data.nextStep.highlightArea,
              });
            }, 500);
          }
        }
      } else if (data.nextAction === "complete") {
        // Session completed!
        console.log("🎉 [COACHING] Session completed!");
        
        setCoachingState(prev => ({
          ...prev,
          session: prev.session ? { ...prev.session, isCompleted: true } : null,
          feedback: {
            show: true,
            type: "success",
            message: "🎉 Congratulations! You've completed the coaching session!",
            showConfetti: true,
          },
        }));
        
        // Auto-close after celebration
        setTimeout(stopCoaching, 3000);
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
        feedback: {
          show: true,
          type: "error", 
          message: "Failed to validate your submission. Please try again.",
          showConfetti: false,
        },
      }));
    }
  }, [coachingState.session, editorRef, onCodeInsert, showInteractiveQuestion]);

  // Insert correct code from AI validation
  const insertCorrectCode = useCallback(async () => {
    if (!coachingState.lastValidation?.codeToAdd) return;

    const codeToInsert = coachingState.lastValidation.codeToAdd;
    console.log("🎯 [INSERT CODE] Inserting AI-provided code:", codeToInsert);

    try {
      if (onCodeInsert) {
        await onCodeInsert(codeToInsert);
      } else if (editorRef.current) {
        const currentCode = editorRef.current.getValue();
        const snippet = {
          id: `coaching-${Date.now()}`,
          code: codeToInsert,
          language: "python",
          isValidated: true,
          insertionType: "smart" as const,
          insertionHint: {
            type: "statement" as const,
            scope: "function" as const,
            description: "Coaching validated code"
          }
        };

        const result = insertCodeSnippet(currentCode, snippet);
        editorRef.current.setValue(result.newCode);
      }

      // Show next step after insertion
      setCoachingState(prev => ({
        ...prev,
        showInputOverlay: false,
        lastValidation: undefined,
      }));

      const validation = coachingState.lastValidation;
      if (validation?.nextStep) {
        setTimeout(() => {
          showInteractiveQuestion({
            question: validation.nextStep.question,
            hint: validation.nextStep.hint,
            highlightArea: validation.nextStep.highlightArea,
          });
        }, 1500);
      }

    } catch (error) {
      console.error("🚨 [INSERT CODE] Error:", error);
    }
  }, [coachingState.lastValidation, onCodeInsert, editorRef, showInteractiveQuestion]);

  // Stop coaching session
  const stopCoaching = useCallback(() => {
    if (applyHighlight) {
      applyHighlight(null);
    }
    if (startTimeRef.current) {
      startTimeRef.current = null;
    }
    
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
    getElapsedTime,
  };
};
