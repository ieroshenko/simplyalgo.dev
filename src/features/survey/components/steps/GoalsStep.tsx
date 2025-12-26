import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const GoalsStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "Land my first software job",
    "Get into Big Tech",
    "Improve interview confidence",
    "Write cleaner, more structured code",
    "Become a better engineer overall"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What's your biggest goal right now?"
      options={options}
    />
  );
};
