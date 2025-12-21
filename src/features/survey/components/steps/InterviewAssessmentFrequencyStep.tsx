import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const InterviewAssessmentFrequencyStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "Often",
    "Somewhat often",
    "None"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="How often do you get interviews/assessments?"
      options={options}
    />
  );
};
