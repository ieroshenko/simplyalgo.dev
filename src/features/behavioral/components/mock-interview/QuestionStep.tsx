import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import { FeedbackViews } from "../FeedbackViews";
import type { MockInterviewStepProps, GeneratedQuestion, FeedbackData } from "../../types/mockInterviewTypes";

interface QuestionStepProps extends MockInterviewStepProps {
    currentQuestion: GeneratedQuestion;
    currentAnswer: string;
    currentFeedback: FeedbackData | undefined;
    isSubmittingAnswer: boolean;
    onSubmitAnswer: () => Promise<void>;
    onPreviousQuestion: () => void;
    onNextQuestion: () => void;
    onTryAgain: () => void;
    // Speech-to-text props
    isListening: boolean;
    isProcessing: boolean;
    hasNativeSupport: boolean;
    speechError: string | null;
    toggleMicrophone: () => Promise<void>;
}

export const QuestionStep = ({
    state,
    setState,
    currentQuestion,
    currentAnswer,
    currentFeedback,
    isSubmittingAnswer,
    onSubmitAnswer,
    onPreviousQuestion,
    onNextQuestion,
    onTryAgain,
    isListening,
    isProcessing,
    hasNativeSupport,
    speechError,
    toggleMicrophone,
}: QuestionStepProps) => {
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                Question {state.currentQuestionIndex + 1} of {state.questions.length}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                {currentQuestion.rationale}
                            </CardDescription>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {currentQuestion.category.map((cat) => (
                                    <Badge key={cat} variant="secondary">
                                        {cat.replace(/_/g, " ")}
                                    </Badge>
                                ))}
                                <Badge variant="outline">{currentQuestion.difficulty}</Badge>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onPreviousQuestion}
                                disabled={state.currentQuestionIndex === 0}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onNextQuestion}
                                disabled={state.currentQuestionIndex === state.questions.length - 1}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-lg font-medium">{currentQuestion.question_text}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="answer">Your Answer</Label>
                            <div className="relative">
                                <Textarea
                                    id="answer"
                                    placeholder={
                                        isListening
                                            ? "🎤 Listening... Speak your answer."
                                            : isProcessing
                                                ? "🔄 Processing audio..."
                                                : "Type your answer here. Use the STAR method (Situation, Task, Action, Result) to structure your response."
                                    }
                                    value={currentAnswer}
                                    onChange={(e) =>
                                        setState(prev => ({
                                            ...prev,
                                            answers: { ...prev.answers, [prev.currentQuestionIndex]: e.target.value },
                                        }))
                                    }
                                    className={`min-h-[300px] ${hasNativeSupport ? "pr-10" : ""}`}
                                />
                                {hasNativeSupport && (
                                    <button
                                        type="button"
                                        onClick={toggleMicrophone}
                                        disabled={isSubmittingAnswer}
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
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={onSubmitAnswer}
                                disabled={!currentAnswer.trim() || isSubmittingAnswer}
                                className="flex-1"
                            >
                                {isSubmittingAnswer ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Getting Feedback...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        {state.currentQuestionIndex === state.questions.length - 1
                                            ? "Submit & Finish"
                                            : "Submit & Next"}
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Show feedback if available */}
                        {currentFeedback && (
                            <div className="mt-4">
                                <FeedbackViews
                                    feedback={currentFeedback}
                                    evaluationType="star"
                                    onTryAgain={onTryAgain}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Progress indicator */}
            <div className="flex gap-2 mt-4">
                {state.questions.map((_, idx) => (
                    <div
                        key={idx}
                        className={`flex-1 h-2 rounded ${idx === state.currentQuestionIndex || state.answers[idx]?.trim()
                            ? "bg-primary"
                            : "bg-muted"
                            }`}
                    />
                ))}
            </div>
        </>
    );
};
