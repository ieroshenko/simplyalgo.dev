import React from 'react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const PlatformExperienceStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    "👍 Yes",
    "👎 No"
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="Did you try any other interview prep platforms? a.k. Leetcode"
      options={options}
    />
  );
};
