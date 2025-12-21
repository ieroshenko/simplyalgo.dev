/**
 * Types for the Behavioral Practice feature
 */
import type { STARScore, CustomMetrics, AnswerFeedback, BehavioralQuestionCategory, QuestionDifficulty, EvaluationType } from "@/types";

/**
 * Feedback state from AI evaluation
 */
export interface BehavioralFeedbackState {
    star_score?: STARScore;
    content_score: number;
    delivery_score: number;
    overall_score: number;
    custom_metrics?: CustomMetrics;
    feedback: AnswerFeedback;
}

/**
 * Progress statistics
 */
export interface PracticeProgressState {
    totalPracticed: number;
    totalQuestions: number;
    averageScore: number;
}

/**
 * Edit question dialog state
 */
export interface EditDialogState {
    isOpen: boolean;
    questionText: string;
    selectedCategories: BehavioralQuestionCategory[];
    difficulty: QuestionDifficulty;
    evaluationType: EvaluationType;
    customPrompt: string;
}

/**
 * Initial edit dialog state
 */
export const INITIAL_EDIT_DIALOG_STATE: EditDialogState = {
    isOpen: false,
    questionText: "",
    selectedCategories: [],
    difficulty: "intermediate",
    evaluationType: "star",
    customPrompt: "",
};

/**
 * Initial progress state
 */
export const INITIAL_PROGRESS_STATE: PracticeProgressState = {
    totalPracticed: 0,
    totalQuestions: 0,
    averageScore: 0,
};

/**
 * Categories for behavioral questions
 */
export const BEHAVIORAL_CATEGORIES = [
    'general',
    'technical_leadership',
    'code_review_collaboration',
    'debugging_problem_solving',
    'system_design_architecture',
    'technical_failure_recovery',
    'technical_debt_prioritization',
    'technical_communication',
    'technical_initiative',
    'learning_new_technologies',
    'code_quality_best_practices',
    'scaling_performance',
] as const;

/**
 * Get word count from text
 */
export const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
};
