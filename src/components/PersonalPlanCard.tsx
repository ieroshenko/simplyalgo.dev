import React from 'react';
import { Target, Calendar, Clover, Edit3, Sparkles } from 'lucide-react';
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
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-lg font-semibold bg-clip-text">
              Your Personal Plan
            </CardTitle>
          </div>
          {onUpdatePlan && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onUpdatePlan}
              className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Update
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Your Goal */}
        <div className="group">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-muted-foreground mb-2 sm:mb-0 sm:inline sm:mr-3">Goal:</span>
              <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-800 dark:text-red-200 px-4 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800/50 leading-tight shadow-sm">
                {userGoal}
              </div>
            </div>
          </div>
        </div>

        {/* Commitment */}
        <div className="group">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-muted-foreground mb-2 sm:mb-0 sm:inline sm:mr-3">Commitment:</span>
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-xl text-sm border border-amber-200 dark:border-amber-800/50 shadow-sm">
                {userCommitment}
              </div>
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="group">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <Clover className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-muted-foreground mb-2">Focus Areas:</span>
              <div className="flex gap-2 flex-wrap">
                {userFocusAreas.map((area, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-800 dark:text-green-200 px-3 py-2 rounded-xl text-sm border border-green-200 dark:border-green-800/50 shadow-sm transition-shadow"
                  >
                    {area}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
