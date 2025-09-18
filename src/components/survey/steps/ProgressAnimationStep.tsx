import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { SurveyStepProps } from '@/types/survey';

export const ProgressAnimationStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer, onNext } = props;
  const [progress, setProgress] = useState(0);

  const steps = [
    "Analyzing your answers…",
    "Understanding your interview goals…",
    "Reviewing your prep style…",
    "Figuring out where you're strong and where you need help…",
    "Breaking down your learning needs…"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onAnswer("completed");
            onNext();
          }, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onAnswer, onNext]);

  const currentStepIndex = Math.floor((progress / 100) * steps.length);
  const currentStep = steps[currentStepIndex] || steps[steps.length - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl font-bold text-primary mb-4">
          {Math.round(progress)}%
        </div>
        
        <h1 className="text-2xl font-semibold text-foreground mb-8">
          We're setting everything up for you
        </h1>
        
        <div className="mb-8">
          <Progress value={progress} className="h-3 mb-4" />
        </div>
        
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`text-sm ${
                index <= currentStepIndex
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
