import React from 'react';
import { SurveyStepProps } from '@/types/survey';
import { Target, Calendar, Clover, GraduationCap, Blocks, TrendingUp, Wrench } from 'lucide-react';

interface CustomizedResultsStepProps extends SurveyStepProps {
  surveyData?: { [key: number]: string };
}

export const CustomizedResultsStep: React.FC<CustomizedResultsStepProps> = (props) => {
  const { onAnswer, surveyData } = props;

  // Auto-mark as viewed when component mounts
//   React.useEffect(() => {
//     onAnswer("viewed");
//   }, [onAnswer]);

  // Get user's answers from the survey data
  const userGoal = surveyData?.[9] || "Land a role at Big Tech"; // GoalsStep is step 9
  const userCommitment = surveyData?.[15] || "3 session(s) per week"; // SessionsPerWeekStep is step 15
  const userFocusAreas = surveyData?.[14] ? 
    (surveyData[14] === "Both" ? ["Assessments", "Interviews"] : surveyData[14].split(',').map(area => area.trim())) 
    : ["Dynamic Programming", "Graphs"]; // FocusAreasStep is step 14

  const recommendations = [
    {
      icon: <GraduationCap className="w-5 h-5 text-yellow-600" />,
      text: "Use coach mode on harder problems"
    },
    {
      icon: <Blocks className="w-5 h-5 text-amber-700" />,
      text: "Get first-principle hints when stuck"
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-red-600" />,
      text: "Review feedback after each session"
    },
    {
      icon: <Wrench className="w-5 h-5 text-yellow-600" />,
      text: "Focus on writing structured, readable code"
    }
  ];

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          Congratulations your custom plan is ready!
        </h1>
      </div>

      {/* User's Custom Plan */}
      <div className="space-y-4 mb-8">
        {/* Your Goal */}
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-red-600" />
          <span className="text-sm font-medium text-foreground">Your goal:</span>
          <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
            {userGoal}
          </div>
        </div>

        {/* Commitment */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber-700" />
          <span className="text-sm font-medium text-foreground">Commitment:</span>
          <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
            {userCommitment}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="flex items-center gap-3">
          <Clover className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-foreground">Focus areas:</span>
          <div className="flex gap-2">
            {userFocusAreas.map((area, index) => (
              <div key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {area}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to reach your goal */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          How to reach your goal
        </h2>
        
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-center gap-3">
              {rec.icon}
              <span className="text-sm text-gray-300">{rec.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
