import React from 'react';
import { SurveyStepProps } from '@/types/survey';

export const LongTermResultsStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer } = props;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Simplyalgo creates long-term results
        </h1>
      </div>
      
      <div className="flex justify-center mb-8">
        <img 
          src="/src/assets/survey/simply-algo-creates-long-term-results.png"
          alt="Simplyalgo creates long-term results"
          className="w-full max-w-md rounded-lg"
        />
      </div>
    </div>
  );
};
