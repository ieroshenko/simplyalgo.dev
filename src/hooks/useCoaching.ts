import { useState, useCallback, useRef } from "react";
import { CoachingState, CoachStep, CoachHighlightArea, InteractiveCoachSession } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCodeContext, findOptimalInsertionPoint, insertCodeSnippet } from "@/utils/codeInsertion";

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

interface SimplePosition {
  lineNumber: number;
  indentationLevel: number;
}

export const useCoaching = ({ problemId, userId, problemDescription, editorRef, onCodeInsert }: UseCoachingProps) => {
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
  
  // Calculate smart position based on code structure (like our snippet insertion)
  const calculateSmartPosition = useCallback((highlightArea: CoachHighlightArea): SimplePosition => {
    if (!editorRef.current) {
      return { lineNumber: 1, indentationLevel: 0 };
    }

    try {
      const currentCode = editorRef.current.getValue();
      const context = analyzeCodeContext(currentCode);
      
      // Use our existing smart insertion logic to find the best position
      const insertionPoint = findOptimalInsertionPoint(
        currentCode,
        {
          id: "coaching-temp",
          code: "# coaching input",
          language: "python",
          isValidated: true,
          insertionType: "smart",
          insertionHint: {
            type: "statement",
            scope: "function",
            description: "Coaching input position"
          }
        },
        { line: highlightArea.startLine, column: highlightArea.startColumn || 1 }
      );

      console.log('🎯 [SMART POSITIONING] Calculated position:', {
        highlightArea,
        insertionPoint,
        context: { currentScope: context.currentScope, indentationLevel: context.indentationLevel }
      });

      return {
        lineNumber: Math.max(1, insertionPoint.line),
        indentationLevel: Math.max(0, context.indentationLevel)
      };
    } catch (error) {
      console.warn('🎯 [SMART POSITIONING] Analysis failed, using fallback:', error);
      return { 
        lineNumber: highlightArea.startLine || 1, 
        indentationLevel: 0 
      };
    }
  }, [editorRef]);

  // Calculate elapsed time
  const getElapsedTime = useCallback(() => {
    if (!startTimeRef.current) return "00:00";
    const elapsed = Date.now() - startTimeRef.current.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get screen position using Monaco API for precise positioning
  const getScreenPosition = useCallback((highlightArea: CoachHighlightArea) => {
    if (!editorRef.current) {
      return { x: 100, y: 100 };
    }

    try {
      const editor = editorRef.current as any;
      const position = {
        lineNumber: highlightArea.startLine,
        column: highlightArea.startColumn || 1
      };

      // Method 1: Use Monaco's native getScrolledVisiblePosition API (most reliable)
      if (editor.getScrolledVisiblePosition) {
        const scrolledPosition = editor.getScrolledVisiblePosition(position);
        if (scrolledPosition) {
          console.log('🎯 [MONACO API] Using native positioning:', scrolledPosition);
          
          // Clamp to viewport bounds with padding
          const clampedPosition = {
            x: Math.max(50, Math.min(window.innerWidth - 400, scrolledPosition.left + 20)),
            y: Math.max(30, Math.min(window.innerHeight - 300, scrolledPosition.top + 25))
          };
          
          console.log('🎯 [POSITIONING] Final position:', {
            original: scrolledPosition,
            clamped: clampedPosition,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          });
          
          return clampedPosition;
        }
      }

      // Method 2: DOM-based fallback with dynamic measurements
      const editorDom = editor.getDomNode?.();
      if (editorDom) {
        const editorRect = editorDom.getBoundingClientRect();
        const lineHeight = 20; // Monaco default
        const leftMargin = 60; // Line numbers + padding
        const indentWidth = 16; // Tab width
        
        const relativeX = leftMargin + ((highlightArea.startColumn || 1) - 1) * 8; // Approximate character width
        const relativeY = (highlightArea.startLine - 1) * lineHeight + 30;
        
        const screenX = editorRect.left + relativeX;
        const screenY = editorRect.top + relativeY;
        
        console.log('🎯 [DOM FALLBACK] Calculated position:', {
          editorRect,
          relative: { x: relativeX, y: relativeY },
          screen: { x: screenX, y: screenY }
        });
        
        return {
          x: Math.max(50, Math.min(window.innerWidth - 400, screenX)),
          y: Math.max(30, Math.min(window.innerHeight - 300, screenY))
        };
      }

      // Method 3: Smart positioning using code analysis
      const smartPosition = calculateSmartPosition(highlightArea);
      const estimatedX = 100 + (smartPosition.indentationLevel * 16);
      const estimatedY = 150 + (smartPosition.lineNumber * 20);
      
      console.log('🎯 [SMART FALLBACK] Using code-based positioning:', {
        smartPosition,
        estimated: { x: estimatedX, y: estimatedY }
      });
      
      return {
        x: Math.max(50, Math.min(window.innerWidth - 400, estimatedX)),
        y: Math.max(30, Math.min(window.innerHeight - 300, estimatedY))
      };
    } catch (error) {
      console.warn('🎯 [POSITIONING] All methods failed, using default:', error);
      return { x: 100, y: 150 };
    }
  }, [editorRef, calculateSmartPosition]);

  // Apply highlighting to Monaco editor with smart line detection
  const applyHighlight = useCallback((highlightArea: CoachHighlightArea | null) => {
    if (!editorRef.current) return;

    const editor = editorRef.current as any;
    const monaco = (window as any).monaco;
    
    // Clear existing highlights
    if (highlightDecorationsRef.current.length > 0) {
      highlightDecorationsRef.current = editor.deltaDecorations(
        highlightDecorationsRef.current,
        []
      );
    }

    // Apply new highlight if provided
    if (highlightArea && monaco) {
      const model = editor.getModel();
      if (!model) {
        console.warn('🎯 [HIGHLIGHT] No Monaco model available');
        return;
      }

      const totalLines = model.getLineCount();
      const currentCode = model.getValue();
      
      // Smart line detection: use our code analysis to find the actual insertion point
      let targetLine = highlightArea.startLine;
      
      try {
        // Find the last line with actual code content
        const lines = currentCode.split('\n');
        let lastLineWithContent = 1;
        
        // Scan from bottom up to find the last line with non-whitespace content
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim().length > 0) {
            lastLineWithContent = i + 1; // Convert to 1-based line numbering
            break;
          }
        }
        
        // Target line should be the line after the last line with content
        targetLine = Math.min(totalLines, lastLineWithContent + 1);
        
        console.log(`🎯 [SMART HIGHLIGHT] Found last line with content: ${lastLineWithContent}, targeting line: ${targetLine}`);
        console.log(`🎯 [SMART HIGHLIGHT] Last line content: "${lines[lastLineWithContent - 1] || ''}"`);
        
      } catch (error) {
        console.warn('🎯 [SMART HIGHLIGHT] Analysis failed, using line after AI suggestion:', error);
        // Fallback: try to use line after AI suggestion
        targetLine = Math.min(totalLines, highlightArea.startLine + 1);
      }
      
      // Final validation of target line
      if (targetLine < 1 || targetLine > totalLines) {
        console.warn(`🎯 [HIGHLIGHT] Invalid target line: ${targetLine} (total lines: ${totalLines}), using line 1`);
        targetLine = Math.min(totalLines, Math.max(1, highlightArea.startLine));
      }

      // Get line content for validation
      const lineContent = model.getLineContent(targetLine);

      // Create a precise range for the target line only
      const range = new monaco.Range(
        targetLine,
        1, // Start at beginning of line
        targetLine,
        Math.max(1, model.getLineLastNonWhitespaceColumn(targetLine)) // End at last character or column 1 if empty
      );

      highlightDecorationsRef.current = editor.deltaDecorations(
        [],
        [
          {
            range,
            options: {
              className: "coach-highlight-area",
              isWholeLine: true, // Always highlight the whole line
              minimap: { 
                color: "#3b82f6", 
                position: 2 // Show in minimap 
              },
              overviewRuler: {
                color: "#3b82f6",
                darkColor: "#60a5fa", 
                position: 2
              }
            },
          },
        ]
      );

      // Scroll to highlighted line if it's not visible
      setTimeout(() => {
        editor.revealLineInCenter(targetLine);
      }, 100);
    }
  }, [editorRef]);

  // Add highlight (alias for applyHighlight for compatibility)
  const addHighlight = useCallback((highlightArea: CoachHighlightArea) => {
    applyHighlight(highlightArea);
  }, [applyHighlight]);

  // Start coaching session
  const startCoaching = useCallback(async (difficulty: "beginner" | "intermediate" | "advanced" = "beginner") => {
    try {
      console.log("🎯 Starting coaching session...", { problemId, userId, difficulty });
      setCoachingState(prev => ({ ...prev, isWaitingForResponse: true }));
      
      // Call AI to generate coaching steps
      const currentCode = editorRef.current?.getValue() || "";
      console.log("📝 Current code:", currentCode.slice(0, 100) + "...");
      
      const requestBody = {
        action: "start_interactive_coaching",
        problemId,
        userId,
        currentCode,
        difficulty,
        problemDescription: problemDescription || `Problem ID: ${problemId}`,
      };
      console.log("📤 Sending request:", requestBody);
      
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: requestBody,
      });
      
      console.log("📥 Response received:", { data, error });

      if (error) {
        console.error("🚨 [COACHING] Supabase function error:", error);
        console.error("🚨 [COACHING] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Check if the error contains AI service unavailable message
        const errorMessage = error.message || '';
        const errorDetails = error.details || '';
        const isAIServiceError = errorMessage.includes('AI_SERVICE_UNAVAILABLE') || 
                                 errorDetails.includes('AI_SERVICE_UNAVAILABLE') ||
                                 errorMessage.includes('AI coaching service') ||
                                 errorDetails.includes('temporarily unavailable');
        
        if (isAIServiceError) {
          throw new Error('AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We\'re working on a fix.');
        }
        
        throw error;
      }
      
      console.log("✅ [COACHING] Function response data:", data);

      // Validate response data for interactive coaching
      if (!data || !data.sessionId || !data.question) {
        console.error("🚨 [COACHING] Invalid response data:", data);
        throw new Error("Invalid coaching session data received from server");
      }

      const session: InteractiveCoachSession = {
        id: data.sessionId,
        problemId,
        userId,
        isActive: true,
        currentStepNumber: 1,
        currentQuestion: data.question,
        awaitingSubmission: true,
        isCompleted: false,
        startedAt: new Date(),
        difficulty: data.difficulty || difficulty,
        responses: [],
      };

      startTimeRef.current = new Date();

      setCoachingState(prev => ({
        ...prev,
        session,
        isCoachModeActive: true,
        isWaitingForResponse: false,
      }));

      // Show the first question with highlighting
      showInteractiveQuestion({
        question: data.question,
        hint: data.hint,
        highlightArea: data.highlightArea,
      });
    } catch (error) {
      console.error("Error starting coaching session:", error);
      
      // Check if this is an AI service error
      const isAIServiceError = error instanceof Error && 
        (error.message.includes('AI_SERVICE_UNAVAILABLE') ||
         error.message.includes('AI coaching service') ||
         error.message.includes('temporarily unavailable'));
      
      if (isAIServiceError) {
        console.log("🤖 [COACHING] AI service unavailable, stopping coaching session");
        
        // Stop coaching session and show user-friendly message
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
            show: true,
            type: "error",
            message: "🤖 AI Coach is temporarily unavailable. Please try again in a few moments.",
            showConfetti: false,
          },
        });
        
        // Auto-hide error message after 5 seconds
        setTimeout(() => {
          setCoachingState(prev => ({
            ...prev,
            feedback: { ...prev.feedback, show: false }
          }));
        }, 5000);
      } else {
        // Generic error handling
        setCoachingState(prev => ({ 
          ...prev, 
          isWaitingForResponse: false,
          feedback: {
            show: true,
            type: "error",
            message: "Failed to start coaching session. Please try again.",
            showConfetti: false,
          }
        }));
      }
    }
  }, [problemId, userId, editorRef]);

  // Show interactive coaching question
  const showInteractiveQuestion = useCallback((questionData: {
    question: string;
    hint?: string;
    highlightArea?: CoachHighlightArea;
  }) => {
    console.log("🎯 [COACHING STEP] Showing interactive question:", questionData);
    
    const highlightArea = questionData.highlightArea;
    
    if (highlightArea) {
      // Calculate smart position for overlay
      const smartPosition = calculateSmartPosition(highlightArea);
      
      try {
        const screenPosition = getScreenPosition(highlightArea);
        // Position calculated successfully
        
        setCoachingState(prev => ({
          ...prev,
          showInputOverlay: true,
          inputPosition: screenPosition,
          currentHighlight: highlightArea,
        }));
        
        // Highlight code in editor
        if (editorRef.current && highlightArea) {
          addHighlight(highlightArea);
        }
      } catch (error) {
        console.error("🚨 [COACHING] Error showing question:", error);
        // Show overlay at default position if positioning fails
        setCoachingState(prev => ({
          ...prev,
          showInputOverlay: true,
          inputPosition: { x: 100, y: 150 },
          currentHighlight: highlightArea,
        }));
      }
    } else {
      // No highlighting needed, show overlay at default position
      setCoachingState(prev => ({
        ...prev,
        showInputOverlay: true,
        inputPosition: { x: 100, y: 150 },
        currentHighlight: null,
      }));
    }
  }, [editorRef, calculateSmartPosition, getScreenPosition, addHighlight]);

  // Show a specific step (legacy - for backward compatibility)
  const showStep = useCallback((step: CoachStep) => {
    const highlightArea = step.highlightArea;
    
    console.log('🎯 [COACHING STEP] Showing step:', {
      stepId: step.id,
      question: step.question.slice(0, 50) + '...',
      highlightArea
    });
    
    setCoachingState(prev => ({
      ...prev,
      currentHighlight: highlightArea || null,
    }));

    if (highlightArea) {
      applyHighlight(highlightArea);
      
      // Use our Monaco API positioning system
      const screenPosition = getScreenPosition(highlightArea);
      
      // Legacy positioning with smart calculation
      
      setCoachingState(prev => ({
        ...prev,
        showInputOverlay: true,
        inputPosition: screenPosition,
      }));
    }
  }, [applyHighlight, getScreenPosition]);


  // Submit and validate student's code in interactive coaching
  const submitCoachingCode = useCallback(async (studentCode: string, studentResponse?: string) => {
    if (!coachingState.session) return;
    
    console.log("🎯 [COACHING] Submitting code for validation:", { studentCode: studentCode.slice(0, 100) + "..." });
    
    setCoachingState(prev => ({
      ...prev,
      isValidating: true,
      showInputOverlay: false,
    }));
    
    try {
      const currentEditorCode = editorRef.current?.getValue() || "";
      
      const requestBody = {
        action: "validate_coaching_submission",
        sessionId: coachingState.session.id,
        studentCode,
        studentResponse: studentResponse || "",
        currentEditorCode,
      };
      
      console.log("📤 Sending validation request:", requestBody);
      
      const { data: validation, error } = await supabase.functions.invoke("ai-chat", {
        body: requestBody,
      });
      
      if (error) {
        console.error("🚨 [COACHING] Validation error:", error);
        
        // Check if the error contains AI service unavailable message
        const errorMessage = error.message || '';
        const errorDetails = error.details || '';
        const isAIServiceError = errorMessage.includes('AI_SERVICE_UNAVAILABLE') || 
                                 errorDetails.includes('AI_SERVICE_UNAVAILABLE') ||
                                 errorMessage.includes('AI coaching service') ||
                                 errorDetails.includes('temporarily unavailable');
        
        if (isAIServiceError) {
          throw new Error('AI_SERVICE_UNAVAILABLE: The AI coaching service is temporarily unavailable. We\'re working on a fix.');
        }
        
        throw new Error("Failed to validate submission");
      }
      
      console.log("📥 Validation response:", validation);
      
      // Handle validation result
      const isCorrect = validation.isCorrect;
      const feedback = validation.feedback;
      const nextAction = validation.nextAction;
      
      // Show feedback
      const feedbackType = isCorrect ? "success" : 
                         nextAction === "hint" ? "hint" : "error";
      
      setCoachingState(prev => ({
        ...prev,
        isValidating: false,
        lastValidation: validation,
        feedback: {
          show: true,
          type: feedbackType,
          message: feedback,
          showConfetti: isCorrect,
        },
      }));
      
      if (isCorrect && nextAction === "insert_and_continue") {
        // Auto-insert the code using the existing snippet insertion system
        console.log("🎯 [COACHING] Code validation successful - inserting code");
        
        // Use the provided onCodeInsert callback or insert directly
        if (onCodeInsert) {
          setTimeout(async () => {
            try {
              await onCodeInsert(studentCode);
              console.log("✅ [COACHING] Code inserted successfully via callback");
              
              // Show next question if provided
              if (validation.nextStep) {
                setTimeout(() => {
                  showInteractiveQuestion({
                    question: validation.nextStep.question,
                    hint: validation.nextStep.hint,
                    highlightArea: validation.nextStep.highlightArea,
                  });
                }, 1000); // Allow time for insertion animation
              }
            } catch (insertError) {
              console.error("🚨 [COACHING] Error inserting code:", insertError);
            }
          }, 1500); // Allow time for success feedback
        } else if (editorRef.current) {
          // Fallback: insert directly into editor
          setTimeout(() => {
            try {
              const currentCode = editorRef.current!.getValue();
              const snippet = {
                id: `coaching-${Date.now()}`,
                code: studentCode,
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
              editorRef.current!.setValue(result.newCode);
              console.log("✅ [COACHING] Code inserted directly into editor");
              
              // Show next question if provided
              if (validation.nextStep) {
                setTimeout(() => {
                  showInteractiveQuestion({
                    question: validation.nextStep.question,
                    hint: validation.nextStep.hint,
                    highlightArea: validation.nextStep.highlightArea,
                  });
                }, 1000);
              }
            } catch (insertError) {
              console.error("🚨 [COACHING] Error inserting code directly:", insertError);
            }
          }, 1500);
        }
      } else if (nextAction === "complete_session") {
        // Session completed!
        console.log("🎉 [COACHING] Session completed!");
        
        setTimeout(() => {
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
        }, 2000);
      } else if (nextAction === "retry" || nextAction === "hint") {
        // Show input overlay again for retry
        setTimeout(() => {
          setCoachingState(prev => ({
            ...prev,
            feedback: { ...prev.feedback, show: false },
            showInputOverlay: true,
            inputPosition: prev.inputPosition, // Reuse previous position
          }));
        }, 3000);
      }
      
    } catch (error) {
      console.error("🚨 [COACHING] Error submitting code:", error);
      
      // Check if this is an AI service error
      const isAIServiceError = error instanceof Error && 
        (error.message.includes('AI_SERVICE_UNAVAILABLE') ||
         error.message.includes('AI coaching service') ||
         error.message.includes('temporarily unavailable'));
      
      if (isAIServiceError) {
        console.log("🤖 [COACHING] AI service unavailable during validation, stopping session");
        
        // Stop coaching session completely
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
            show: true,
            type: "error",
            message: "🤖 AI Coach is temporarily unavailable. Your coaching session has been paused.",
            showConfetti: false,
          },
        });
        
        // Auto-hide error message after 5 seconds
        setTimeout(() => {
          setCoachingState(prev => ({
            ...prev,
            feedback: { ...prev.feedback, show: false }
          }));
        }, 5000);
      } else {
        // Generic error handling
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
        
        // Re-show input overlay after error
        setTimeout(() => {
          setCoachingState(prev => ({
            ...prev,
            feedback: { ...prev.feedback, show: false },
            showInputOverlay: true,
            inputPosition: prev.inputPosition,
          }));
        }, 3000);
      }
    }
  }, [coachingState.session, editorRef, onCodeInsert, showInteractiveQuestion]);

  // Stop coaching session
  const stopCoaching = useCallback(() => {
    applyHighlight(null);
    startTimeRef.current = null;
    
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

  // Legacy submit response function - simplified for compatibility
  const submitResponse = useCallback(async (response: string) => {
    console.log("🎯 [LEGACY] submitResponse called - redirecting to submitCoachingCode");
    await submitCoachingCode(response, response);
  }, [submitCoachingCode]);

  // Skip current step (simplified for new interactive flow)
  const skipStep = useCallback(() => {
    console.log("🎯 [SKIP] Skip step called - ending coaching session");
    stopCoaching();
  }, [stopCoaching]);

  return {
    coachingState,
    startCoaching,
    stopCoaching,
    submitResponse,
    submitCoachingCode, // New interactive coaching submission
    cancelInput,
    closeFeedback,
    skipStep,
    getElapsedTime,
  };
};