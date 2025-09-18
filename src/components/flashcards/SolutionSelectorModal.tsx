import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Star, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Solution {
  id: string;
  title: string;
  code: string;
  time_complexity?: string;
  space_complexity?: string;
  explanation?: string;
  approach_type?: string;
  is_preferred?: boolean;
  difficulty_rating?: number;
}

interface SolutionSelectorModalProps {
  solutions: Solution[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (solutionId: string) => void;
  problemTitle: string;
}

export const SolutionSelectorModal = ({
  solutions,
  isOpen,
  onClose,
  onSelect,
  problemTitle,
}: SolutionSelectorModalProps) => {
  const getApproachColor = (approach?: string) => {
    switch (approach) {
      case "optimal":
        return "bg-green-100 text-green-800";
      case "brute_force":
        return "bg-orange-100 text-orange-800";
      case "dp":
        return "bg-blue-100 text-blue-800";
      case "two_pointer":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Choose Solution to Study
          </DialogTitle>
          <DialogDescription>
            Select which solution approach you'd like to add to your flashcard deck for{" "}
            <span className="font-medium">{problemTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {solutions.map((solution, index) => (
            <div
              key={solution.id}
              className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">
                      {solution.title || `Solution ${index + 1}`}
                    </h3>
                    {solution.is_preferred && (
                      <Badge variant="default" className="text-xs">
                        Preferred
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {solution.approach_type && (
                      <Badge
                        variant="secondary"
                        className={`${getApproachColor(solution.approach_type)} text-xs`}
                      >
                        {solution.approach_type.replace("_", " ")}
                      </Badge>
                    )}
                    
                    {solution.time_complexity && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{solution.time_complexity}</span>
                      </div>
                    )}
                    
                    {solution.space_complexity && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span>{solution.space_complexity}</span>
                      </div>
                    )}
                    
                    {getDifficultyStars(solution.difficulty_rating)}
                  </div>
                </div>

                <Button
                  onClick={() => onSelect(solution.id)}
                  size="sm"
                  variant="outline"
                >
                  Select This Solution
                </Button>
              </div>

              {solution.explanation && (
                <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded">
                  <p className="line-clamp-2">{solution.explanation}</p>
                </div>
              )}

              {/* Full code with syntax highlighting */}
              <div className="mt-3 rounded overflow-hidden border">
                <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground border-b">
                  Full Code Preview
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <SyntaxHighlighter
                    language="python"
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      fontSize: '12px',
                      background: 'transparent',
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                      }
                    }}
                  >
                    {solution.code}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};