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
    <header className="w-full bg-background border-b border-border/50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="w-20">
            {canGoBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 px-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back</span>
              </Button>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {Math.round(progress)}% Complete
            </span>
          </div>

          <div className="w-20" />
        </div>
        
        <Progress value={progress} className="h-1.5 bg-emerald-100" />
      </div>
    </header>
  );
};
