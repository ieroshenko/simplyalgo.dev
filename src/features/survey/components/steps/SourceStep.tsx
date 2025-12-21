import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const SourceStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "📷 Instagram",
    "💼 LinkedIn",
    "🔴 Reddit",
    "🟠 Hacker News",
    "📺 Youtube"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="Where did you hear about us?"
      options={options}
    />
  );
};
