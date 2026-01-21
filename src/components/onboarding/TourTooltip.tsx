import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TooltipPosition {
  top: number;
  left: number;
}

interface TourTooltipProps {
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  targetSelector,
  title,
  description,
  position,
  isActive,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      setTooltipPosition(null);
      return;
    }

    const updatePosition = () => {
      const targetElement = document.querySelector(targetSelector);
      const tooltipElement = tooltipRef.current;

      if (!targetElement || !tooltipElement) return;

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();
      const spacing = 16;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - spacing;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + spacing;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + spacing;
          break;
      }

      // Ensure tooltip stays within viewport
      const viewportPadding = 16;
      const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
      const maxTop = window.innerHeight - tooltipRect.height - viewportPadding;

      top = Math.max(viewportPadding, Math.min(top, maxTop));
      left = Math.max(viewportPadding, Math.min(left, maxLeft));

      setTooltipPosition({ top, left });
    };

    // Small delay to allow tooltip to render and get dimensions
    const timer = setTimeout(updatePosition, 50);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetSelector, position, isActive]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onSkip();
          break;
        case 'Enter':
        case 'ArrowRight':
          onNext();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) {
            onPrev();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onNext, onPrev, onSkip, isFirstStep]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-80 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300"
      style={{
        top: tooltipPosition?.top ?? -9999,
        left: tooltipPosition?.left ?? -9999,
        visibility: tooltipPosition ? 'visible' : 'hidden',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tour step ${currentStep + 1} of ${totalSteps}: ${title}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {currentStep + 1} of {totalSteps}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={isFirstStep}
          className="text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onNext}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLastStep ? (
            'Get Started'
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
