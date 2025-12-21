/**
 * Edit Question Dialog component for behavioral practice
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { BehavioralQuestionCategory, QuestionDifficulty, EvaluationType } from "@/types";
import { BEHAVIORAL_CATEGORIES, getWordCount } from "../types";

interface EditQuestionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    questionText: string;
    onQuestionTextChange: (text: string) => void;
    selectedCategories: BehavioralQuestionCategory[];
    onToggleCategory: (category: BehavioralQuestionCategory) => void;
    difficulty: QuestionDifficulty;
    onDifficultyChange: (difficulty: QuestionDifficulty) => void;
    evaluationType: EvaluationType;
    onEvaluationTypeChange: (type: EvaluationType) => void;
    customPrompt: string;
    onCustomPromptChange: (prompt: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

export const EditQuestionDialog: React.FC<EditQuestionDialogProps> = ({
    isOpen,
    onOpenChange,
    questionText,
    onQuestionTextChange,
    selectedCategories,
    onToggleCategory,
    difficulty,
    onDifficultyChange,
    evaluationType,
    onEvaluationTypeChange,
    customPrompt,
    onCustomPromptChange,
    onSubmit,
    onCancel,
    isLoading,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Question</DialogTitle>
                    <DialogDescription>
                        Update your custom behavioral interview question
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Question Text */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-question-text">Question Text *</Label>
                        <Textarea
                            id="edit-question-text"
                            placeholder="e.g., Tell me about a time when you had to debug a critical production issue..."
                            value={questionText}
                            onChange={(e) => onQuestionTextChange(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Categories */}
                    <div className="space-y-2">
                        <Label>Categories *</Label>
                        <div className="flex flex-wrap gap-2">
                            {BEHAVIORAL_CATEGORIES.map((cat) => (
                                <Button
                                    key={cat}
                                    type="button"
                                    variant={selectedCategories.includes(cat as BehavioralQuestionCategory) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onToggleCategory(cat as BehavioralQuestionCategory)}
                                >
                                    {cat.replace(/_/g, " ")}
                                </Button>
                            ))}
                        </div>
                        {selectedCategories.length === 0 && (
                            <p className="text-sm text-muted-foreground">Select at least one category</p>
                        )}
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-difficulty">Difficulty</Label>
                        <Select value={difficulty} onValueChange={(value) => onDifficultyChange(value as QuestionDifficulty)}>
                            <SelectTrigger id="edit-difficulty">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Evaluation Criteria */}
                    <div className="space-y-2">
                        <Label>Evaluation Criteria</Label>
                        <RadioGroup value={evaluationType} onValueChange={(value) => onEvaluationTypeChange(value as EvaluationType)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="star" id="edit-eval-star" />
                                <Label htmlFor="edit-eval-star" className="font-normal cursor-pointer">
                                    STAR Method (Situation, Task, Action, Result)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="none" id="edit-eval-none" />
                                <Label htmlFor="edit-eval-none" className="font-normal cursor-pointer">
                                    None (General feedback only)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="custom" id="edit-eval-custom" />
                                <Label htmlFor="edit-eval-custom" className="font-normal cursor-pointer">
                                    Custom Prompt
                                </Label>
                            </div>
                        </RadioGroup>

                        {evaluationType === "custom" && (
                            <div className="space-y-2 mt-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="edit-custom-prompt">Custom Evaluation Prompt *</Label>
                                    <span className="text-sm text-muted-foreground">
                                        {getWordCount(customPrompt)} / 500 words
                                    </span>
                                </div>
                                <Textarea
                                    id="edit-custom-prompt"
                                    placeholder="e.g., Evaluate the answer based on: 1) Technical depth, 2) Problem-solving approach, 3) Impact on the team..."
                                    value={customPrompt}
                                    onChange={(e) => onCustomPromptChange(e.target.value)}
                                    rows={6}
                                    className={getWordCount(customPrompt) > 500 ? "border-destructive" : ""}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Define how the AI should evaluate answers to this question (max 500 words)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        Update Question
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
