import { Button } from "@/components/ui/button";
import { Play, Square, CheckCircle } from "lucide-react";

interface InterviewControlsProps {
  isInterviewActive: boolean;
  onStart: () => void;
  onStop: () => void;
  onEvaluate?: () => void;
  disabled?: boolean;
}

const InterviewControls = ({
  isInterviewActive,
  onStart,
  onStop,
  onEvaluate,
  disabled = false,
}: InterviewControlsProps) => {
  return (
    <div className="flex items-center justify-center gap-4">
      {!isInterviewActive ? (
        <Button
          size="lg"
          onClick={onStart}
          disabled={disabled}
          className="min-w-[200px] h-12 text-lg font-semibold"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Interview
        </Button>
      ) : (
        <>
          {onEvaluate && (
            <Button
              size="lg"
              variant="default"
              onClick={onEvaluate}
              className="min-w-[180px] h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Evaluate Now
            </Button>
          )}
          <Button
            size="lg"
            variant="destructive"
            onClick={onStop}
            className="min-w-[180px] h-12 text-lg font-semibold"
          >
            <Square className="w-5 h-5 mr-2" />
            End Interview
          </Button>
        </>
      )}
    </div>
  );
};

export default InterviewControls;

