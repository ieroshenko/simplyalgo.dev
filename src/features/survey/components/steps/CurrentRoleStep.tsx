import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const CurrentRoleStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "🧑‍🎓 Student / Recent grad",
    "⌨️ Junior engineer",
    "⌨️⌨️ Mid-level engineer",
    "⌨️⌨️⌨️ Senior engineer"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What is your current role?"
      options={options}
    />
  );
};
