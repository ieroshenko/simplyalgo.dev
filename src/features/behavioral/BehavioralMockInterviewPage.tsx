import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { logger } from "@/utils/logger";
import { useTrackFeatureTime, Features } from "@/hooks/useFeatureTracking";
import { trackEvent, AnalyticsEvents } from "@/services/analytics";
import { getErrorMessage } from "@/utils/uiUtils";

// Step components
import { ResumeStep } from "./components/mock-interview/ResumeStep";
import { DetailsStep } from "./components/mock-interview/DetailsStep";
import { QuestionStep } from "./components/mock-interview/QuestionStep";
import { FeedbackStep } from "./components/mock-interview/FeedbackStep";

// Types
import type { InterviewState } from "./types/mockInterviewTypes";

const BehavioralMockInterview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Track mock interview feature usage
  useTrackFeatureTime(Features.MOCK_INTERVIEW);

  const [state, setState] = useState<InterviewState>({
    step: 'resume',
    resumeText: '',
    role: '',
    company: '',
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    feedbacks: {},
    mockInterviewId: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

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
      setState(prev => ({
        ...prev,
        answers: {
          ...prev.answers,
          [prev.currentQuestionIndex]: (prev.answers[prev.currentQuestionIndex] || '') + (prev.answers[prev.currentQuestionIndex] ? ' ' : '') + transcript,
        },
      }));
    },
    onError: (error) => {
      logger.error('[BehavioralMockInterview] Speech recognition error', { error });
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

  // Load resume from localStorage if available
  useEffect(() => {
    const savedResume = localStorage.getItem('behavioral_mock_interview_resume');
    if (savedResume) {
      setState(prev => ({ ...prev, resumeText: savedResume }));
    }
  }, []);

  const handleContinueFromResume = () => {
    if (!state.resumeText.trim()) {
      toast({
        title: "Resume required",
        description: "Please upload your resume to continue",
        variant: "destructive",
      });
      return;
    }
    setState(prev => ({ ...prev, step: 'details' }));
  };

  const handleStartInterview = async () => {
    if (!state.role.trim()) {
      toast({
        title: "Role required",
        description: "Please enter the role you're interviewing for",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      // Track interview started
      trackEvent(AnalyticsEvents.MOCK_INTERVIEW_STARTED, {
        role: state.role,
        company: state.company || 'not specified',
      });

      // Generate questions based on resume, role, and company
      const { data, error } = await supabase.functions.invoke("generate-interview-questions", {
        body: {
          resumeText: state.resumeText,
          role: state.role,
          company: state.company || undefined,
        },
      });

      if (error) throw error;

      if (!data?.questions || data.questions.length !== 4) {
        throw new Error("Failed to generate 4 questions");
      }

      // Create mock interview record
      if (!user?.id) throw new Error("User not authenticated");

      const { data: mockInterviewData, error: mockInterviewError } = await supabase
        .from("mock_interviews")
        .insert({
          user_id: user.id,
          resume_text: state.resumeText,
          role: state.role,
          company: state.company || null,
        })
        .select()
        .single();

      if (mockInterviewError) throw mockInterviewError;

      setState(prev => ({
        ...prev,
        step: 'questions',
        questions: data.questions,
        currentQuestionIndex: 0,
        mockInterviewId: mockInterviewData.id,
      }));
    } catch (err) {
      logger.error('[BehavioralMockInterview] Error starting interview', { error: err });
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to start interview"),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleNextQuestion = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    }
  };

  const handlePreviousQuestion = () => {
    if (state.currentQuestionIndex > 0) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };

  const handleSubmitAnswer = async () => {
    const currentAnswer = state.answers[state.currentQuestionIndex];
    if (!currentAnswer?.trim() || !state.mockInterviewId || !user?.id) return;

    setIsSubmittingAnswer(true);
    try {
      const currentQuestion = state.questions[state.currentQuestionIndex];

      // Call edge function to evaluate answer
      const { data, error } = await supabase.functions.invoke("evaluate-behavioral-answer", {
        body: {
          question: currentQuestion.question_text,
          answer: currentAnswer,
          category: currentQuestion.category,
          difficulty: currentQuestion.difficulty,
        },
      });

      if (error) throw error;

      // Save answer to database
      await supabase.from("mock_interview_answers").insert({
        mock_interview_id: state.mockInterviewId,
        question_text: currentQuestion.question_text,
        answer_text: currentAnswer,
        feedback: data.feedback,
        star_score: data.star_score,
        content_score: data.content_score,
        delivery_score: data.delivery_score,
        overall_score: data.overall_score,
        user_id: user.id,
      });

      // Store feedback in state
      setState(prev => ({
        ...prev,
        feedbacks: {
          ...prev.feedbacks,
          [prev.currentQuestionIndex]: data,
        },
      }));

      // If this was the last question, move to feedback step
      if (state.currentQuestionIndex === state.questions.length - 1) {
        setState(prev => ({ ...prev, step: 'feedback' }));

        // Track interview completed
        trackEvent(AnalyticsEvents.MOCK_INTERVIEW_COMPLETED, {
          role: state.role,
          questionsAnswered: Object.keys(state.answers).length + 1,
        });
      } else {
        // Move to next question
        handleNextQuestion();
      }
    } catch (err) {
      logger.error('[BehavioralMockInterview] Error submitting answer', { error: err });
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to submit answer"),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleTryAgain = () => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentQuestionIndex]: '' },
      feedbacks: Object.fromEntries(
        Object.entries(prev.feedbacks).filter(([k]) => k !== String(prev.currentQuestionIndex))
      ),
    }));
  };

  const handleStartNew = () => {
    setState({
      step: 'resume',
      resumeText: state.resumeText,
      role: '',
      company: '',
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      feedbacks: {},
      mockInterviewId: null,
    });
  };

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const currentAnswer = state.answers[state.currentQuestionIndex] || '';
  const currentFeedback = state.feedbacks[state.currentQuestionIndex];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/behavioral")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Mock Behavioral Interview</h1>
                <p className="text-muted-foreground mt-2">
                  Practice with AI-generated questions tailored to your resume and target role
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Resume Upload */}
          {state.step === 'resume' && (
            <ResumeStep
              state={state}
              setState={setState}
              onNext={handleContinueFromResume}
            />
          )}

          {/* Step 2: Role and Company */}
          {state.step === 'details' && (
            <DetailsStep
              state={state}
              setState={setState}
              onStartInterview={handleStartInterview}
              isGeneratingQuestions={isGeneratingQuestions}
            />
          )}

          {/* Step 3: Questions */}
          {state.step === 'questions' && currentQuestion && (
            <QuestionStep
              state={state}
              setState={setState}
              currentQuestion={currentQuestion}
              currentAnswer={currentAnswer}
              currentFeedback={currentFeedback}
              isSubmittingAnswer={isSubmittingAnswer}
              onSubmitAnswer={handleSubmitAnswer}
              onPreviousQuestion={handlePreviousQuestion}
              onNextQuestion={handleNextQuestion}
              onTryAgain={handleTryAgain}
              isListening={isListening}
              isProcessing={isProcessing}
              hasNativeSupport={hasNativeSupport}
              speechError={speechError}
              toggleMicrophone={toggleMicrophone}
            />
          )}

          {/* Step 4: Feedback Summary */}
          {state.step === 'feedback' && (
            <FeedbackStep
              state={state}
              setState={setState}
              onStartNew={handleStartNew}
              onBackToHub={() => navigate("/behavioral")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BehavioralMockInterview;
