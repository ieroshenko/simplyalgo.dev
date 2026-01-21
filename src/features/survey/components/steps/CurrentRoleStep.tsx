import React from 'react';
import { GraduationCap, Code2, Layers, Terminal } from 'lucide-react';
import { BaseSurveyStep } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const CurrentRoleStep: React.FC<SurveyStepProps> = (props) => {
  const options = [
    { label: "Student / Recent grad", icon: <GraduationCap className="w-5 h-5" /> },
    { label: "Junior engineer", icon: <Code2 className="w-5 h-5" /> },
    { label: "Mid-level engineer", icon: <Layers className="w-5 h-5" /> },
    { label: "Senior engineer", icon: <Terminal className="w-5 h-5" /> }
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="What is your current role?"
      options={options}
    />
  );
};
