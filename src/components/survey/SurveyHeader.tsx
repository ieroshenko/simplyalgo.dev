import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SurveyHeaderProps } from '@/types/survey';

export const SurveyHeader: React.FC<SurveyHeaderProps> = ({
  currentStep,
  totalSteps,
  onBack,
  canGoBack
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <header className="w-full bg-background border-b border-border">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          {canGoBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div className="w-16" /> // Spacer to maintain layout
          )}
          
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>
    </header>
  );
};
