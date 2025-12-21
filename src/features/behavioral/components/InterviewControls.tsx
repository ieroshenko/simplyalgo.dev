import { useState, useEffect } from "react";
import { Play, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InterviewControlsProps {
  isInterviewActive: boolean;
  onStart: () => void;
  onStop: () => void;
  resumeUploaded: boolean;
}

const MAX_DURATION = 30 * 60; // 30 minutes in seconds

const InterviewControls = ({
  isInterviewActive,
  onStart,
  onStop,
  resumeUploaded,
}: InterviewControlsProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isInterviewActive) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1;
        if (newTime >= MAX_DURATION) {
          onStop();
          return MAX_DURATION;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInterviewActive, onStop]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timeRemaining = MAX_DURATION - elapsedTime;
  const progressPercentage = (elapsedTime / MAX_DURATION) * 100;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-2xl font-mono font-bold">
                {formatTime(elapsedTime)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(timeRemaining)} remaining
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {isInterviewActive && (
            <div className="hidden md:block w-48">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isInterviewActive ? (
            <Button
              onClick={onStart}
              disabled={!resumeUploaded}
              size="lg"
              className="gap-2"
            >
              <Play className="w-5 h-5" />
              Start Interview
            </Button>
          ) : (
            <Button
              onClick={onStop}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="w-5 h-5" />
              End Interview
            </Button>
          )}
        </div>
      </div>

      {/* Warning when time is running out */}
      {isInterviewActive && timeRemaining <= 5 * 60 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-500">
            {timeRemaining <= 60
              ? "Interview will end in less than a minute!"
              : `Only ${Math.floor(timeRemaining / 60)} minutes remaining`}
          </p>
        </div>
      )}
    </Card>
  );
};

export default InterviewControls;
