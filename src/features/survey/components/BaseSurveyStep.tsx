import React from 'react';
import { Button } from '@/components/ui/button';
import { SurveyStepProps } from '@/types/survey';

interface BaseSurveyStepProps extends SurveyStepProps {
  question?: string;
  subtitle?: string;
  options: string[];
  allowMultiple?: boolean;
  children?: React.ReactNode;
}

export const BaseSurveyStep: React.FC<BaseSurveyStepProps> = ({
  question,
  subtitle,
  options,
  allowMultiple = false,
  currentAnswer,
  onAnswer,
  children
}) => {
  const handleOptionClick = (option: string) => {
    if (allowMultiple) {
      const currentAnswers = currentAnswer ? currentAnswer.split(',') : [];
      const newAnswers = currentAnswers.includes(option)
        ? currentAnswers.filter(a => a !== option)
        : [...currentAnswers, option];
      onAnswer(newAnswers.join(','));
    } else {
      onAnswer(option);
    }
  };

  const isSelected = (option: string) => {
    if (allowMultiple) {
      return currentAnswer ? currentAnswer.split(',').includes(option) : false;
    }
    return currentAnswer === option;
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      {children}
      
      {question && (
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            {question}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-lg">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {options.map((option, index) => (
          <Button
            key={index}
            variant={isSelected(option) ? "default" : "outline"}
            className={`w-full justify-start h-auto p-4 text-left ${
              isSelected(option) 
                ? "bg-primary text-primary-foreground border-primary" 
                : "hover:bg-muted"
            }`}
            onClick={() => handleOptionClick(option)}
          >
            <span className="text-base">{option}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
