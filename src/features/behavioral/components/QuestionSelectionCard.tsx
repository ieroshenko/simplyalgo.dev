/**
 * Question Selection Card component for behavioral practice
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BehavioralQuestion } from "@/types";

interface QuestionSelectionCardProps {
    questions: BehavioralQuestion[];
    questionScores: Record<string, number>;
    onSelectQuestion: (question: BehavioralQuestion) => void;
    onBrowseAll: () => void;
}

export const QuestionSelectionCard: React.FC<QuestionSelectionCardProps> = ({
    questions,
    questionScores,
    onSelectQuestion,
    onBrowseAll,
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Select a Question</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {questions.slice(0, 5).map((q) => {
                        const score = questionScores[q.id];
                        return (
                            <Button
                                key={q.id}
                                variant="outline"
                                className="w-full justify-start text-left h-auto py-3"
                                onClick={() => onSelectQuestion(q)}
                            >
                                <div className="flex-1">
                                    <div className="font-medium">{q.question_text}</div>
                                    <div className="flex gap-2 mt-1 items-center">
                                        {q.category.map((cat) => (
                                            <Badge key={cat} variant="secondary" className="text-xs">
                                                {cat.replace(/_/g, " ")}
                                            </Badge>
                                        ))}
                                        {score !== undefined && (
                                            <Badge variant="default" className="text-xs">
                                                Score: {score}%
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </Button>
                        );
                    })}
                </div>
                <Button
                    variant="link"
                    className="mt-4"
                    onClick={onBrowseAll}
                >
                    Browse All Questions →
                </Button>
            </CardContent>
        </Card>
    );
};
