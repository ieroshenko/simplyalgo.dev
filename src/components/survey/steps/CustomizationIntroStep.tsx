import React from 'react';
import { SurveyStepProps } from '@/types/survey';

export const CustomizationIntroStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer } = props;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex justify-center mb-8">
        <img 
          src="/src/assets/survey/lets-make-simplyalgo-fit.png"
          alt="Let's make SimplyAlgo fit you"
          className="w-full max-w-sm rounded-lg"
        />
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Let's make SimplyAlgo fit you
        </h1>
        <p className="text-muted-foreground text-lg">
          Answer a few quick questions so we can tailor the experience.
        </p>
      </div>
    </div>
  );
};
