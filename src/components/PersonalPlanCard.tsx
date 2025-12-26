import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PersonalPlanCardProps {
  surveyData?: { [key: number]: string };
  onUpdatePlan?: () => void;
}

export const PersonalPlanCard: React.FC<PersonalPlanCardProps> = ({
  surveyData,
  onUpdatePlan
}) => {
  // Get user's answers from the survey data
  const userGoal = surveyData?.[9] || "Land a role at Big Tech";
  const userCommitment = surveyData?.[15] || "3 session(s) per week";
  const userFocusAreas = surveyData?.[14] ?
    (surveyData[14] === "Both" ? "Assessments & Interviews" : surveyData[14])
    : "INTERVIEW";

  if (!surveyData || Object.keys(surveyData).length === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              System Config
            </h3>
            {onUpdatePlan && (
              <button
                onClick={onUpdatePlan}
                className="text-xs font-medium text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Goal</span>
              <span className="text-sm font-semibold text-foreground text-right">{userGoal}</span>
            </div>
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commitment</span>
              <span className="text-sm font-semibold text-foreground text-right">{userCommitment}</span>
            </div>
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Focus</span>
              <span className="text-sm font-semibold text-foreground text-right">{userFocusAreas}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
