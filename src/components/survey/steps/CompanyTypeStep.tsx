import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const CompanyTypeStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "🏙️ FAANG",
    "🏗️ Big-medium sized",
    "🚀 Growth-stage startup",
    "💡 Early-stage startup"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What company-type would you like to work in?"
      options={options}
    />
  );
};
