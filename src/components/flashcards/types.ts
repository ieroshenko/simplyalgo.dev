import type { FlashcardDeck } from "@/types/api";

// ============================================================================
// Props Interfaces
// ============================================================================

export interface FlashcardReviewInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

// ============================================================================
// Internal Types
// ============================================================================

export interface ReviewSession {
    deckId: string;
    problemTitle: string;
    solutionTitle: string;
    startTime: Date;
    currentQuestionIndex: number;
    totalQuestions: number;
    cardData: FlashcardDeck;
}

export interface ProblemData {
    id: string;
    title: string;
    description: string;
    examples?: Array<{
        input: string;
        output: string;
        explanation?: string;
    }>;
    function_signature?: string;
}

export interface ReviewQuestion {
    id: number;
    question: string;
    description: string;
}

export interface DifficultyOption {
    value: number;
    label: string;
    color: string;
    description: string;
}

// ============================================================================
// Constants
// ============================================================================

export const REVIEW_QUESTIONS: ReviewQuestion[] = [
    {
        id: 1,
        question: "What is the main trick and technique to solve this problem?",
        description: "Think about the core algorithmic approach or pattern"
    },
    {
        id: 2,
        question: "What data structures did you use?",
        description: "Arrays, hash maps, trees, etc."
    },
    {
        id: 3,
        question: "What are the time and space complexities?",
        description: "You can check the solution to remember"
    }
];

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
    { value: 1, label: "Again", color: "bg-red-500", description: "I didn't remember this well" },
    { value: 2, label: "Hard", color: "bg-orange-500", description: "I remembered with difficulty" },
    { value: 3, label: "Good", color: "bg-green-500", description: "I remembered well" },
    { value: 4, label: "Easy", color: "bg-blue-500", description: "I remembered perfectly" },
];
