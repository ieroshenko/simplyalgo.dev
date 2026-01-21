import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const PlatformExperienceStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    { label: "Yes", icon: <ThumbsUp className="w-5 h-5" /> },
    { label: "No", icon: <ThumbsDown className="w-5 h-5" /> }
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="Have you used a coding prep platform before?"
      options={options}
    />
  );
};
