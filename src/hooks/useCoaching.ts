import { useState, useCallback, useRef } from "react";
import { CoachingState, CoachSession, CoachStep, CoachHighlightArea } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCodeContext, findOptimalInsertionPoint, insertCodeSnippet } from "@/utils/codeInsertion";

interface UseCoachingProps {
  problemId: string;
  userId: string;
  problemDescription?: string;
  editorRef: React.RefObject<{
    getValue: () => string;
    deltaDecorations: (oldDecorations: string[], newDecorations: unknown[]) => string[];
    getScrollTop: () => number;
    getVisibleRanges: () => unknown[];
    getPosition: () => { lineNumber: number; column: number } | null;
  } | null>;
}

interface SimplePosition {
  lineNumber: number;
  indentationLevel: number;
}

export const useCoaching = ({ problemId, userId, problemDescription, editorRef }: UseCoachingProps) => {
  const [coachingState, setCoachingState] = useState<CoachingState>({
    session: null,
    isCoachModeActive: false,
    currentHighlight: null,
    showInputOverlay: false,
    inputPosition: null,
    isWaitingForResponse: false,
    isValidating: false,
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

  // Convert line position to screen coordinates relative to Monaco editor
  const convertToScreenPosition = useCallback((position: SimplePosition) => {
    if (!editorRef.current) {
      return { x: 100, y: 100 };
    }

    try {
      // Get Monaco editor's DOM element and its position on screen
      const monacoEditor = editorRef.current as any;
      const editorDom = monacoEditor.getDomNode?.();
      
      if (!editorDom) {
        console.warn('🎯 [POSITIONING] Monaco DOM not available, using fallback');
        return { x: 100, y: 100 };
      }

      const editorRect = editorDom.getBoundingClientRect();
      
      // Monaco editor measurements
      const lineHeight = 20; // Standard Monaco line height
      const leftMargin = 60; // Space for line numbers + some padding
      const indentWidth = 16; // Indentation width per level
      
      // Calculate position relative to Monaco editor's top-left corner
      const relativeX = leftMargin + (position.indentationLevel * indentWidth);
      const relativeY = (position.lineNumber - 1) * lineHeight + 30; // Small offset below the line
      
      // Convert to absolute screen coordinates
      const absoluteX = editorRect.left + relativeX;
      const absoluteY = editorRect.top + relativeY;
      
      console.log('🎯 [SCREEN POSITIONING] Calculated coordinates:', {
        editorRect: { left: editorRect.left, top: editorRect.top, width: editorRect.width, height: editorRect.height },
        linePosition: position,
        relative: { x: relativeX, y: relativeY },
        absolute: { x: absoluteX, y: absoluteY }
      });
      
      return {
        x: absoluteX,
        y: absoluteY
      };
    } catch (error) {
      console.warn('🎯 [POSITIONING] Error calculating screen position:', error);
      return { x: 100, y: 100 };
    }
  }, [editorRef]);

  // Apply highlighting to Monaco editor
  const applyHighlight = useCallback((highlightArea: CoachHighlightArea | null) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    
    // Clear existing highlights
    if (highlightDecorationsRef.current.length > 0) {
      highlightDecorationsRef.current = editor.deltaDecorations(
        highlightDecorationsRef.current,
        []
      );
    }

    // Apply new highlight if provided
    if (highlightArea) {
      const monaco = (window as any).monaco;
      if (monaco) {
        const range = new monaco.Range(
          highlightArea.startLine,
          highlightArea.startColumn || 1,
          highlightArea.endLine,
          highlightArea.endColumn || 1000
        );

        highlightDecorationsRef.current = editor.deltaDecorations(
          [],
          [
            {
              range,
              options: {
                className: "coach-highlight-area",
                isWholeLine: !highlightArea.startColumn,
              },
            },
          ]
        );
      }
    }
  }, [editorRef]);

  // Start coaching session
  const startCoaching = useCallback(async (difficulty: "beginner" | "intermediate" | "advanced" = "beginner") => {
    try {
      console.log("🎯 Starting coaching session...", { problemId, userId, difficulty });
      setCoachingState(prev => ({ ...prev, isWaitingForResponse: true }));
      
      // Call AI to generate coaching steps
      const currentCode = editorRef.current?.getValue() || "";
      console.log("📝 Current code:", currentCode.slice(0, 100) + "...");
      
      const requestBody = {
        action: "generate_coaching_session",
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
        throw error;
      }
      
      console.log("✅ [COACHING] Function response data:", data);

      // Validate response data
      if (!data || !data.sessionId || !Array.isArray(data.steps)) {
        console.error("🚨 [COACHING] Invalid response data:", data);
        throw new Error("Invalid coaching session data received from server");
      }

      if (data.steps.length === 0) {
        console.error("🚨 [COACHING] No coaching steps received");
        throw new Error("No coaching steps were generated. Please try again.");
      }

      const session: CoachSession = {
        id: data.sessionId,
        problemId,
        userId,
        isActive: true,
        currentStep: 0,
        steps: data.steps,
        startedAt: new Date(),
        totalSteps: data.steps.length,
        progressPercent: 0,
        difficulty,
      };

      startTimeRef.current = new Date();

      setCoachingState(prev => ({
        ...prev,
        session,
        isCoachModeActive: true,
        isWaitingForResponse: false,
      }));

      // Start with first step
      if (session.steps.length > 0) {
        showStep(session.steps[0]);
      }
    } catch (error) {
      console.error("Error starting coaching session:", error);
      setCoachingState(prev => ({ ...prev, isWaitingForResponse: false }));
    }
  }, [problemId, userId, editorRef]);

  // Show a specific step
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
      
      // Use our smart positioning system
      const smartPosition = calculateSmartPosition(highlightArea);
      const screenPosition = convertToScreenPosition(smartPosition);
      
      console.log('🎯 [POSITIONING DEBUG] Calculated positions:', {
        originalHighlight: highlightArea,
        smartPosition,
        finalScreenPosition: screenPosition
      });
      
      setCoachingState(prev => ({
        ...prev,
        showInputOverlay: true,
        inputPosition: screenPosition,
      }));
    }
  }, [applyHighlight, calculateSmartPosition, convertToScreenPosition]);

  // Submit user response for current step
  const submitResponse = useCallback(async (response: string) => {
    if (!coachingState.session) return;

    try {
      setCoachingState(prev => ({ ...prev, isValidating: true }));

      const currentStep = coachingState.session.steps[coachingState.session.currentStep];
      
      // Call AI to validate response
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          action: "validate_coaching_response",
          sessionId: coachingState.session.id,
          stepId: currentStep.id,
          userResponse: response,
          currentCode: editorRef.current?.getValue() || "",
        },
      });

      if (error) throw error;

      const { 
        isCorrect, 
        feedback, 
        nextStep, 
        codeSnippet, 
        responseType, 
        celebrationType,
        additionalHint 
      } = data;

      console.log('🎯 [VALIDATION RESULT]', {
        isCorrect,
        responseType,
        celebrationType,
        hasCodeSnippet: !!codeSnippet,
        feedback
      });

      // Handle code insertion for correct answers
      if (isCorrect && codeSnippet && codeSnippet.code && editorRef.current) {
        try {
          const currentCode = editorRef.current.getValue();
          const snippet = {
            id: `coaching-${Date.now()}`,
            code: codeSnippet.code,
            language: "python",
            isValidated: true,
            insertionType: (codeSnippet.insertionType === "smart" ? "smart" : "append") as "smart" | "cursor" | "append" | "prepend" | "replace",
            insertionHint: {
              type: "statement" as const,
              scope: "function" as const,
              description: codeSnippet.explanation || "Coaching generated code"
            }
          };

          const result = insertCodeSnippet(currentCode, snippet);
          editorRef.current.setValue(result.newCode);
          
          console.log('✅ [CODE INSERTION] Successfully added code:', {
            codeLength: codeSnippet.code.length,
            insertionType: snippet.insertionType
          });
        } catch (codeError) {
          console.error('🚨 [CODE INSERTION] Failed to insert code:', codeError);
        }
      }

      // Update current step with response and feedback
      const updatedSteps = [...coachingState.session.steps];
      updatedSteps[coachingState.session.currentStep] = {
        ...currentStep,
        userResponse: response,
        isCompleted: isCorrect,
        feedback,
      };

      // Show feedback based on response type
      const feedbackType = isCorrect ? "success" : responseType === "unsure" ? "hint" : "error";
      const showConfetti = isCorrect && celebrationType === "confetti";
      
      setCoachingState(prev => ({
        ...prev,
        isValidating: false,
        showInputOverlay: false,
        inputPosition: null,
        feedback: {
          show: true,
          type: feedbackType,
          message: feedback,
          showConfetti,
        },
      }));

      if (isCorrect && nextStep) {
        // Move to next step after showing success feedback
        setTimeout(() => {
          const newCurrentStep = coachingState.session.currentStep + 1;
          const progressPercent = (newCurrentStep / coachingState.session.totalSteps) * 100;

          const updatedSession: CoachSession = {
            ...coachingState.session,
            steps: updatedSteps,
            currentStep: newCurrentStep,
            progressPercent,
            ...(newCurrentStep >= coachingState.session.totalSteps && {
              isActive: false,
              completedAt: new Date(),
            }),
          };

          setCoachingState(prev => ({
            ...prev,
            session: updatedSession,
            feedback: { ...prev.feedback, show: false },
          }));

          // Clear current highlight
          applyHighlight(null);

          // Show next step if available
          if (newCurrentStep < updatedSession.totalSteps) {
            setTimeout(() => showStep(updatedSession.steps[newCurrentStep]), 500);
          } else {
            // Session completed
            setCoachingState(prev => ({
              ...prev,
              isCoachModeActive: false,
              currentHighlight: null,
              feedback: {
                show: true,
                type: "success",
                message: "🎉 Coaching session completed! Great job!",
                showConfetti: true,
              },
            }));
          }
        }, 2000); // Wait 2 seconds to show feedback
      } else {
        // Response needs improvement, show feedback and allow retry
        setCoachingState(prev => ({
          ...prev,
          session: { ...prev.session!, steps: updatedSteps },
        }));

        // Re-show input overlay after feedback is dismissed
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
      console.error("Error validating response:", error);
      setCoachingState(prev => ({ ...prev, isValidating: false }));
    }
  }, [coachingState.session, editorRef, applyHighlight, showStep]);

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

  // Skip current step
  const skipStep = useCallback(() => {
    if (!coachingState.session) return;

    const newCurrentStep = coachingState.session.currentStep + 1;
    const progressPercent = (newCurrentStep / coachingState.session.totalSteps) * 100;

    const updatedSession: CoachSession = {
      ...coachingState.session,
      currentStep: newCurrentStep,
      progressPercent,
      ...(newCurrentStep >= coachingState.session.totalSteps && {
        isActive: false,
        completedAt: new Date(),
      }),
    };

    setCoachingState(prev => ({
      ...prev,
      session: updatedSession,
      showInputOverlay: false,
      inputPosition: null,
    }));

    applyHighlight(null);

    if (newCurrentStep < updatedSession.totalSteps) {
      setTimeout(() => showStep(updatedSession.steps[newCurrentStep]), 500);
    } else {
      stopCoaching();
    }
  }, [coachingState.session, applyHighlight, showStep, stopCoaching]);

  return {
    coachingState,
    startCoaching,
    stopCoaching,
    submitResponse,
    cancelInput,
    closeFeedback,
    skipStep,
    getElapsedTime,
  };
};