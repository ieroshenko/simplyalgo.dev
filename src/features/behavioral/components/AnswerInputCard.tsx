/**
 * Answer Input Card component for behavioral practice
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import type { BehavioralQuestion, PracticeAnswer, UserStory } from "@/types";

interface AnswerInputCardProps {
    selectedQuestion: BehavioralQuestion;
    answer: string;
    onAnswerChange: (answer: string) => void;
    lastAnswer: PracticeAnswer | null;
    isSubmitting: boolean;
    onSubmit: () => void;
    // Speech-to-text props
    hasNativeSupport: boolean;
    isListening: boolean;
    isProcessing: boolean;
    speechError?: string | null;
    onToggleMicrophone: () => void;
    // Experience reference props
    stories: UserStory[];
    onOpenExperienceDialog: () => void;
}

export const AnswerInputCard: React.FC<AnswerInputCardProps> = ({
    selectedQuestion,
    answer,
    onAnswerChange,
    lastAnswer,
    isSubmitting,
    onSubmit,
    hasNativeSupport,
    isListening,
    isProcessing,
    speechError,
    onToggleMicrophone,
    stories,
    onOpenExperienceDialog,
}) => {
    const evaluationType = selectedQuestion.evaluation_type || 'star';

    const getPlaceholder = () => {
        if (isListening) {
            return "🎤 Listening... Speak your answer.";
        }
        if (isProcessing) {
            return "🔄 Processing audio...";
        }
        if (evaluationType === 'star') {
            return "Type your answer here... Remember to use the STAR method:\n- Situation: Set the context\n- Task: What needed to be done\n- Action: What you specifically did\n- Result: The outcome and what you learned";
        }
        if (evaluationType === 'custom') {
            return "Type your answer here... Make sure to address all aspects mentioned in the custom evaluation criteria below.";
        }
        return "Type your answer here... Focus on providing a clear, detailed response with specific examples and outcomes.";
    };

    const getDescription = () => {
        if (evaluationType === 'star') {
            return "Structure your answer using the STAR method (Situation, Task, Action, Result)";
        }
        if (evaluationType === 'custom') {
            return "Provide a detailed answer that addresses the custom evaluation criteria";
        }
        return "Provide a clear and comprehensive answer to the question";
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Your Answer</CardTitle>
                        <CardDescription>
                            {getDescription()}
                            {lastAnswer && (
                                <span className="block mt-2 text-sm text-muted-foreground">
                                    Your previous answer is loaded below. You can edit it or start fresh.
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    {stories.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenExperienceDialog}
                        >
                            Reference Experience
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Textarea
                        placeholder={getPlaceholder()}
                        value={answer}
                        onChange={(e) => onAnswerChange(e.target.value)}
                        className={`min-h-[300px] ${hasNativeSupport ? "pr-10" : ""}`}
                    />
                    {hasNativeSupport && (
                        <button
                            type="button"
                            onClick={onToggleMicrophone}
                            disabled={isSubmitting}
                            className={`absolute right-2 top-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${isListening
                                    ? "text-red-500 animate-pulse"
                                    : isProcessing
                                        ? "text-blue-500"
                                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                }`}
                            title={
                                isListening
                                    ? "Stop listening"
                                    : isProcessing
                                        ? "Processing..."
                                        : "Start voice input"
                            }
                        >
                            {isListening ? (
                                <MicOff className="w-4 h-4" />
                            ) : isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Mic className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    {speechError && (
                        <div
                            className="absolute right-10 top-2 text-xs text-red-500 opacity-80"
                            title={speechError}
                        >
                            ⚠️
                        </div>
                    )}
                </div>

                {/* Custom Evaluation Criteria */}
                {selectedQuestion.evaluation_type === 'custom' && selectedQuestion.custom_evaluation_prompt && (
                    <div className="bg-muted/50 p-4 rounded-lg border">
                        <div className="text-sm font-medium mb-2">Custom Evaluation Criteria:</div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedQuestion.custom_evaluation_prompt}
                        </div>
                    </div>
                )}

                <Button
                    onClick={onSubmit}
                    disabled={!answer.trim() || isSubmitting}
                    className="w-full"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Getting Feedback...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit for Feedback
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};
