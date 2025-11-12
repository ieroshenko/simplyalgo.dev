import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, TrendingUp, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackData {
  overall_score: number;
  communication_score: number;
  technical_competence_score: number;
  problem_solving_score: number;
  teamwork_score: number;
  strengths: string[];
  areas_for_improvement: string[];
  detailed_feedback: string;
  recommendations: string[];
}

interface InterviewFeedbackProps {
  sessionId: string;
  onClose?: () => void;
}

const InterviewFeedback = ({ sessionId, onClose }: InterviewFeedbackProps) => {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("behavioral_interview_feedback")
          .select("*")
          .eq("session_id", sessionId)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            // No feedback found - this is okay, user can generate it
            setFeedback(null);
          } else {
            throw fetchError;
          }
        } else {
          setFeedback(data as FeedbackData);
        }
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
        setError(err instanceof Error ? err.message : "Failed to load feedback");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [sessionId]);

  const handleGenerateFeedback = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke("generate-interview-feedback", {
        body: { sessionId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Feedback was generated and saved, refetch it
      const { data, error: fetchError } = await supabase
        .from("behavioral_interview_feedback")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (fetchError) throw fetchError;
      setFeedback(data as FeedbackData);
    } catch (err) {
      console.error("Failed to generate feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to generate feedback");
    } finally {
      setIsGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Improvement";
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading feedback...</p>
        </div>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Generate Interview Feedback</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Get AI-powered analysis of your interview performance with detailed scores and recommendations.
            </p>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleGenerateFeedback}
              disabled={isGenerating}
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Feedback"
              )}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Interview Feedback</h2>
          <div className="flex flex-col items-center gap-2">
            <div className={`text-6xl font-bold ${getScoreColor(feedback.overall_score)}`}>
              {feedback.overall_score}
            </div>
            <div className="text-lg font-medium text-muted-foreground">
              {getScoreLabel(feedback.overall_score)}
            </div>
          </div>
        </div>
      </Card>

      {/* Category Scores */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Scores</h3>
        <div className="space-y-4">
          {[
            { label: "Communication", score: feedback.communication_score },
            { label: "Technical Competence", score: feedback.technical_competence_score },
            { label: "Problem Solving", score: feedback.problem_solving_score },
            { label: "Teamwork", score: feedback.teamwork_score },
          ].map(({ label, score }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{label}</span>
                <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                  {score}/100
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Strengths */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold">Strengths</h3>
        </div>
        <ul className="space-y-2">
          {feedback.strengths.map((strength, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 mt-1">•</span>
              <span className="text-sm">{strength}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Areas for Improvement */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold">Areas for Improvement</h3>
        </div>
        <ul className="space-y-2">
          {feedback.areas_for_improvement.map((area, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
              <span className="text-sm">{area}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Detailed Feedback */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{feedback.detailed_feedback}</p>
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
        <ul className="space-y-2">
          {feedback.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-1">→</span>
              <span className="text-sm">{recommendation}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Actions */}
      {onClose && (
        <div className="flex justify-center">
          <Button onClick={onClose} variant="outline" size="lg">
            Close Feedback
          </Button>
        </div>
      )}
    </div>
  );
};

export default InterviewFeedback;
