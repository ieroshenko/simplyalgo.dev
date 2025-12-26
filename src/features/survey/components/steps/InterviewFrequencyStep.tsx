import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const InterviewFrequencyStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "Daily",
    "A few times a week",
    "Once a week",
    "Rarely",
    "Never / just starting out"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="How often do you solve interview challenges?"
      options={options}
    />
  );
};
