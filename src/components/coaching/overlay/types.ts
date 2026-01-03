import { OverlayPositionManager } from '../../../services/overlayPositionManager';

export type PositionPreset = 'auto' | 'center' | 'center-bottom' | 'left-top' | 'right-top' | 'right-bottom' | 'left-bottom' | 'custom';

export type OverlayState = 'initial' | 'validating' | 'correct' | 'incorrect' | 'completed';

export interface OverlayValidationResult {
    isCorrect: boolean;
    feedback: string;
    isOptimizable?: boolean;
    hasAlternative?: boolean;
    codeToAdd?: string;
    nextStep?: {
        question: string;
        hint: string;
    };
    optimizationAnalysis?: {
        optimizationType?: 'time' | 'space' | 'both' | 'alternative';
        currentComplexity?: { time: string; space: string };
        targetComplexity?: { time: string; space: string };
        reason?: string;
    };
}

export interface SimpleOverlayProps {
    isVisible: boolean;
    position: { x: number; y: number };
    onValidateCode: (explanation?: string) => void;
    onCancel: () => void;
    onExitCoach?: () => void;
    onFinishCoaching?: () => void;
    onInsertCorrectCode?: () => Promise<void> | void;
    onInsertCode?: (code: string) => void; // Legacy support
    onContinueToNextStep?: () => void; // Continue to next step without validating
    onStartOptimization?: (type: 'optimization' | 'alternative') => void;
    isValidating?: boolean;
    hasError?: boolean;
    isOptimizable?: boolean; // Offer optimization action when session is completed
    question?: string;
    hint?: string;
    stepInfo?: { current: number; total: number };
    isSessionCompleted?: boolean;
    validationResult?: OverlayValidationResult | null;
    highlightedLine?: number;
    editorHeight?: number;
    editorRef?: React.RefObject<{
        getDomNode?: () => HTMLElement | null;
        getScrollTop?: () => number;
        getPosition?: () => { lineNumber: number; column: number } | null;
    } | null>;
    positionManager?: OverlayPositionManager;
    problemId?: string;
    onPositionChange?: (pos: { x: number; y: number }) => void;
}
