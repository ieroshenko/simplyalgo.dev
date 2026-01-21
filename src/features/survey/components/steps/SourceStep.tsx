import React from 'react';
import { Instagram, Linkedin, MessageSquare, Newspaper, Youtube } from 'lucide-react';
import { BaseSurveyStep, BaseSurveyOption } from '../BaseSurveyStep';
import { SurveyStepProps } from '@/types/survey';

export const SourceStep: React.FC<SurveyStepProps> = (props) => {
  const options: BaseSurveyOption[] = [
    { label: "Instagram", icon: <Instagram className="w-5 h-5" /> },
    { label: "LinkedIn", icon: <Linkedin className="w-5 h-5" /> },
    { label: "Reddit", icon: <MessageSquare className="w-5 h-5" /> },
    { label: "Hacker News", icon: <Newspaper className="w-5 h-5" /> },
    { label: "Youtube", icon: <Youtube className="w-5 h-5" /> }
  ];

  return (
    <BaseSurveyStep
      {...props}
      question="How did you hear about us?"
      options={options}
    />
  );
};
