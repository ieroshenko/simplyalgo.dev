/**
 * Hook for managing the Edit Question dialog state
 */
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCustomQuestions } from "@/hooks/useCustomQuestions";
import type { BehavioralQuestion, BehavioralQuestionCategory, QuestionDifficulty, EvaluationType } from "@/types";
import { INITIAL_EDIT_DIALOG_STATE, getWordCount } from "../types";

interface UseEditQuestionDialogProps {
    selectedQuestion: BehavioralQuestion | null;
    userId: string | undefined;
    onSuccess: () => void;
}

export const useEditQuestionDialog = ({
    selectedQuestion,
    userId,
    onSuccess,
}: UseEditQuestionDialogProps) => {
    const { toast } = useToast();
    const { updateQuestion, loading: customLoading } = useCustomQuestions();

    const [isOpen, setIsOpen] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<BehavioralQuestionCategory[]>([]);
    const [difficulty, setDifficulty] = useState<QuestionDifficulty>("intermediate");
    const [evaluationType, setEvaluationType] = useState<EvaluationType>("star");
    const [customPrompt, setCustomPrompt] = useState("");

    const openDialog = useCallback(() => {
        if (!selectedQuestion || !selectedQuestion.user_id || selectedQuestion.user_id !== userId) {
            return;
        }
        setQuestionText(selectedQuestion.question_text);
        setSelectedCategories(selectedQuestion.category);
        setDifficulty(selectedQuestion.difficulty);
        setEvaluationType(selectedQuestion.evaluation_type || "star");
        setCustomPrompt(selectedQuestion.custom_evaluation_prompt || "");
        setIsOpen(true);
    }, [selectedQuestion, userId]);

    const closeDialog = useCallback(() => {
        setIsOpen(false);
        setQuestionText("");
        setSelectedCategories([]);
        setDifficulty("intermediate");
        setEvaluationType("star");
        setCustomPrompt("");
    }, []);

    const toggleCategory = useCallback((category: BehavioralQuestionCategory) => {
        setSelectedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!selectedQuestion) return;

        if (!questionText.trim()) {
            toast({
                title: "Error",
                description: "Question text is required",
                variant: "destructive",
            });
            return;
        }

        if (selectedCategories.length === 0) {
            toast({
                title: "Error",
                description: "Please select at least one category",
                variant: "destructive",
            });
            return;
        }

        if (evaluationType === "custom" && !customPrompt.trim()) {
            toast({
                title: "Error",
                description: "Custom evaluation prompt is required when evaluation type is 'custom'",
                variant: "destructive",
            });
            return;
        }

        if (evaluationType === "custom" && getWordCount(customPrompt) > 500) {
            toast({
                title: "Error",
                description: `Custom evaluation prompt exceeds 500 words (${getWordCount(customPrompt)} words)`,
                variant: "destructive",
            });
            return;
        }

        const success = await updateQuestion(selectedQuestion.id, {
            question_text: questionText,
            category: selectedCategories,
            difficulty,
            evaluation_type: evaluationType,
            custom_evaluation_prompt: evaluationType === "custom" ? customPrompt : undefined,
        });

        if (success) {
            toast({
                title: "Success",
                description: "Question updated successfully",
            });
            closeDialog();
            onSuccess();
        } else {
            toast({
                title: "Error",
                description: "Failed to update question",
                variant: "destructive",
            });
        }
    }, [
        selectedQuestion,
        questionText,
        selectedCategories,
        difficulty,
        evaluationType,
        customPrompt,
        updateQuestion,
        toast,
        closeDialog,
        onSuccess,
    ]);

    return {
        isOpen,
        setIsOpen,
        questionText,
        setQuestionText,
        selectedCategories,
        toggleCategory,
        difficulty,
        setDifficulty,
        evaluationType,
        setEvaluationType,
        customPrompt,
        setCustomPrompt,
        openDialog,
        closeDialog,
        handleSubmit,
        isLoading: customLoading,
    };
};
