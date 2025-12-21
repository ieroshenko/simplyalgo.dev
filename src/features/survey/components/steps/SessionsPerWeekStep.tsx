import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const SessionsPerWeekStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "1 - 2 sessions per week",
    "2 – 3 sessions per week",
    "4 – 5 sessions per week",
    "Daily",
    "Not looking for strict structure"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="How many sessions per week would you like to commit to?"
      options={options}
    />
  );
};
