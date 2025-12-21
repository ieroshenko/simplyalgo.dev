import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const FrustrationsStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "24/7 grind",
    "Forgetting solutions quickly",
    "Getting stuck on problems",
    "Lack of feedback"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What's the most frustrating part of practicing coding interviews?"
      options={options}
    />
  );
};
