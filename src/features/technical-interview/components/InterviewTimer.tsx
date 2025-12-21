import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewTimerProps {
  timeRemaining: number; // in seconds
  isActive: boolean;
}

export const InterviewTimer = ({ timeRemaining, isActive }: InterviewTimerProps) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const isLowTime = timeRemaining <= 5 * 60; // Last 5 minutes
  const isVeryLowTime = timeRemaining <= 2 * 60; // Last 2 minutes
  const isTimeUp = timeRemaining === 0;

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold transition-all",
        isTimeUp
          ? "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300 animate-pulse"
          : isVeryLowTime
          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          : isLowTime
          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
      )}
    >
      <Clock className="w-5 h-5" />
      <span>{formatTime(minutes, seconds)}</span>
      {isTimeUp && <span className="text-sm font-normal ml-2">Time's Up!</span>}
    </div>
  );
};

