import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FeedbackViews } from "../FeedbackViews";
import type { MockInterviewStepProps } from "../../types/mockInterviewTypes";

interface FeedbackStepProps extends MockInterviewStepProps {
    onStartNew: () => void;
    onBackToHub: () => void;
}

export const FeedbackStep = ({ state, setState, onStartNew, onBackToHub }: FeedbackStepProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Interview Feedback Summary</CardTitle>
                <CardDescription>
                    Review your performance across all questions
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Overall Performance Summary */}
                {Object.keys(state.feedbacks).length > 0 && (
                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle>Overall Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Average Score</span>
                                    <span className="text-2xl font-bold">
                                        {Math.round(
                                            Object.values(state.feedbacks).reduce(
                                                (sum, f) => sum + (f.overall_score || 0),
                                                0
                                            ) / Object.keys(state.feedbacks).length
                                        )}%
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Based on {Object.keys(state.feedbacks).length} of {state.questions.length} questions
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Individual Question Feedback */}
                {state.questions.map((question, idx) => {
                    const answer = state.answers[idx];
                    const feedback = state.feedbacks[idx];

                    return (
                        <div key={idx} className="border rounded-lg p-4 space-y-4">
                            <div>
                                <h3 className="font-semibold">Question {idx + 1}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{question.question_text}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium mb-2">Your Answer</h4>
                                <p className="text-sm whitespace-pre-wrap">{answer || "No answer provided"}</p>
                            </div>
                            {feedback ? (
                                <FeedbackViews
                                    feedback={feedback}
                                    evaluationType="star"
                                    onTryAgain={() => {
                                        // Navigate back to questions step
                                        setState(prev => ({ ...prev, step: 'questions', currentQuestionIndex: idx }));
                                    }}
                                />
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Feedback pending...
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={onStartNew}>
                        Start New Interview
                    </Button>
                    <Button variant="outline" onClick={onBackToHub}>
                        Back to Behavioral Hub
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
