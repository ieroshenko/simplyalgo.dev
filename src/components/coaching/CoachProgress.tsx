import React from "react";
import { Clock, Target } from "lucide-react";

interface CoachProgressProps {
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  elapsedTime?: string;
  isVisible: boolean;
}

const CoachProgress: React.FC<CoachProgressProps> = ({
  currentStep,
  totalSteps,
  progressPercent,
  elapsedTime,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="coach-progress">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-blue-600" />
        <span className="text-gray-700 dark:text-gray-300">
          {currentStep} / {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="coach-progress-bar">
        <div
          className="coach-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Timer (if provided) */}
      {elapsedTime && (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{elapsedTime}</span>
        </div>
      )}
    </div>
  );
};

export default CoachProgress;