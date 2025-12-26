/**
 * Current Question Card component for behavioral practice
 */
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import type { BehavioralQuestion, PracticeAnswer } from "@/types";

interface CurrentQuestionCardProps {
    question: BehavioralQuestion;
    lastAnswer: PracticeAnswer | null;
    isOwner: boolean;
    onEdit: () => void;
}

export const CurrentQuestionCard: React.FC<CurrentQuestionCardProps> = ({
    question,
    lastAnswer,
    isOwner,
    onEdit,
}) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                            <CardTitle className="flex-1">{question.question_text}</CardTitle>
                            {isOwner && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onEdit}
                                    className="shrink-0"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 items-center">
                            {question.category.map((cat) => (
                                <Badge key={cat} variant="secondary">
                                    {cat.replace(/_/g, " ")}
                                </Badge>
                            ))}
                            <Badge variant="outline">{question.difficulty}</Badge>
                            {lastAnswer && lastAnswer.overall_score > 0 && (
                                <Badge variant="default">
                                    Previous Score: {lastAnswer.overall_score}%
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
};
