import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, X } from "lucide-react";
import confetti from "canvas-confetti";
import type { DesignEvaluation } from "@/types";

interface EvaluationDisplayProps {
  evaluation: DesignEvaluation;
  onClose: () => void;
}

const EvaluationDisplay = ({ evaluation, onClose }: EvaluationDisplayProps) => {
  const isSolved = evaluation.score >= 75;

  // Trigger confetti when solved state changes
  useEffect(() => {
    if (!isSolved) return;
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [isSolved]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return "bg-emerald-100 dark:bg-emerald-900";
    if (score >= 50) return "bg-amber-100 dark:bg-amber-900";
    return "bg-red-100 dark:bg-red-900";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Design Evaluation
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Score Display */}
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(
                evaluation.score,
              )} mb-4`}
            >
              <span
                className={`text-4xl font-bold ${getScoreColor(
                  evaluation.score,
                )}`}
              >
                {evaluation.score}
              </span>
            </div>
            {isSolved && (
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <Trophy className="w-5 h-5" />
                <span className="font-semibold">Solved!</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
          </div>

          {/* Strengths */}
          {evaluation.strengths.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">
                Strengths
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {evaluation.strengths.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {evaluation.weaknesses.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">
                Weaknesses
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {evaluation.weaknesses.map((weakness, idx) => (
                  <li key={idx}>{weakness}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement Suggestions */}
          {evaluation.improvement_suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">
                Improvement Suggestions
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {evaluation.improvement_suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EvaluationDisplay;
