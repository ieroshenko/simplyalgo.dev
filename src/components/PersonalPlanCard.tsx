import React from 'react';
import { Target, Calendar, Clover, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PersonalPlanCardProps {
  surveyData?: { [key: number]: string };
  onUpdatePlan?: () => void;
}

export const PersonalPlanCard: React.FC<PersonalPlanCardProps> = ({ 
  surveyData, 
  onUpdatePlan 
}) => {
  // Get user's answers from the survey data
  const userGoal = surveyData?.[9] || "Land a role at Big Tech"; // GoalsStep is step 9
  const userCommitment = surveyData?.[15] || "3 session(s) per week"; // SessionsPerWeekStep is step 15
  const userFocusAreas = surveyData?.[14] ? 
    (surveyData[14] === "Both" ? ["Assessments", "Interviews"] : surveyData[14].split(',').map(area => area.trim())) 
    : ["Dynamic Programming", "Graphs"]; // FocusAreasStep is step 14

  // Don't show the card if no survey data exists
  if (!surveyData || Object.keys(surveyData).length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Your Personal Plan</CardTitle>
          {onUpdatePlan && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onUpdatePlan}
              className="h-8 px-2"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Update
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Goal */}
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Goal:</span>
          <div className="bg-red-50 text-red-800 px-4 py-1 rounded-full text-sm border border-red-200 leading-tight">
            {userGoal}
          </div>
        </div>

        {/* Commitment */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Commitment:</span>
          <div className="bg-amber-50 text-amber-800 px-2 py-1 rounded-full text-sm border border-amber-200">
            {userCommitment}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="flex items-center gap-3">
          <Clover className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Focus:</span>
          <div className="flex gap-1 flex-wrap">
            {userFocusAreas.map((area, index) => (
              <div key={index} className="bg-green-50 text-green-800 px-2 py-1 rounded-full text-sm border border-green-200">
                {area}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
