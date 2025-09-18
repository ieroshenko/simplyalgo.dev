import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const BottlenecksStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "Overthinking",
    "Can't remember solutions",
    "Time pressure",
    "Poor code structure",
    "Lack of feedback"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What's your biggest bottleneck with coding challenges?"
      options={options}
    />
  );
};
