/**
 * Hook for managing coaching state
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { CoachHighlightArea } from "@/types";
import { logger } from "@/utils/logger";
import type {
    CoachingState,
    ContextState,
    InteractiveQuestionParams,
    ScreenPosition,
    FeedbackState,
    ValidationResult,
} from "./types";
import { createInitialCoachingState, INITIAL_CONTEXT_STATE } from "./types";
import type { OverlayPositionManager } from "@/services/overlayPositionManager";

export interface UseCoachingStateResult {
    coachingState: CoachingState;
    contextState: ContextState;
    startTimeRef: React.MutableRefObject<Date | null>;
    setCoachingState: React.Dispatch<React.SetStateAction<CoachingState>>;
    setContextState: React.Dispatch<React.SetStateAction<ContextState>>;
    /** Show the interactive question overlay */
    showInteractiveQuestion: (params: InteractiveQuestionParams, applyHighlight: (h: CoachHighlightArea | null) => void, getPositionBelowLastLine: () => ScreenPosition) => void;
    /** Reset all coaching state */
    resetCoachingState: (applyHighlight: (h: CoachHighlightArea | null) => void) => void;
    /** Cancel input overlay */
    cancelInput: () => void;
    /** Close feedback */
    closeFeedback: () => void;
    /** Get elapsed time since session start */
    getElapsedTime: () => number;
    /** Set validation loading state */
    setValidating: (isValidating: boolean) => void;
    /** Update last validation result */
    setLastValidation: (validation: ValidationResult | null | undefined) => void;
    /** Set feedback message */
    setFeedback: (feedback: FeedbackState) => void;
    /** Mark session as completed */
    markSessionCompleted: (isOptimizable?: boolean) => void;
}

/**
 * Hook to manage coaching state and provide state update helpers
 */
export const useCoachingState = (
    positionManager: OverlayPositionManager | undefined
): UseCoachingStateResult => {
    const [coachingState, setCoachingState] = useState<CoachingState>(() =>
        createInitialCoachingState(positionManager)
    );

    const [contextState, setContextState] = useState<ContextState>(INITIAL_CONTEXT_STATE);

    const startTimeRef = useRef<Date | null>(null);

    // Update position manager in coaching state when it changes
    useEffect(() => {
        setCoachingState(prev => ({
            ...prev,
            positionManager,
        }));
    }, [positionManager]);

    /**
     * Show the interactive question overlay
     */
    const showInteractiveQuestion = useCallback((
        { question, hint, highlightArea }: InteractiveQuestionParams,
        applyHighlight: (h: CoachHighlightArea | null) => void,
        getPositionBelowLastLine: () => ScreenPosition
    ) => {
        logger.debug("Showing interactive question", { component: "Coaching", question, hint, highlightArea });

        const finalHighlight = highlightArea || null;

        // Apply highlight if provided
        if (finalHighlight) {
            applyHighlight(finalHighlight);
        }

        // Calculate position for the overlay
        const screenPosition = getPositionBelowLastLine();

        setCoachingState(prev => ({
            ...prev,
            showInputOverlay: true,
            isWaitingForResponse: false,
            inputPosition: prev.inputPosition || screenPosition,
            currentHighlight: finalHighlight || null,
            session: prev.session ? {
                ...prev.session,
                isCompleted: false,
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

        logger.debug("Overlay now showing", { component: "Coaching", showInputOverlay: true, currentQuestion: question });
    }, []);

    /**
     * Reset all coaching state
     */
    const resetCoachingState = useCallback((applyHighlight: (h: CoachHighlightArea | null) => void) => {
        if (applyHighlight) {
            applyHighlight(null);
        }
        startTimeRef.current = null;

        setContextState(INITIAL_CONTEXT_STATE);
        setCoachingState(createInitialCoachingState(positionManager));
    }, [positionManager]);

    /**
     * Cancel input overlay
     */
    const cancelInput = useCallback(() => {
        setCoachingState(prev => ({
            ...prev,
            showInputOverlay: false,
            inputPosition: null,
        }));
    }, []);

    /**
     * Close feedback
     */
    const closeFeedback = useCallback(() => {
        setCoachingState(prev => ({
            ...prev,
            feedback: { ...prev.feedback, show: false },
        }));
    }, []);

    /**
     * Get elapsed time since session start
     */
    const getElapsedTime = useCallback(() => {
        if (!startTimeRef.current) return 0;
        return Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
    }, []);

    /**
     * Set validation loading state
     */
    const setValidating = useCallback((isValidating: boolean) => {
        setCoachingState(prev => ({
            ...prev,
            isValidating,
            isWaitingForResponse: isValidating,
        }));
    }, []);

    /**
     * Update last validation result
     */
    const setLastValidation = useCallback((validation: ValidationResult | null | undefined) => {
        setCoachingState(prev => ({
            ...prev,
            lastValidation: validation,
        }));
    }, []);

    /**
     * Set feedback message
     */
    const setFeedback = useCallback((feedback: FeedbackState) => {
        setCoachingState(prev => ({
            ...prev,
            feedback,
        }));
    }, []);

    /**
     * Mark session as completed
     */
    const markSessionCompleted = useCallback((isOptimizable?: boolean) => {
        setCoachingState(prev => ({
            ...prev,
            session: prev.session ? {
                ...prev.session,
                isCompleted: true,
                currentQuestion: "",
                currentHint: undefined,
            } : null,
            isOptimizable,
            lastValidation: null,
            currentHighlight: null,
        }));
    }, []);

    return {
        coachingState,
        contextState,
        startTimeRef,
        setCoachingState,
        setContextState,
        showInteractiveQuestion,
        resetCoachingState,
        cancelInput,
        closeFeedback,
        getElapsedTime,
        setValidating,
        setLastValidation,
        setFeedback,
        markSessionCompleted,
    };
};
