import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const FocusAreasStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "Assessment",
    "Interview",
    "Both"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="Which area(s) do you want to focus on?"
      options={options}
    />
  );
};
