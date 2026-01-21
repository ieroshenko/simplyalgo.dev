import { useEffect, useRef } from 'react';
import { useOnboardingContext } from '../OnboardingContext';
import { getTourSteps, type TourPage } from '../onboardingTourSteps';
import type { TourStep } from '../demoTourSteps';

interface UseOnboardingResult {
  // Tour state
  isTourActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentTourSteps: TourStep[];
  // Tour controls
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  // Helpers
  hasSeenTour: boolean;
  shouldShowTour: boolean;
}

/**
 * Hook for managing onboarding tours on a specific page
 *
 * @param page - The tour page to manage
 * @param autoStart - Whether to auto-start the tour on mount (default: true)
 * @returns Tour state and controls
 *
 * @example
 * ```tsx
 * const { isTourActive, currentStep, nextStep, skipTour } = useOnboarding('dashboard');
 *
 * // Tour will auto-start if user hasn't seen it and has subscription
 * ```
 */
export const useOnboarding = (page: TourPage, autoStart = true): UseOnboardingResult => {
  const context = useOnboardingContext();
  const autoStartedRef = useRef(false);

  const {
    state,
    startTour: contextStartTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    hasSeenTour,
    shouldShowTour,
    getTotalSteps,
  } = context;

  const hasSeenThisTour = hasSeenTour(page);
  const shouldShow = shouldShowTour(page);
  const currentTourSteps = getTourSteps(page);
  const isActiveOnThisPage = state.isTourActive && state.currentPage === page;

  // Auto-start tour on mount if conditions are met
  useEffect(() => {
    if (autoStart && shouldShow && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // Small delay to ensure page elements are rendered
      const timer = setTimeout(() => {
        contextStartTour(page);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, shouldShow, page, contextStartTour]);

  // Reset autoStarted ref when page changes
  useEffect(() => {
    return () => {
      autoStartedRef.current = false;
    };
  }, [page]);

  const startTour = () => contextStartTour(page);

  return {
    isTourActive: isActiveOnThisPage,
    currentStep: isActiveOnThisPage ? state.currentStep : 0,
    totalSteps: currentTourSteps.length,
    currentTourSteps,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    hasSeenTour: hasSeenThisTour,
    shouldShowTour: shouldShow,
  };
};

export type { TourPage };
