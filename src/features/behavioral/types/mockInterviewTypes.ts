// Types for Behavioral Mock Interview
export interface GeneratedQuestion {
    question_text: string;
    category: string[];
    difficulty: string;
    rationale: string;
}

export interface FeedbackData {
    star_score?: {
        situation: number;
        task: number;
        action: number;
        result: number;
    };
    content_score: number;
    delivery_score: number;
    overall_score: number;
    feedback: {
        strengths: string[];
        improvements: string[];
        specific_examples?: string[];
        next_steps?: string[];
    };
}

export interface InterviewState {
    step: 'resume' | 'details' | 'questions' | 'feedback';
    resumeText: string;
    role: string;
    company: string;
    questions: GeneratedQuestion[];
    currentQuestionIndex: number;
    answers: Record<number, string>;
    feedbacks: Record<number, FeedbackData>;
    mockInterviewId: string | null;
}

export interface MockInterviewStepProps {
    state: InterviewState;
    setState: React.Dispatch<React.SetStateAction<InterviewState>>;
    onNext?: () => void;
    onBack?: () => void;
    isLoading?: boolean;
}
