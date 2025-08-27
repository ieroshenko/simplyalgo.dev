import { useState, useCallback, useRef } from "react";
import { CoachingState, CoachStep, CoachHighlightArea, InteractiveCoachSession } from "@/types";
import { supabase } from "@/integrations/supabase/client";

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

  // Calculate position for overlay: always place below the last line in editor
  const getPositionBelowLastLine = useCallback(() => {
    try {
      if (!editorRef.current) return { x: 100, y: Math.min(window.innerHeight - 220, 180) };

      const code = editorRef.current.getValue();
      const totalLines = Math.max(1, (code || "").split('\n').length);
      const pos = { lineNumber: totalLines, column: 1 };
      const editorNode = editorRef.current.getDomNode?.();
      const editorRect = editorNode?.getBoundingClientRect();
      const linePos = editorRef.current.getScrolledVisiblePosition?.(pos);

      if (linePos && editorRect) {
        // Absolute coordinates for last line
        const absLeft = editorRect.left + (linePos.left || 0);
        const absTop = editorRect.top + (linePos.top || 0);
        const absBelowY = absTop + (linePos.height || 20) + 16;
        const editorMidY = editorRect.top + editorRect.height / 2;

        // If last line is past the center of editor, center the overlay
        if (absTop > editorMidY) {
          const centerX = editorRect.left + editorRect.width / 2 - 200; // assume ~400px overlay width
          const centerY = editorRect.top + editorRect.height / 2 - 130; // assume ~260px overlay height
          return {
            x: Math.max(24, Math.min(window.innerWidth - 420, centerX)),
            y: Math.max(30, Math.min(window.innerHeight - 260, centerY)),
          };
        }

        // Otherwise place just below the last line
        return {
          x: Math.max(24, Math.min(window.innerWidth - 420, absLeft + 8)),
          y: Math.max(30, Math.min(window.innerHeight - 260, absBelowY)),
        };
      }

      // Fallback: estimate based on line count
      const estimatedY = Math.min(window.innerHeight - 260, 120 + totalLines * 20);
      return { x: 24, y: Math.max(30, estimatedY) };
    } catch (error) {
      console.warn('Error calculating position for last line:', error);
      return { x: 100, y: Math.min(window.innerHeight - 220, 180) };
    }
  }, [editorRef]);

  // Show interactive question overlay
  const showInteractiveQuestion = useCallback(({ question, hint, highlightArea }: {
    question: string;
    hint?: string;
    highlightArea?: CoachHighlightArea;
  }) => {
    console.log("🎯 [SHOW QUESTION] Showing interactive question:", { question, hint, highlightArea });

    // Normalize highlight to next blank line within same function, if needed
    let finalHighlight = highlightArea || null;
    try {
      if (highlightArea && editorRef.current) {
        const code = editorRef.current.getValue();
        const lines = (code || '').split('\n');
        const start = Math.max(1, Math.min(lines.length, highlightArea.startLine));
        const startIdx = start - 1;
        // Find enclosing function def above
        let defIdx = -1; let defIndent = 0;
        for (let i = startIdx; i >= 0; i--) {
          const m = lines[i].match(/^(\s*)def\s+\w+\s*\(/);
          if (m) { defIdx = i; defIndent = m[1]?.length || 0; break; }
        }
        let candidate = startIdx;
        if (defIdx !== -1) {
          // Limit search to this function body
          let endIdx = lines.length - 1;
          for (let j = defIdx + 1; j < lines.length; j++) {
            const indent = (lines[j].match(/^\s*/)?.[0] || '').length;
            if (/^\s*def\s+\w+\s*\(/.test(lines[j]) && indent <= defIndent) { endIdx = j - 1; break; }
          }
          // If current line not blank, move to next blank within function
          if (lines[candidate].trim() !== '') {
            for (let k = candidate; k <= endIdx; k++) {
              if (lines[k].trim() === '') { candidate = k; break; }
            }
          }
        } else {
          // No function found: pick next blank anywhere
          if (lines[candidate].trim() !== '') {
            for (let k = candidate; k < lines.length; k++) {
              if (lines[k].trim() === '') { candidate = k; break; }
            }
          }
        }
        finalHighlight = { startLine: candidate + 1, endLine: candidate + 1 };
      }
    } catch (e) {
      // ignore normalization errors; use original
      finalHighlight = highlightArea || null;
    }

    // Apply highlight if provided
    if (finalHighlight) {
      applyHighlight(finalHighlight);
    }

    // Calculate position for the overlay: always below the last line to avoid covering code
    const screenPosition = getPositionBelowLastLine();

    setCoachingState(prev => ({
      ...prev,
      showInputOverlay: true,
      // Preserve previous overlay position if already set
      inputPosition: prev.inputPosition || screenPosition,
      currentHighlight: finalHighlight || null,
      session: prev.session ? {
        ...prev.session,
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
      
      // Check if code has significantly changed (for context optimization)
      const codeChanged = contextState.lastCodeSnapshot !== currentCode;
      
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'validate_coaching_submission',
          sessionId: coachingState.session.id,
          studentCode: userCode,
          studentResponse: userInput,
          currentEditorCode: currentCode,
          // Context tracking for token optimization
          previousResponseId: contextState.responseId,
          codeChanged,
          forceNewContext: codeChanged,
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

      setCoachingState(prev => ({
        ...prev,
        isValidating: false,
        isWaitingForResponse: false,
      }));

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

            // After insertion, just show success message - don't auto-generate next step
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
          if (data.nextStep?.question) {
            showInteractiveQuestion({
              question: data.nextStep.question,
              hint: data.nextStep.hint,
              highlightArea: data.nextStep.highlightArea,
            });
          } else {
            setCoachingState(prev => ({
              ...prev,
              session: prev.session ? { ...prev.session, isCompleted: true } : null,
              feedback: {
                show: true,
                type: "success",
                message: "🎉 Well done! This step is complete.",
                showConfetti: true,
              },
            }));
            setTimeout(stopCoaching, 1500);
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

    const codeToInsert = coachingState.lastValidation.codeToAdd;
    try {
      const editor = editorRef.current;
      const before = editor?.getValue() || "";

      if (!codeContainsSnippet(before, codeToInsert)) {
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
          insertionType: "smart" as const,
          insertionHint: {
            type: "statement",
            scope: "function",
            description: "AI coaching generated code"
          }
        };

        try {
          console.log("🔧 [COACHING] Sending smart insertion request:", {
            action: "insert_snippet",
            codeLength: before.length,
            snippet,
            cursorPosition,
            problemDescription: problemDescription || ""
          });
          
          const { data: insertResult, error: insertError } = await supabase.functions.invoke("ai-chat", {
            body: {
              action: "insert_snippet",
              code: before,
              snippet,
              cursorPosition,
              problemDescription: problemDescription || "",
              message: `[coaching snippet insertion] Fix these issues: ${coachingState.lastValidation?.feedback || 'Apply suggested code changes'}`,
              conversationHistory: [],
            },
          });
          
          console.log("📥 [COACHING] Smart insertion response:", { insertResult, insertError });

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
      setCoachingState(prev => ({ ...prev, isWaitingForResponse: true, isValidating: false }));
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
          isWaitingForResponse: false,
          showInputOverlay: true,
        }));
      }
    } catch (e) {
      console.error('❌ [OPTIMIZATION] Failed to start:', e);
      setCoachingState(prev => ({
        ...prev,
        feedback: { show: true, type: 'error', message: 'Failed to start optimization. Please try again.', showConfetti: false },
        isWaitingForResponse: false,
      }));
    }
  }, [editorRef, problemId, userId, problemDescription, showInteractiveQuestion]);

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
  };
};
