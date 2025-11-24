import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, CheckCircle2, Mic, MicOff } from "lucide-react";
import ResumeUpload from "@/components/behavioral/ResumeUpload";
import { FeedbackViews } from "@/components/behavioral/FeedbackViews";
import { Badge } from "@/components/ui/badge";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface GeneratedQuestion {
  question_text: string;
  category: string[];
  difficulty: string;
  rationale: string;
}

interface InterviewState {
  step: 'resume' | 'details' | 'questions' | 'feedback';
  resumeText: string;
  role: string;
  company: string;
  questions: GeneratedQuestion[];
  currentQuestionIndex: number;
  answers: Record<number, string>;
  feedbacks: Record<number, any>;
  mockInterviewId: string | null;
}

const BehavioralMockInterview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

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
      console.error("Speech recognition error:", error);
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

  const handleResumeExtracted = (text: string) => {
    setState(prev => ({ ...prev, resumeText: text }));
    localStorage.setItem('behavioral_mock_interview_resume', text);
  };

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
      console.error("Error starting interview:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start interview",
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
    const currentAnswer = state.answers[state.currentQuestionIndex] || '';
    if (!currentAnswer.trim()) {
      toast({
        title: "Answer required",
        description: "Please enter your answer before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      const currentQuestion = state.questions[state.currentQuestionIndex];
      
      // Submit answer to database
      if (!state.mockInterviewId || !user?.id) throw new Error("Mock interview not initialized");

      const { data: answerData, error: answerError } = await supabase
        .from("mock_interview_answers")
        .insert({
          mock_interview_id: state.mockInterviewId,
          question_text: currentQuestion.question_text,
          question_category: currentQuestion.category,
          question_difficulty: currentQuestion.difficulty,
          answer_text: currentAnswer,
          content_score: 0,
          delivery_score: 0,
          overall_score: 0,
          feedback: {},
        })
        .select()
        .single();

      if (answerError) throw answerError;

      // Get feedback from AI
      const { data: feedbackData, error: feedbackError } = await supabase.functions.invoke(
        "behavioral-interview-feedback",
        {
          body: {
            question: currentQuestion.question_text,
            answer: currentAnswer,
            evaluationType: 'star',
          },
        }
      );

      if (feedbackError) throw feedbackError;

      // Update answer with feedback
      await supabase
        .from("mock_interview_answers")
        .update({
          star_score: feedbackData.star_score,
          content_score: feedbackData.content_score,
          delivery_score: feedbackData.delivery_score,
          overall_score: feedbackData.overall_score,
          feedback: feedbackData.feedback,
        })
        .eq("id", answerData.id);

      // Store feedback in state
      setState(prev => ({
        ...prev,
        feedbacks: {
          ...prev.feedbacks,
          [prev.currentQuestionIndex]: feedbackData,
        },
      }));

      // Move to next question or finish
      if (state.currentQuestionIndex < state.questions.length - 1) {
        handleNextQuestion();
      } else {
        // All questions answered, mark interview as completed and show summary
        if (state.mockInterviewId) {
          await supabase
            .from("mock_interviews")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", state.mockInterviewId);
        }
        setState(prev => ({ ...prev, step: 'feedback' }));
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit answer",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAnswer(false);
    }
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
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Upload Your Resume</CardTitle>
                <CardDescription>
                  Upload your resume so we can generate personalized interview questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResumeUpload onResumeExtracted={handleResumeExtracted} />
                {state.resumeText && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Resume loaded from previous session. You can upload a different one if needed.</span>
                  </div>
                )}
                <Button
                  onClick={handleContinueFromResume}
                  disabled={!state.resumeText.trim()}
                  className="w-full"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Role and Company */}
          {state.step === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Interview Details</CardTitle>
                <CardDescription>
                  Tell us about the role and company you're interviewing with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Senior Software Engineer, Product Manager, etc."
                    value={state.role}
                    onChange={(e) => setState(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input
                    id="company"
                    placeholder='e.g., Google, or "growth-stage tech startup that does xyz"'
                    value={state.company}
                    onChange={(e) => setState(prev => ({ ...prev, company: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can enter a specific company name or describe the type of company
                  </p>
                </div>
                <Button
                  onClick={handleStartInterview}
                  disabled={!state.role.trim() || isGeneratingQuestions}
                  className="w-full"
                >
                  {isGeneratingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    "Start Interview"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Questions */}
          {state.step === 'questions' && currentQuestion && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        Question {state.currentQuestionIndex + 1} of {state.questions.length}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {currentQuestion.rationale}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentQuestion.category.map((cat) => (
                          <Badge key={cat} variant="secondary">
                            {cat.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        <Badge variant="outline">{currentQuestion.difficulty}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousQuestion}
                        disabled={state.currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextQuestion}
                        disabled={state.currentQuestionIndex === state.questions.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-lg font-medium">{currentQuestion.question_text}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="answer">Your Answer</Label>
                      <div className="relative">
                        <Textarea
                          id="answer"
                          placeholder={
                            isListening
                              ? "🎤 Listening... Speak your answer."
                              : isProcessing
                                ? "🔄 Processing audio..."
                                : "Type your answer here. Use the STAR method (Situation, Task, Action, Result) to structure your response."
                          }
                          value={currentAnswer}
                          onChange={(e) =>
                            setState(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [prev.currentQuestionIndex]: e.target.value },
                            }))
                          }
                          className={`min-h-[300px] ${hasNativeSupport ? "pr-10" : ""}`}
                        />
                        {hasNativeSupport && (
                          <button
                            type="button"
                            onClick={toggleMicrophone}
                            disabled={isSubmittingAnswer}
                            className={`absolute right-2 top-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${
                              isListening
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
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!currentAnswer.trim() || isSubmittingAnswer}
                        className="flex-1"
                      >
                        {isSubmittingAnswer ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Getting Feedback...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {state.currentQuestionIndex === state.questions.length - 1
                              ? "Submit & Finish"
                              : "Submit & Next"}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Show feedback if available */}
                    {currentFeedback && (
                      <div className="mt-4">
                        <FeedbackViews
                          feedback={currentFeedback}
                          evaluationType="star"
                          onTryAgain={() => {
                            setState(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [prev.currentQuestionIndex]: '' },
                              feedbacks: Object.fromEntries(
                                Object.entries(prev.feedbacks).filter(([k]) => k !== String(prev.currentQuestionIndex))
                              ),
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Progress indicator */}
              <div className="flex gap-2 mt-4">
                {state.questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-2 rounded ${
                      idx === state.currentQuestionIndex || state.answers[idx]?.trim()
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Step 4: Feedback Summary */}
          {state.step === 'feedback' && (
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
                  <Button
                    variant="outline"
                    onClick={() => {
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
                    }}
                  >
                    Start New Interview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/behavioral")}
                  >
                    Back to Behavioral Hub
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BehavioralMockInterview;

