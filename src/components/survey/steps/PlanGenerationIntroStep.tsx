import React from 'react';
import { SurveyStepProps } from '@/types/survey';

export const PlanGenerationIntroStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer } = props;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex justify-center mb-8">
        <img 
          src="/src/assets/survey/time-to-generate-custom-plan.png"
          alt="Time to generate your custom plan"
          className="w-full max-w-sm rounded-lg"
        />
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Time to generate your custom plan!
        </h1>
        <p className="text-muted-foreground text-lg">
          ✅ All done!
        </p>
      </div>
    </div>
  );
};
