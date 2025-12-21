/**
 * Coaching hooks and utilities
 */

// Types
export type {
    UseCoachingProps,
    CoachingState,
    ContextState,
    ValidationResult,
    FeedbackState,
    OptimizationStep,
    ScreenPosition,
    InteractiveQuestionParams,
} from './types';
export { createInitialCoachingState, INITIAL_CONTEXT_STATE } from './types';

// Utilities
export {
    normalizeCode,
    codeContainsSnippet,
    stripCodeFences,
    isLargeInsertion,
    getFallbackPosition,
    clamp,
    createCodeSnippet,
} from './coachingUtils';

// Hooks
export { useCoachingEditor } from './useCoachingEditor';
export { useCoachingPosition } from './useCoachingPosition';
export { useCoachingState } from './useCoachingState';
