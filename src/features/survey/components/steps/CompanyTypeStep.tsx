import React from 'react';
import { Building2, Building, Rocket, Lightbulb } from 'lucide-react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const CompanyTypeStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    { label: "FAANG", icon: <Building2 className="w-5 h-5" /> },
    { label: "Big-medium sized", icon: <Building className="w-5 h-5" /> },
    { label: "Growth-stage startup", icon: <Rocket className="w-5 h-5" /> },
    { label: "Early-stage startup", icon: <Lightbulb className="w-5 h-5" /> }
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What type of company are you targeting?"
      options={options}
    />
  );
};
