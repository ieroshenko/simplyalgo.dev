// Shared types for ProblemPanel components
export interface Submission {
    id: string;
    code: string;
    status: string;
    language?: string;
    created_at: string;
    complexity_analysis?: ComplexityAnalysis;
}

export interface ComplexityAnalysis {
    time_complexity?: string;
    time_explanation?: string;
    space_complexity?: string;
    space_explanation?: string;
    analysis?: string;
}
