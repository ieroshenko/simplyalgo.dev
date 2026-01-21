import React from 'react';
import { cn } from '@/lib/utils';

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const TourProgress: React.FC<TourProgressProps> = ({
  currentStep,
  totalSteps,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            index === currentStep
              ? 'w-6 bg-primary'
              : index < currentStep
                ? 'w-1.5 bg-primary/60'
                : 'w-1.5 bg-muted-foreground/30'
          )}
          aria-label={`Step ${index + 1} ${index === currentStep ? '(current)' : index < currentStep ? '(completed)' : '(upcoming)'}`}
        />
      ))}
    </div>
  );
};
