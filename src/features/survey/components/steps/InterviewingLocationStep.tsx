import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const InterviewingLocationStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "Big Tech (FAANG, etc.)",
    "Mid-sized companies",
    "Startups",
    "All"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="Where are you interviewing?"
      options={options}
    />
  );
};
