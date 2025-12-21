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
    <footer className="w-full bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button
          onClick={onContinue}
          disabled={!canContinue || isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? 'Saving...' : (isLastStep ? 'Complete Survey' : 'Continue')}
        </Button>
      </div>
    </footer>
  );
};
