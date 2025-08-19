import React from "react";
import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoachBubbleProps {
  question: string;
  stepNumber: number;
  totalSteps: number;
  isVisible: boolean;
  onClose: () => void;
  onSkipStep?: () => void;
  showSkip?: boolean;
}

const CoachBubble: React.FC<CoachBubbleProps> = ({
  question,
  stepNumber,
  totalSteps,
  isVisible,
  onClose,
  onSkipStep,
  showSkip = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="coach-bubble">
      {/* Header with step info and close button */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm font-medium opacity-90">
          Step {stepNumber} of {totalSteps}
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question content */}
      <div className="text-white leading-relaxed">
        {question}
      </div>

      {/* Actions */}
      {showSkip && onSkipStep && (
        <div className="flex justify-end mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipStep}
            className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-3"
          >
            Skip Step
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Speech bubble arrow */}
      <div className="coach-bubble-arrow" />
    </div>
  );
};

export default CoachBubble;