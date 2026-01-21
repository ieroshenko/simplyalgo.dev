import React from 'react';
import { Button } from '@/components/ui/button';
import { SurveyFooterProps } from '@/types/survey';

export const SurveyFooter: React.FC<SurveyFooterProps> = ({
  onContinue,
  canContinue,
  isLastStep,
  isSaving = false
}) => {
  return (
    <footer className="w-full bg-background/80 backdrop-blur-md border-t border-border/50">
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        <Button
          onClick={onContinue}
          disabled={!canContinue || isSaving}
          className={`w-full h-12 md:h-14 text-base font-semibold transition-all duration-300 ${
            canContinue 
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" 
              : "bg-muted text-muted-foreground"
          }`}
          size="lg"
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Saving...</span>
            </div>
          ) : (
            <span>{isLastStep ? 'Complete Survey' : 'Continue'}</span>
          )}
        </Button>
      </div>
    </footer>
  );
};
