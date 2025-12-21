import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Trophy, TrendingUp, MessageSquare, Code, AlertCircle } from "lucide-react";
import { TechnicalInterviewService } from "@/features/technical-interview/services/technicalInterviewService";
import type { TechnicalInterviewFeedback, TechnicalInterviewSession } from "@/features/technical-interview/services/technicalInterviewService";
import { logger } from "@/utils/logger";
import LoadingSpinner from "@/components/LoadingSpinner";

interface InterviewFeedbackProps {
  sessionId: string;
  onClose: () => void;
}

const InterviewFeedback = ({ sessionId, onClose }: InterviewFeedbackProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<TechnicalInterviewSession | null>(null);
  const [feedback, setFeedback] = useState<TechnicalInterviewFeedback | null>(null);
  const [testResults, setTestResults] = useState<Array<{ id: string; passed: boolean; test_case_number: number }>>([]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch session details
        const sessionData = await TechnicalInterviewService.getSession(sessionId);
        setSession(sessionData);

        // Fetch feedback
        const feedbackData = await TechnicalInterviewService.getFeedback(sessionId);
        setFeedback(feedbackData);

        // Fetch test results
        const testResultsData = await TechnicalInterviewService.getTestResults(sessionId);
        setTestResults(testResultsData || []);
      } catch (err) {
        logger.error("Error fetching interview feedback", err, {
          component: "InterviewFeedback",
          sessionId,
        });
        setError("Failed to load interview feedback");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [sessionId]);

  if (loading) {
    return <LoadingSpinner message="Loading interview feedback..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Session not found</AlertDescription>
      </Alert>
    );
  }

  const passed = session.passed ?? false;
  const overallScore = session.overall_score ?? 0;
  const problemSolvingScore = feedback?.problem_solving_score || 0;
  const codeQualityScore = feedback?.code_quality_score || 0;
  const communicationScore = feedback?.communication_score || 0;
  const strengths = feedback?.strengths || [];
  const improvements = feedback?.areas_for_improvement || [];
  const detailedFeedback = feedback?.detailed_feedback || "Feedback is being generated...";
  const interviewerNotes = feedback?.interviewer_notes || "";

  const passedTestsCount = testResults.filter(t => t.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="space-y-6">
      {/* Header with Pass/Fail */}
      <Card className={passed ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-red-500 bg-red-50 dark:bg-red-900/10"}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {passed ? (
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              )}
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {passed ? "Passed" : "Not Passed"}
                </h2>
                <p className="text-muted-foreground">
                  {session.duration_seconds
                    ? `Interview Duration: ${Math.floor(session.duration_seconds / 60)} minutes`
                    : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-foreground">{overallScore}</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Problem Solving</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{problemSolvingScore}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Code Quality</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{codeQualityScore}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Communication</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{communicationScore}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={passedTestsCount === totalTests ? "default" : "destructive"}>
                {passedTestsCount} / {totalTests} tests passed
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {testResults.map((result, idx) => (
                <div
                  key={result.id}
                  className={`p-3 rounded-md border ${
                    result.passed
                      ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                      : "border-red-300 bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">Test Case {result.test_case_number}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((strength: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-600 dark:text-amber-400">Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {improvements.map((improvement: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap leading-relaxed">{detailedFeedback}</p>
        </CardContent>
      </Card>

      {/* Interviewer Notes */}
      {interviewerNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Interviewer Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed italic">
              {interviewerNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button size="lg" onClick={onClose}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default InterviewFeedback;

