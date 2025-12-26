import { Button } from "@/components/ui/button";
import { DIFFICULTY_OPTIONS } from "./types";

interface RatingPanelProps {
    onRatingSelect: (rating: number) => void;
    isSubmitting: boolean;
}

export const RatingPanel = ({
    onRatingSelect,
    isSubmitting,
}: RatingPanelProps) => {
    return (
        <div className="flex-1 p-6">
            <div className="space-y-6">
                <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">How well did you remember this solution?</h3>
                    <p className="text-muted-foreground">
                        Rate your overall recall of the technique, data structures, and complexity.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {DIFFICULTY_OPTIONS.map((option) => (
                        <Button
                            key={option.value}
                            variant="outline"
                            onClick={() => onRatingSelect(option.value)}
                            disabled={isSubmitting}
                            className={`h-auto p-4 text-left flex flex-col items-start justify-start hover:${option.color.replace('bg-', 'bg-').replace('500', '50')} hover:border-${option.color.replace('bg-', '').replace('500', '300')}`}
                        >
                            <div className="w-full">
                                <div className="font-medium text-sm mb-1">{option.label}</div>
                                <div className="text-xs text-muted-foreground leading-tight">
                                    {option.description}
                                </div>
                            </div>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};
