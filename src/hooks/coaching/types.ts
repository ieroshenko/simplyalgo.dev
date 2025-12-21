/**
 * Types for the coaching system
 */
import { CoachHighlightArea, InteractiveCoachSession } from "@/types";
import { OverlayPositionManager } from "@/services/overlayPositionManager";

/**
 * Props for the useCoachingNew hook
 */
export interface UseCoachingProps {
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
    confirmLargeInsert?: (options: { code: string; lineCount: number }) => Promise<boolean>;
}

/**
 * Validation result from the AI
 */
export interface ValidationResult {
    isCorrect: boolean;
    feedback: string;
    isOptimizable?: boolean;
    hasAlternative?: boolean;
    codeToAdd?: string;
    nextAction?: string;
    nextStep?: {
        question: string;
        hint?: string;
        highlightArea?: CoachHighlightArea;
    };
    optimizationAnalysis?: {
        optimizationType?: 'time' | 'space' | 'both' | 'alternative';
        currentComplexity?: { time: string; space: string };
        targetComplexity?: { time: string; space: string };
        reason?: string;
    };
}

/**
 * Feedback state for user notifications
 */
export interface FeedbackState {
    show: boolean;
    type: 'hint' | 'error' | 'success' | null;
    message: string;
    showConfetti: boolean;
}

/**
 * Optimization step data
 */
export interface OptimizationStep {
    question: string;
    hint?: string;
    sessionType?: 'optimization' | 'alternative';
    highlightArea?: CoachHighlightArea;
}

/**
 * Full coaching state
 */
export interface CoachingState {
    session: InteractiveCoachSession | null;
    isCoachModeActive: boolean;
    currentHighlight: CoachHighlightArea | null;
    showInputOverlay: boolean;
    inputPosition: { x: number; y: number } | null;
    isWaitingForResponse: boolean;
    isValidating: boolean;
    lastValidation: ValidationResult | null | undefined;
    feedback: FeedbackState;
    isOptimizable?: boolean;
    isOptimizationMode?: boolean;
    optimizationSessionType?: 'optimization' | 'alternative';
    lastOptimizationStep?: OptimizationStep;
    positionManager?: OverlayPositionManager;
}

/**
 * Context state for API response tracking
 */
export interface ContextState {
    responseId: string | null;
    contextInitialized: boolean;
    lastCodeSnapshot: string;
}

/**
 * Position for screen coordinates
 */
export interface ScreenPosition {
    x: number;
    y: number;
}

/**
 * Question display parameters
 */
export interface InteractiveQuestionParams {
    question: string;
    hint?: string;
    highlightArea?: CoachHighlightArea;
}

/**
 * Initial coaching state factory
 */
export const createInitialCoachingState = (positionManager?: OverlayPositionManager): CoachingState => ({
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

/**
 * Initial context state
 */
export const INITIAL_CONTEXT_STATE: ContextState = {
    responseId: null,
    contextInitialized: false,
    lastCodeSnapshot: '',
};
