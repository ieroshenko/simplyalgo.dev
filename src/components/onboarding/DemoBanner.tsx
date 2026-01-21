import React from 'react';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight } from 'lucide-react';
import { useDemoMode } from '@/features/onboarding/DemoModeContext';

export const DemoBanner: React.FC = () => {
  const { isDemoMode, completeDemo } = useDemoMode();

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              Demo Mode
            </span>
            <span className="text-sm text-muted-foreground ml-2">
              Try solving this problem to experience our AI coaching features!
            </span>
          </div>
        </div>
        <Button
          onClick={completeDemo}
          variant="outline"
          size="sm"
          className="border-primary/30 hover:bg-primary/10 text-primary"
        >
          Skip to Checkout
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
