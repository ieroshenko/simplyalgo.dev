import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ResumeUpload from "@/components/behavioral/ResumeUpload";
import VoiceSelector from "@/components/behavioral/VoiceSelector";
import AudioWaveform from "@/components/behavioral/AudioWaveform";
import InterviewControls from "@/components/behavioral/InterviewControls";
import InterviewFeedback from "@/components/behavioral/InterviewFeedback";
import { useRealtimeInterview } from "@/hooks/useRealtimeInterview";
import { useInterviewSession } from "@/hooks/useInterviewSession";

const BehavioralInterview = () => {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<string>("alloy");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [showFeedback, setShowFeedback] = useState(false);
  const interviewStartTimeRef = useRef<Date | null>(null);

  const {
    sessionId,
    createSession,
    endSession,
    addTranscript,
    error: sessionError,
  } = useInterviewSession();

  const { startInterview, stopInterview, audioAnalyser, error } = useRealtimeInterview({
    resumeText,
    voice: selectedVoice,
    onConnectionStatusChange: setConnectionStatus,
    onTranscript: (role, content) => {
      // Save transcripts to database
      console.log(`💾 [BehavioralInterview] Saving ${role} transcript to database:`, content);
      addTranscript(role, content);
    },
  });

  const handleStartInterview = async () => {
    if (!resumeText) {
      alert("Please upload your resume before starting the interview.");
      return;
    }

    try {
      // Create session in database
      await createSession(resumeText, selectedVoice);
      interviewStartTimeRef.current = new Date();

      setIsInterviewActive(true);
      await startInterview();
    } catch (err) {
      console.error("Failed to start interview:", err);
      alert("Failed to start interview. Please try again.");
    }
  };

  const handleStopInterview = async () => {
    setIsInterviewActive(false);
    stopInterview();

    // Calculate duration and end session
    if (interviewStartTimeRef.current) {
      const duration = Math.floor(
        (new Date().getTime() - interviewStartTimeRef.current.getTime()) / 1000
      );
      await endSession(duration);
      interviewStartTimeRef.current = null;

      // Show feedback after interview ends
      setShowFeedback(true);
    }
  };

  // Auto-stop if error occurs
  useEffect(() => {
    if ((error || sessionError) && isInterviewActive) {
      handleStopInterview();
    }
  }, [error, sessionError, isInterviewActive]);

  // Show feedback view if interview ended
  if (showFeedback && sessionId) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Interview Feedback
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Review your interview performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <InterviewFeedback
              sessionId={sessionId}
              onClose={() => {
                setShowFeedback(false);
                setResumeText("");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Behavioral Interview Practice
                </h1>
                <p className="text-sm text-muted-foreground">
                  Practice behavioral interviews with AI coach
                </p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-green-500" :
                connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                "bg-gray-400"
              }`} />
              <span className="text-sm text-muted-foreground">
                {connectionStatus === "connected" ? "Connected" :
                 connectionStatus === "connecting" ? "Connecting..." :
                 "Not Connected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Error Display */}
          {(error || sessionError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || sessionError}</AlertDescription>
            </Alert>
          )}

          {/* Setup Section - Only visible when interview is not active */}
          {!isInterviewActive && (
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Setup Your Interview</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload your resume and select a voice for the AI interviewer before starting.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Resume Upload */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Resume</h3>
                    <ResumeUpload
                      onResumeExtracted={setResumeText}
                      disabled={isInterviewActive}
                    />
                  </div>

                  {/* Voice Selection */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Interviewer Voice</h3>
                    <VoiceSelector
                      value={selectedVoice}
                      onChange={setSelectedVoice}
                      disabled={isInterviewActive}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Waveform Visualization - Center Stage */}
          <Card className="p-8">
            <AudioWaveform
              isActive={isInterviewActive}
              connectionStatus={connectionStatus}
              audioAnalyser={audioAnalyser || undefined}
            />
          </Card>

          {/* Interview Controls */}
          <InterviewControls
            isInterviewActive={isInterviewActive}
            onStart={handleStartInterview}
            onStop={handleStopInterview}
            resumeUploaded={!!resumeText}
          />

          {/* Instructions */}
          {!isInterviewActive && (
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-3">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Upload your resume (PDF or DOCX format)</li>
                <li>Select your preferred interviewer voice</li>
                <li>Click "Start Interview" and allow microphone access</li>
                <li>The AI will ask about your experience and behavioral questions</li>
                <li>Speak naturally - the AI will detect when you're done talking</li>
                <li>Interview will last up to 30 minutes</li>
                <li>You can stop the interview at any time</li>
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BehavioralInterview;
