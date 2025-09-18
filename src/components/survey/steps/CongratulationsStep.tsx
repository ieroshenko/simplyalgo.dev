import React from 'react';
import { SurveyStepProps } from '@/types/survey';

export const CongratulationsStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer } = props;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
        Congratulations 🎉 
        </h1>
        <h2 className="text-xl text-muted-foreground mb-8">
          your custom plan is ready!
        </h2>
      </div>
    </div>
  );
};
