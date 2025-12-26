/**
 * Behavioral Practice Page - Main component for practicing behavioral questions
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useBehavioralQuestions } from "@/features/behavioral/hooks/useBehavioralQuestions";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useUserStories } from "@/hooks/useUserStories";
import { usePracticeAnswers } from "@/hooks/usePracticeAnswers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackViews } from "@/features/behavioral/components/FeedbackViews";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { logger } from "@/utils/logger";
import { useTrackFeatureTime, Features } from '@/hooks/useFeatureTracking';

// Feature-local imports
import { QuestionSelectionCard } from "./components/QuestionSelectionCard";
import { CurrentQuestionCard } from "./components/CurrentQuestionCard";
import { AnswerInputCard } from "./components/AnswerInputCard";
import { ExperienceDialog } from "./components/ExperienceDialog";
import { EditQuestionDialog } from "./components/EditQuestionDialog";
import { useEditQuestionDialog } from "./hooks/useEditQuestionDialog";
import type { BehavioralFeedbackState, PracticeProgressState } from "./types";
import { INITIAL_PROGRESS_STATE } from "./types";
import type { BehavioralQuestion, PracticeAnswer } from "@/types";

const BehavioralPractice = () => {
  useTrackFeatureTime(Features.BEHAVIORAL_PRACTICE);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get("questionId");
  const { user } = useAuth();
  const { questions, refresh: refreshQuestions } = useBehavioralQuestions({ includeCustom: true });
  const { stories } = useUserStories();
  const { createSession, submitAnswer, updateAnswerFeedback, currentSession } = usePracticeSession();
  const { getLastAnswer, getQuestionScores, getProgress } = usePracticeAnswers();

  // Core state
  const [selectedQuestion, setSelectedQuestion] = useState<BehavioralQuestion | null>(null);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<PracticeAnswer | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<PracticeProgressState>(INITIAL_PROGRESS_STATE);
  const [feedback, setFeedback] = useState<BehavioralFeedbackState | null>(null);
  const [isExperienceDialogOpen, setIsExperienceDialogOpen] = useState(false);

  const feedbackRef = useRef<HTMLDivElement>(null);
  const lastLoadedQuestionIdRef = useRef<string | null>(null);

  // Speech-to-text
  const {
    isListening,
    hasNativeSupport,
    isProcessing,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechToText({
    onResult: (transcript) => {
      setAnswer((prev) => prev + (prev ? ' ' : '') + transcript);
    },
    onError: (error) => {
      logger.error('[BehavioralPractice] Speech recognition error', { error });
    },
  });

  // Edit question dialog hook
  const editDialog = useEditQuestionDialog({
    selectedQuestion,
    userId: user?.id,
    onSuccess: refreshQuestions,
  });

  const toggleMicrophone = async () => {
    if (!hasNativeSupport) return;
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Load question if questionId is provided
  useEffect(() => {
    if (questionId && questions.length > 0) {
      const question = questions.find((q) => q.id === questionId);
      if (question) {
        setSelectedQuestion(question);
      }
    } else if (questions.length > 0 && !selectedQuestion && !questionId) {
      setSelectedQuestion(questions[0]);
    }
  }, [questionId, questions, selectedQuestion]);

  // Update selectedQuestion when questions are refreshed
  useEffect(() => {
    if (selectedQuestion && questions.length > 0) {
      const updated = questions.find((q) => q.id === selectedQuestion.id);
      if (updated && (
        updated.question_text !== selectedQuestion.question_text ||
        updated.category.length !== selectedQuestion.category.length ||
        updated.difficulty !== selectedQuestion.difficulty ||
        updated.evaluation_type !== selectedQuestion.evaluation_type ||
        updated.custom_evaluation_prompt !== selectedQuestion.custom_evaluation_prompt
      )) {
        setSelectedQuestion(updated);
      }
    }
  }, [questions, selectedQuestion]);

  // Initialize session when question is selected
  useEffect(() => {
    if (selectedQuestion && !currentSession && user) {
      createSession("guided");
    }
  }, [selectedQuestion, currentSession, user, createSession]);

  // Load last answer when question is selected
  useEffect(() => {
    const loadLastAnswer = async () => {
      if (selectedQuestion && user) {
        const isDifferentQuestion = lastLoadedQuestionIdRef.current !== selectedQuestion.id;

        if (isDifferentQuestion) {
          const last = await getLastAnswer(selectedQuestion.id);
          setLastAnswer(last);
          lastLoadedQuestionIdRef.current = selectedQuestion.id;

          if (last) {
            setAnswer(last.answer_text);
            if (last.story_id) {
              setSelectedStory(last.story_id);
            }
            if (last.overall_score > 0) {
              setFeedback({
                star_score: last.star_score,
                content_score: last.content_score,
                delivery_score: last.delivery_score,
                overall_score: last.overall_score,
                custom_metrics: last.custom_metrics,
                feedback: last.feedback,
              });
            } else {
              setFeedback(null);
            }
          } else {
            setAnswer("");
            setSelectedStory(null);
            setFeedback(null);
          }
        }
      }
    };
    loadLastAnswer();
  }, [selectedQuestion, user, getLastAnswer]);

  // Load question scores and progress on mount
  useEffect(() => {
    const loadScoresAndProgress = async () => {
      if (user) {
        const scores = await getQuestionScores();
        setQuestionScores(scores);
        const progressData = await getProgress();
        setProgress(progressData);
      }
    };
    loadScoresAndProgress();
  }, [user, getQuestionScores, getProgress]);

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || !answer.trim() || !currentSession || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const answerData = await submitAnswer(
        selectedQuestion.id,
        answer,
        selectedStory || undefined
      );

      const { data, error } = await supabase.functions.invoke("behavioral-interview-feedback", {
        body: {
          question: selectedQuestion.question_text,
          answer: answer,
          story: selectedStory
            ? stories.find((s) => s.id === selectedStory)
            : null,
          evaluationType: selectedQuestion.evaluation_type || 'star',
          customEvaluationPrompt: selectedQuestion.custom_evaluation_prompt || undefined,
        },
      });

      if (error) throw error;

      if (data && answerData?.id) {
        await updateAnswerFeedback(answerData.id, {
          star_score: data.star_score,
          content_score: data.content_score,
          delivery_score: data.delivery_score,
          overall_score: data.overall_score,
          custom_metrics: data.custom_metrics,
          feedback: data.feedback,
        });

        setFeedback({
          star_score: data.star_score,
          content_score: data.content_score,
          delivery_score: data.delivery_score,
          overall_score: data.overall_score,
          custom_metrics: data.custom_metrics,
          feedback: data.feedback,
        });

        setTimeout(() => {
          feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        if (selectedQuestion) {
          const scores = await getQuestionScores();
          setQuestionScores(scores);
          const progressData = await getProgress();
          setProgress(progressData);
          const last = await getLastAnswer(selectedQuestion.id);
          setLastAnswer(last);
        }
      }
    } catch (err) {
      logger.error('[BehavioralPractice] Error submitting answer', { error: err });
      alert("Failed to get feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-[68rem] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/behavioral/questions")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Practice Question</h1>
                <p className="text-muted-foreground mt-2">
                  Practice answering behavioral questions with AI-powered feedback
                </p>
              </div>
            </div>
          </div>

          {/* Question Selection or Practice */}
          {!selectedQuestion ? (
            <QuestionSelectionCard
              questions={questions}
              questionScores={questionScores}
              onSelectQuestion={setSelectedQuestion}
              onBrowseAll={() => navigate("/behavioral/questions")}
            />
          ) : (
            <>
              <CurrentQuestionCard
                question={selectedQuestion}
                lastAnswer={lastAnswer}
                isOwner={selectedQuestion.user_id === user?.id}
                onEdit={editDialog.openDialog}
              />

              <ExperienceDialog
                isOpen={isExperienceDialogOpen}
                onOpenChange={setIsExperienceDialogOpen}
                stories={stories}
                selectedStory={selectedStory}
                onSelectStory={setSelectedStory}
              />

              <AnswerInputCard
                selectedQuestion={selectedQuestion}
                answer={answer}
                onAnswerChange={setAnswer}
                lastAnswer={lastAnswer}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmitAnswer}
                hasNativeSupport={hasNativeSupport}
                isListening={isListening}
                isProcessing={isProcessing}
                speechError={speechError}
                onToggleMicrophone={toggleMicrophone}
                stories={stories}
                onOpenExperienceDialog={() => setIsExperienceDialogOpen(true)}
              />

              {/* Feedback Display */}
              {feedback && selectedQuestion && (
                <div ref={feedbackRef}>
                  <FeedbackViews
                    feedback={feedback}
                    evaluationType={selectedQuestion.evaluation_type || 'star'}
                    onTryAgain={() => {
                      setAnswer("");
                      setFeedback(null);
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Edit Question Dialog */}
          <EditQuestionDialog
            isOpen={editDialog.isOpen}
            onOpenChange={editDialog.setIsOpen}
            questionText={editDialog.questionText}
            onQuestionTextChange={editDialog.setQuestionText}
            selectedCategories={editDialog.selectedCategories}
            onToggleCategory={editDialog.toggleCategory}
            difficulty={editDialog.difficulty}
            onDifficultyChange={editDialog.setDifficulty}
            evaluationType={editDialog.evaluationType}
            onEvaluationTypeChange={editDialog.setEvaluationType}
            customPrompt={editDialog.customPrompt}
            onCustomPromptChange={editDialog.setCustomPrompt}
            onSubmit={editDialog.handleSubmit}
            onCancel={editDialog.closeDialog}
            isLoading={editDialog.isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default BehavioralPractice;
