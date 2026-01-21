import React, { useEffect, useState } from 'react';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';
import type { TourStep } from '@/features/onboarding/demoTourSteps';

interface ProductTourProps {
  steps: TourStep[];
  currentStep: number;
  isActive: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({
  steps,
  currentStep,
  isActive,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const [targetExists, setTargetExists] = useState(false);

  const currentTourStep = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Check if target element exists
  useEffect(() => {
    if (!isActive || !currentTourStep) {
      setTargetExists(false);
      return;
    }

    const checkTarget = () => {
      const target = document.querySelector(currentTourStep.target);
      setTargetExists(!!target);
    };

    // Initial check
    checkTarget();

    // Poll for element appearance
    const interval = setInterval(checkTarget, 200);

    return () => clearInterval(interval);
  }, [isActive, currentTourStep]);

  // Handle next/complete
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  if (!isActive || !currentTourStep || !targetExists) {
    return null;
  }

  return (
    <>
      {/* Spotlight overlay */}
      <TourSpotlight
        targetSelector={currentTourStep.target}
        isActive={isActive && targetExists}
        padding={12}
        borderRadius={12}
      />

      {/* Tooltip */}
      <TourTooltip
        targetSelector={currentTourStep.target}
        title={currentTourStep.title}
        description={currentTourStep.description}
        position={currentTourStep.position}
        isActive={isActive && targetExists}
        currentStep={currentStep}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={onPrev}
        onSkip={onSkip}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
      />
    </>
  );
};
