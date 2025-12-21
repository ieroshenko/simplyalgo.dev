import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brain } from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";
import { notifications } from "@/shared/services/notificationService";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { useTheme } from "@/hooks/useTheme";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

// Types and Constants
import type {
  FlashcardReviewInterfaceProps,
  ReviewSession,
  ProblemData,
} from "./types";
import { REVIEW_QUESTIONS } from "./types";

// Sub-components
import { SessionCompleteDialog } from "./SessionCompleteDialog";
import { EmptyStateDialog } from "./EmptyStateDialog";
import { RatingPanel } from "./RatingPanel";
import { ProblemDescriptionPanel } from "./ProblemDescriptionPanel";
import { PracticeCodePanel } from "./PracticeCodePanel";

export const FlashcardReviewInterface = ({
  isOpen,
  onClose,
  userId,
}: FlashcardReviewInterfaceProps) => {
  const { dueCards, submitReview, isSubmittingReview } = useFlashcards(userId);
  const { currentTheme: editorTheme, defineCustomThemes } = useEditorTheme();
  const { isDark } = useTheme();

  const syntaxTheme = isDark ? vscDarkPlus : vs;
  const [isEditorReady, setIsEditorReady] = useState(false);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentSession, setCurrentSession] = useState<ReviewSession | null>(null);
  const [showRatingOptions, setShowRatingOptions] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completedCards, setCompletedCards] = useState(0);
  const [currentProblemData, setCurrentProblemData] = useState<ProblemData | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const startTimeRef = useRef<Date>(new Date());

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && dueCards.length > 0 && !currentSession) {
      startNewCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dueCards, currentSession]);

  // Start new card when currentCardIndex changes
  useEffect(() => {
    if (isOpen && dueCards.length > 0 && currentSession === null) {
      logger.debug('currentCardIndex changed, starting new card', { component: 'FlashcardReview', currentCardIndex });
      setTimeout(() => {
        startNewCard();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, isOpen, dueCards.length, currentSession]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSession(null);
    }
  }, [isOpen]);

  // Start a new card review
  const startNewCard = async () => {
    logger.debug('startNewCard called', { component: 'FlashcardReview', currentCardIndex });

    if (currentCardIndex >= dueCards.length) {
      setSessionComplete(true);
      return;
    }

    const card = dueCards[currentCardIndex];
    logger.debug('Using card', {
      component: 'FlashcardReview',
      index: currentCardIndex,
      problemId: card?.problem_id,
      problemTitle: card?.problem_title,
    });

    if (!card) {
      logger.error('No card found at index', null, { component: 'FlashcardReview', currentCardIndex });
      setSessionComplete(true);
      return;
    }

    setCurrentProblemData(null);

    let problemData = null;
    try {
      const { data: fetchedData, error } = await supabase
        .from("problems")
        .select("id, title, description, examples, function_signature")
        .eq("id", card.problem_id)
        .single();

      if (error) throw error;
      problemData = fetchedData;
      logger.debug('Fetched problem data for card', {
        component: 'FlashcardReview',
        currentCardIndex,
        problemId: card.problem_id,
        title: problemData?.title,
      });
      setCurrentProblemData(problemData);
    } catch (error) {
      logger.error("Error fetching problem data", error, { component: 'FlashcardReview' });
      setCurrentProblemData(null);
    }

    startTimeRef.current = new Date();

    const newSession: ReviewSession = {
      deckId: card.deck_id || card.id,
      problemTitle: problemData?.title || card.problem_title || card.problem_id,
      solutionTitle: card.solution_title || "Solution",
      startTime: startTimeRef.current,
      currentQuestionIndex: 0,
      totalQuestions: 3,
      cardData: card,
    };

    logger.debug('Creating new session', {
      component: 'FlashcardReview',
      cardIndex: currentCardIndex,
      finalTitle: newSession.problemTitle
    });

    setCurrentSession(newSession);
    setShowRatingOptions(false);
    setShowSolution(false);
  };

  // Handle difficulty rating selection
  const handleRatingSelection = async (rating: number) => {
    if (!currentSession) return;

    const timeSpent = Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000);

    try {
      submitReview({
        deckId: currentSession.deckId,
        reviewQuestions: REVIEW_QUESTIONS.map(q => q.question),
        userAnswers: ["Self-evaluated"],
        evaluationSummary: "self-evaluated",
        difficultyRating: rating,
        timeSpent,
      });

      setCompletedCards(prev => prev + 1);
      const nextIndex = currentCardIndex + 1;

      setCurrentCardIndex(nextIndex);
      setCurrentSession(null);
      setShowRatingOptions(false);
      setShowSolution(false);
      setCurrentProblemData(null);

    } catch (error) {
      logger.error('Error submitting review', error, { component: 'FlashcardReview' });
      notifications.error('Failed to submit review. Please try again.');
    }
  };

  // Handle session completion
  const handleSessionComplete = () => {
    setSessionComplete(false);
    setCurrentCardIndex(0);
    setCurrentSession(null);
    setCompletedCards(0);
    onClose();
    notifications.success(`Review session complete! Reviewed ${completedCards} cards.`);
  };

  // Navigation handlers
  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      logger.debug('Previous button clicked', { component: 'FlashcardReview', from: currentCardIndex });
      resetCardState();
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < dueCards.length - 1) {
      logger.debug('Next button clicked', { component: 'FlashcardReview', from: currentCardIndex });
      resetCardState();
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const handleSkipCard = () => {
    resetCardState();
    setCurrentCardIndex(prev => prev + 1);
  };

  const resetCardState = () => {
    setCurrentSession(null);
    setShowRatingOptions(false);
    setShowSolution(false);
    setCurrentProblemData(null);
  };

  // Early returns for special states
  if (!isOpen) return null;

  if (sessionComplete) {
    return (
      <SessionCompleteDialog
        isOpen={isOpen}
        onClose={onClose}
        completedCards={completedCards}
        onFinish={handleSessionComplete}
      />
    );
  }

  if (dueCards.length === 0) {
    return <EmptyStateDialog isOpen={isOpen} onClose={onClose} />;
  }

  const progress = ((currentCardIndex + 1) / dueCards.length) * 100;
  const currentCard = currentSession?.cardData || dueCards[currentCardIndex];

  logger.debug('Rendering with currentCard', {
    component: 'FlashcardReview',
    index: currentCardIndex,
    problemId: currentCard?.problem_id,
    problemDataTitle: currentProblemData?.title,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Flashcard Review
            </DialogTitle>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>Card {currentCardIndex + 1} of {dueCards.length}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Navigate:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousCard}
                    disabled={currentCardIndex === 0}
                    className="h-6 w-6 p-0"
                    title="Previous card"
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextCard}
                    disabled={currentCardIndex >= dueCards.length - 1}
                    className="h-6 w-6 p-0"
                    title="Next card"
                  >
                    →
                  </Button>
                </div>
              </div>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Problem Description Panel */}
          <ProblemDescriptionPanel
            session={currentSession}
            problemData={currentProblemData}
            currentCard={currentCard}
            currentCardIndex={currentCardIndex}
            showSolution={showSolution}
            onToggleSolution={() => setShowSolution(!showSolution)}
            editorTheme={editorTheme}
            syntaxTheme={syntaxTheme}
            defineCustomThemes={defineCustomThemes}
            onEditorReady={() => setIsEditorReady(true)}
          />

          {/* Practice Code Panel or Rating Panel */}
          <div className="w-1/2 flex flex-col">
            {!showRatingOptions ? (
              <PracticeCodePanel
                problemData={currentProblemData}
                currentCard={currentCard}
                currentCardIndex={currentCardIndex}
                editorTheme={editorTheme}
                defineCustomThemes={defineCustomThemes}
                onEditorReady={() => setIsEditorReady(true)}
                onSkipCard={handleSkipCard}
                onRateMemory={() => setShowRatingOptions(true)}
              />
            ) : (
              <RatingPanel
                onRatingSelect={handleRatingSelection}
                isSubmitting={isSubmittingReview}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};