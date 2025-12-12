import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle } from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useSolutions } from "@/hooks/useSolutions";
import { SolutionSelectorModal } from "./SolutionSelectorModal";
import { isFeatureEnabled } from "@/config/features";
import { toast } from "sonner";

interface FlashcardButtonProps {
  problemId: string;
  problemStatus: "solved" | "attempted" | "not-started";
  userId?: string;
  className?: string;
  // Optional: for submissions tab - specify exact submission code
  submissionCode?: string;
  submissionId?: string;
  variant?: "default" | "submission";
}

export const FlashcardButton = ({
  problemId,
  problemStatus,
  userId,
  className = "",
  submissionCode,
  submissionId,
  variant = "default",
}: FlashcardButtonProps) => {
  const [showSolutionSelector, setShowSolutionSelector] = useState(false);
  const { solutions } = useSolutions(problemId);
  const {
    isInFlashcards,
    addToFlashcards,
    isAddingToFlashcards,
  } = useFlashcards(userId);

  // Don't render if feature is disabled or user not authenticated
  if (!isFeatureEnabled("FLASHCARDS") || !userId) {
    return null;
  }

  // For default variant, only show on solved problems
  // For submission variant, always show (assumes it's being rendered on a solved problem's submission)
  if (variant === "default" && problemStatus !== "solved") {
    return null;
  }

  const isAlreadyInFlashcards = isInFlashcards(problemId);

  const handleAddToFlashcards = () => {
    if (isAlreadyInFlashcards) {
      toast.error("This problem is already in your flashcard deck. Remove the existing card first to add a different solution.");
      return;
    }

    // For submission variant, create a custom solution from the submission
    if (variant === "submission" && submissionCode && submissionId) {
      addToFlashcards({
        problemId,
        customSolution: {
          code: submissionCode,
          title: "Your Solution",
        },
      });
      return;
    }

    // Default behavior - use curated solutions
    if (!solutions || solutions.length === 0) {
      toast.error("No solutions available for this problem.");
      return;
    }

    // If only one solution, add it directly
    if (solutions.length === 1 && solutions[0]) {
      addToFlashcards({
        problemId,
        solutionId: solutions[0].id,
      });
      return;
    }

    // Multiple solutions - show selector modal
    setShowSolutionSelector(true);
  };

  const handleSolutionSelected = (solutionId: string) => {
    addToFlashcards({
      problemId,
      solutionId,
    });
    setShowSolutionSelector(false);
  };

  if (isAlreadyInFlashcards) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`
          border-emerald-600 text-emerald-700 bg-emerald-50
          dark:border-emerald-500 dark:text-emerald-200 dark:bg-emerald-900/30
          disabled:opacity-100 disabled:pointer-events-none
          ${className}
        `}
        disabled
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Added to Deck
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant === "submission" ? "outline" : "ghost"}
        size="sm"
        onClick={handleAddToFlashcards}
        disabled={isAddingToFlashcards}
        className={variant === "submission" ? className : `p-1.5 hover:bg-muted/50 ${className}`}
        title={variant === "submission" ? "Add to Deck" : "Add to Flashcards"}
      >
        <BookOpen className="h-4 w-4" />
      </Button>

      {showSolutionSelector && (
        <SolutionSelectorModal
          solutions={solutions || []}
          isOpen={showSolutionSelector}
          onClose={() => setShowSolutionSelector(false)}
          onSelect={handleSolutionSelected}
          problemTitle={`Problem: ${problemId}`}
        />
      )}
    </>
  );
};
