import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBehavioralQuestions } from "@/hooks/useBehavioralQuestions";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useUserStories } from "@/hooks/useUserStories";
import { usePracticeAnswers } from "@/hooks/usePracticeAnswers";
import { useCustomQuestions } from "@/hooks/useCustomQuestions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, Copy, Check, Edit, Mic, MicOff } from "lucide-react";
import { FeedbackViews } from "@/components/behavioral/FeedbackViews";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { BehavioralQuestion, STARScore, CustomMetrics, AnswerFeedback, PracticeAnswer, BehavioralQuestionCategory, QuestionDifficulty, EvaluationType } from "@/types";
import { logger } from "@/utils/logger";

const BehavioralPractice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get("questionId");
  const { user } = useAuth();
  const { toast } = useToast();
  const { questions, refresh: refreshQuestions } = useBehavioralQuestions({ includeCustom: true });
  const { stories } = useUserStories();
  const { createSession, submitAnswer, updateAnswerFeedback, currentSession } = usePracticeSession();
  const { getLastAnswer, getQuestionScores, getProgress } = usePracticeAnswers();
  const { updateQuestion, loading: customLoading } = useCustomQuestions();

  const [selectedQuestion, setSelectedQuestion] = useState<BehavioralQuestion | null>(null);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);
  const [isExperienceDialogOpen, setIsExperienceDialogOpen] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<PracticeAnswer | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<{ totalPracticed: number; totalQuestions: number; averageScore: number }>({
    totalPracticed: 0,
    totalQuestions: 0,
    averageScore: 0,
  });
  const [feedback, setFeedback] = useState<{
    star_score?: STARScore;
    content_score: number;
    delivery_score: number;
    overall_score: number;
    custom_metrics?: CustomMetrics;
    feedback: AnswerFeedback;
  } | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const lastLoadedQuestionIdRef = useRef<string | null>(null);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editSelectedCategories, setEditSelectedCategories] = useState<BehavioralQuestionCategory[]>([]);
  const [editDifficulty, setEditDifficulty] = useState<QuestionDifficulty>("intermediate");
  const [editEvaluationType, setEditEvaluationType] = useState<EvaluationType>("star");
  const [editCustomPrompt, setEditCustomPrompt] = useState("");

  // Speech-to-text functionality for answer field
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
      // If questionId is provided but question not found, don't default to first question
    } else if (questions.length > 0 && !selectedQuestion && !questionId) {
      // Default to first question only if no questionId is provided
      setSelectedQuestion(questions[0]);
    }
  }, [questionId, questions, selectedQuestion]);

  // Update selectedQuestion when questions are refreshed (e.g., after editing)
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
  // Only load if it's a different question to avoid overwriting unsaved changes
  useEffect(() => {
    const loadLastAnswer = async () => {
      if (selectedQuestion && user) {
        const isDifferentQuestion = lastLoadedQuestionIdRef.current !== selectedQuestion.id;

        // Only load from DB if it's a different question (preserve unsaved changes when switching tabs)
        if (isDifferentQuestion) {
          const last = await getLastAnswer(selectedQuestion.id);
          setLastAnswer(last);
          lastLoadedQuestionIdRef.current = selectedQuestion.id;

          if (last) {
            setAnswer(last.answer_text);
            if (last.story_id) {
              setSelectedStory(last.story_id);
            }
            // Load previous feedback if it exists
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
            // Only clear if it's a different question (don't clear if user has unsaved changes)
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
      // Submit answer to database
      const answerData = await submitAnswer(
        selectedQuestion.id,
        answer,
        selectedStory || undefined
      );

      // Call AI Edge Function for feedback
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

      // Update answer with feedback
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

        // Scroll to feedback section after a short delay to ensure it's rendered
        setTimeout(() => {
          feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        // Refresh scores, progress, and last answer
        if (selectedQuestion) {
          const scores = await getQuestionScores();
          setQuestionScores(scores);
          const progressData = await getProgress();
          setProgress(progressData);
          // Reload last answer to update the previous score badge
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

  const handleNewQuestion = () => {
    setSelectedQuestion(null);
    setAnswer("");
    setFeedback(null);
    setSelectedStory(null);
    setLastAnswer(null);
    // Will trigger useEffect to select new question
  };

  // Categories list
  const categories = [
    'general',
    'technical_leadership',
    'code_review_collaboration',
    'debugging_problem_solving',
    'system_design_architecture',
    'technical_failure_recovery',
    'technical_debt_prioritization',
    'technical_communication',
    'technical_initiative',
    'learning_new_technologies',
    'code_quality_best_practices',
    'scaling_performance',
  ];

  const toggleCategory = (category: BehavioralQuestionCategory) => {
    setEditSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  };

  const handleOpenEditDialog = () => {
    if (!selectedQuestion || !selectedQuestion.user_id || selectedQuestion.user_id !== user?.id) {
      return;
    }
    setEditQuestionText(selectedQuestion.question_text);
    setEditSelectedCategories(selectedQuestion.category);
    setEditDifficulty(selectedQuestion.difficulty);
    setEditEvaluationType(selectedQuestion.evaluation_type || "star");
    setEditCustomPrompt(selectedQuestion.custom_evaluation_prompt || "");
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditQuestionText("");
    setEditSelectedCategories([]);
    setEditDifficulty("intermediate");
    setEditEvaluationType("star");
    setEditCustomPrompt("");
  };

  const handleSubmitEdit = async () => {
    if (!selectedQuestion) return;

    if (!editQuestionText.trim()) {
      toast({
        title: "Error",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    if (editSelectedCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    if (editEvaluationType === "custom" && !editCustomPrompt.trim()) {
      toast({
        title: "Error",
        description: "Custom evaluation prompt is required when evaluation type is 'custom'",
        variant: "destructive",
      });
      return;
    }

    if (editEvaluationType === "custom" && getWordCount(editCustomPrompt) > 500) {
      toast({
        title: "Error",
        description: `Custom evaluation prompt exceeds 500 words (${getWordCount(editCustomPrompt)} words)`,
        variant: "destructive",
      });
      return;
    }

    const success = await updateQuestion(selectedQuestion.id, {
      question_text: editQuestionText,
      category: editSelectedCategories,
      difficulty: editDifficulty,
      evaluation_type: editEvaluationType,
      custom_evaluation_prompt: editEvaluationType === "custom" ? editCustomPrompt : undefined,
    });

    if (success) {
      toast({
        title: "Success",
        description: "Question updated successfully",
      });
      handleCloseEditDialog();
      // Refresh questions - the useEffect will automatically update selectedQuestion
      refreshQuestions();
    } else {
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-[68rem] mx-auto">
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

          {/* Question Selection */}
          {!selectedQuestion ? (
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
                        onClick={() => setSelectedQuestion(q)}
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
                  onClick={() => navigate("/behavioral/questions")}
                >
                  Browse All Questions →
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Current Question */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="flex-1">{selectedQuestion.question_text}</CardTitle>
                        {selectedQuestion.user_id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenEditDialog}
                            className="shrink-0"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 items-center">
                        {selectedQuestion.category.map((cat) => (
                          <Badge key={cat} variant="secondary">
                            {cat.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        <Badge variant="outline">{selectedQuestion.difficulty}</Badge>
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

              {/* Experience Selection Dialog */}
              <Dialog open={isExperienceDialogOpen} onOpenChange={setIsExperienceDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Reference an Experience</DialogTitle>
                    <DialogDescription>
                      Select an experience from your library to help structure your answer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    {stories.map((story) => {
                      const isSelected = selectedStory === story.id;
                      const isExpanded = isSelected;

                      // Build the story content for copying (only content, no metadata)
                      // If STAR format exists, use that; otherwise use description
                      const hasSTARFormat = story.situation && story.task && story.action && story.result;
                      const contentParts = [];

                      if (hasSTARFormat) {
                        contentParts.push(
                          `Situation: ${story.situation}`,
                          `Task: ${story.task}`,
                          `Action: ${story.action}`,
                          `Result: ${story.result}`
                        );
                      } else if (story.description) {
                        contentParts.push(story.description);
                      }

                      // Include metrics if it exists (as it's part of the content)
                      if (story.metrics) {
                        contentParts.push(`Metrics: ${story.metrics}`);
                      }

                      const storyContent = contentParts.join("\n\n");

                      const handleCopy = async () => {
                        try {
                          await navigator.clipboard.writeText(storyContent);
                          setCopiedStoryId(story.id);
                          setTimeout(() => setCopiedStoryId(null), 2000);
                        } catch (err) {
                          logger.error('[BehavioralPractice] Failed to copy story', { error: err });
                        }
                      };

                      return (
                        <div key={story.id} className="border rounded-lg overflow-hidden">
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            className="w-full justify-start text-left h-auto py-2 rounded-b-none"
                            onClick={() =>
                              setSelectedStory(isSelected ? null : story.id)
                            }
                          >
                            <div className="flex-1">
                              <div className="font-medium">{story.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {story.description
                                  ? story.description.substring(0, 100) + "..."
                                  : story.situation
                                    ? story.situation.substring(0, 100) + "..."
                                    : "No description"}
                              </div>
                            </div>
                          </Button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="p-4 bg-muted/30 border-t space-y-4">
                              {/* Copy Button */}
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCopy}
                                  className="gap-2"
                                >
                                  {copiedStoryId === story.id ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      Copy Experience
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Story Content */}
                              <div className="space-y-3 text-sm">
                                {/* Show STAR format if all STAR fields exist, otherwise show description */}
                                {story.situation && story.task && story.action && story.result ? (
                                  <>
                                    <div>
                                      <div className="font-medium mb-1">Situation</div>
                                      <div className="text-muted-foreground whitespace-pre-wrap">
                                        {story.situation}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium mb-1">Task</div>
                                      <div className="text-muted-foreground whitespace-pre-wrap">
                                        {story.task}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium mb-1">Action</div>
                                      <div className="text-muted-foreground whitespace-pre-wrap">
                                        {story.action}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium mb-1">Result</div>
                                      <div className="text-muted-foreground whitespace-pre-wrap">
                                        {story.result}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  story.description && (
                                    <div>
                                      <div className="font-medium mb-1">Description</div>
                                      <div className="text-muted-foreground whitespace-pre-wrap">
                                        {story.description}
                                      </div>
                                    </div>
                                  )
                                )}

                                {story.metrics && (
                                  <div>
                                    <div className="font-medium mb-1">Metrics</div>
                                    <div className="text-muted-foreground">
                                      {story.metrics}
                                    </div>
                                  </div>
                                )}

                                {/* Metadata */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                  {story.tags && story.tags.length > 0 && (
                                    <div>
                                      <div className="text-xs font-medium mb-1">Tags</div>
                                      <div className="flex flex-wrap gap-1">
                                        {story.tags.map((tag, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {story.technical_skills && story.technical_skills.length > 0 && (
                                    <div>
                                      <div className="text-xs font-medium mb-1">Technical Skills</div>
                                      <div className="flex flex-wrap gap-1">
                                        {story.technical_skills.map((skill, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {story.technologies && story.technologies.length > 0 && (
                                    <div>
                                      <div className="text-xs font-medium mb-1">Technologies</div>
                                      <div className="flex flex-wrap gap-1">
                                        {story.technologies.map((tech, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {tech}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Answer Input */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your Answer</CardTitle>
                      <CardDescription>
                        {(selectedQuestion.evaluation_type || 'star') === 'star'
                          ? "Structure your answer using the STAR method (Situation, Task, Action, Result)"
                          : selectedQuestion.evaluation_type === 'custom'
                            ? "Provide a detailed answer that addresses the custom evaluation criteria"
                            : "Provide a clear and comprehensive answer to the question"}
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
                        onClick={() => setIsExperienceDialogOpen(true)}
                      >
                        Reference Experience
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Textarea
                      placeholder={
                        isListening
                          ? "🎤 Listening... Speak your answer."
                          : isProcessing
                            ? "🔄 Processing audio..."
                            : (selectedQuestion.evaluation_type || 'star') === 'star'
                              ? "Type your answer here... Remember to use the STAR method:\n- Situation: Set the context\n- Task: What needed to be done\n- Action: What you specifically did\n- Result: The outcome and what you learned"
                              : selectedQuestion.evaluation_type === 'custom'
                                ? "Type your answer here... Make sure to address all aspects mentioned in the custom evaluation criteria below."
                                : "Type your answer here... Focus on providing a clear, detailed response with specific examples and outcomes."
                      }
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className={`min-h-[300px] ${hasNativeSupport ? "pr-10" : ""}`}
                    />
                    {hasNativeSupport && (
                      <button
                        type="button"
                        onClick={toggleMicrophone}
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
                    onClick={handleSubmitAnswer}
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
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                    value={editQuestionText}
                    onChange={(e) => setEditQuestionText(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <Label>Categories *</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant={editSelectedCategories.includes(cat as BehavioralQuestionCategory) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleCategory(cat as BehavioralQuestionCategory)}
                      >
                        {cat.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                  {editSelectedCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">Select at least one category</p>
                  )}
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <Label htmlFor="edit-difficulty">Difficulty</Label>
                  <Select value={editDifficulty} onValueChange={(value) => setEditDifficulty(value as QuestionDifficulty)}>
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
                  <RadioGroup value={editEvaluationType} onValueChange={(value) => setEditEvaluationType(value as EvaluationType)}>
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

                  {editEvaluationType === "custom" && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="edit-custom-prompt">Custom Evaluation Prompt *</Label>
                        <span className="text-sm text-muted-foreground">
                          {getWordCount(editCustomPrompt)} / 500 words
                        </span>
                      </div>
                      <Textarea
                        id="edit-custom-prompt"
                        placeholder="e.g., Evaluate the answer based on: 1) Technical depth, 2) Problem-solving approach, 3) Impact on the team..."
                        value={editCustomPrompt}
                        onChange={(e) => setEditCustomPrompt(e.target.value)}
                        rows={6}
                        className={getWordCount(editCustomPrompt) > 500 ? "border-destructive" : ""}
                      />
                      <p className="text-sm text-muted-foreground">
                        Define how the AI should evaluate answers to this question (max 500 words)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseEditDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitEdit} disabled={customLoading}>
                  Update Question
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default BehavioralPractice;

