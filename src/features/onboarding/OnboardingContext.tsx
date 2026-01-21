import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { trackEvent } from '@/services/analytics';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { TourPage } from './onboardingTourSteps';
import { getTourStepCount } from './onboardingTourSteps';

const ONBOARDING_STORAGE_KEY = 'simplyalgo_onboarding_tours';

interface SeenTours {
  dashboard: boolean;
  problems: boolean;
  behavioral: boolean;
  profile: boolean;
}

interface OnboardingState {
  seenTours: SeenTours;
  currentPage: TourPage | null;
  currentStep: number;
  isTourActive: boolean;
  isLoading: boolean;
}

interface OnboardingContextType {
  state: OnboardingState;
  // Tour controls
  startTour: (page: TourPage) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  // Admin controls
  resetAllTours: () => void;
  // Helpers
  hasSeenTour: (page: TourPage) => boolean;
  shouldShowTour: (page: TourPage) => boolean;
  getTotalSteps: () => number;
}

const defaultSeenTours: SeenTours = {
  dashboard: false,
  problems: false,
  behavioral: false,
  profile: false,
};

const defaultState: OnboardingState = {
  seenTours: defaultSeenTours,
  currentPage: null,
  currentStep: 0,
  isTourActive: false,
  isLoading: true,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// LocalStorage helpers (used as cache)
function loadFromLocalStorage(): SeenTours | null {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultSeenTours,
        ...parsed,
      };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function saveToLocalStorage(seenTours: SeenTours): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(seenTours));
  } catch {
    // Ignore errors
  }
}

function clearLocalStorage(): void {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// Database helpers
async function loadFromDatabase(userId: string): Promise<SeenTours | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('onboarding_tours_seen')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 means no row found - that's ok for new users
      if (error.code !== 'PGRST116') {
        logger.error('[Onboarding] Error loading from database', { error });
      }
      return null;
    }

    if (data?.onboarding_tours_seen) {
      return {
        ...defaultSeenTours,
        ...(data.onboarding_tours_seen as SeenTours),
      };
    }
  } catch (error) {
    logger.error('[Onboarding] Error loading from database', { error });
  }
  return null;
}

async function saveToDatabase(userId: string, seenTours: SeenTours): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ onboarding_tours_seen: seenTours })
      .eq('user_id', userId);

    if (error) {
      logger.error('[Onboarding] Error saving to database', { error });
    }
  } catch (error) {
    logger.error('[Onboarding] Error saving to database', { error });
  }
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const { user } = useAuth();

  const [seenTours, setSeenTours] = useState<SeenTours>(defaultSeenTours);
  const [currentPage, setCurrentPage] = useState<TourPage | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track if we've loaded from DB to avoid re-fetching
  const loadedForUserRef = useRef<string | null>(null);

  // Load state from database (with localStorage as fallback/cache)
  useEffect(() => {
    const loadState = async () => {
      // First, try localStorage for immediate UI (cache)
      const localState = loadFromLocalStorage();
      if (localState) {
        setSeenTours(localState);
      }

      // If user is logged in, load from database (source of truth)
      if (user?.id && loadedForUserRef.current !== user.id) {
        loadedForUserRef.current = user.id;
        const dbState = await loadFromDatabase(user.id);
        if (dbState) {
          setSeenTours(dbState);
          saveToLocalStorage(dbState); // Update cache
        }
      }

      setIsLoading(false);
    };

    loadState();
  }, [user?.id]);

  // Sync to localStorage on storage event (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ONBOARDING_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSeenTours({
            ...defaultSeenTours,
            ...parsed,
          });
        } catch {
          // Ignore errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const hasSeenTour = useCallback((page: TourPage): boolean => {
    return seenTours[page] === true;
  }, [seenTours]);

  const shouldShowTour = useCallback((page: TourPage): boolean => {
    // Don't show tour if still loading
    if (isLoading || subscriptionLoading) return false;
    // Only show tour for subscribed users who haven't seen this tour
    return hasActiveSubscription && !hasSeenTour(page);
  }, [hasActiveSubscription, subscriptionLoading, isLoading, hasSeenTour]);

  const startTour = useCallback((page: TourPage) => {
    setCurrentPage(page);
    setCurrentStep(0);
    setIsTourActive(true);
    trackEvent('onboarding_tour_started', { page, timestamp: new Date().toISOString() });
  }, []);

  const getTotalSteps = useCallback((): number => {
    if (!currentPage) return 0;
    return getTourStepCount(currentPage);
  }, [currentPage]);

  const markTourComplete = useCallback((page: TourPage) => {
    const newSeenTours = { ...seenTours, [page]: true };
    setSeenTours(newSeenTours);

    // Save to localStorage (cache)
    saveToLocalStorage(newSeenTours);

    // Save to database (source of truth)
    if (user?.id) {
      saveToDatabase(user.id, newSeenTours);
    }
  }, [seenTours, user?.id]);

  const nextStep = useCallback(() => {
    if (!currentPage) return;

    const totalSteps = getTourStepCount(currentPage);
    if (currentStep < totalSteps - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      trackEvent('onboarding_tour_step_viewed', {
        page: currentPage,
        step: nextStepIndex,
        totalSteps,
      });
    } else {
      // Tour complete
      setIsTourActive(false);
      markTourComplete(currentPage);
      trackEvent('onboarding_tour_completed', {
        page: currentPage,
        stepsViewed: totalSteps,
      });
      setCurrentPage(null);
      setCurrentStep(0);
    }
  }, [currentPage, currentStep, markTourComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    if (!currentPage) return;

    setIsTourActive(false);
    markTourComplete(currentPage);
    trackEvent('onboarding_tour_skipped', {
      page: currentPage,
      stepsViewed: currentStep + 1,
      totalSteps: getTourStepCount(currentPage),
    });
    setCurrentPage(null);
    setCurrentStep(0);
  }, [currentPage, currentStep, markTourComplete]);

  const completeTour = useCallback(() => {
    if (!currentPage) return;

    setIsTourActive(false);
    markTourComplete(currentPage);
    trackEvent('onboarding_tour_completed', {
      page: currentPage,
      stepsViewed: getTourStepCount(currentPage),
    });
    setCurrentPage(null);
    setCurrentStep(0);
  }, [currentPage, markTourComplete]);

  const resetAllTours = useCallback(() => {
    // Clear localStorage
    clearLocalStorage();

    // Reset state
    setSeenTours(defaultSeenTours);
    setCurrentPage(null);
    setCurrentStep(0);
    setIsTourActive(false);

    // Clear in database
    if (user?.id) {
      saveToDatabase(user.id, defaultSeenTours);
    }

    trackEvent('onboarding_tours_reset', { timestamp: new Date().toISOString() });
  }, [user?.id]);

  const state: OnboardingState = {
    seenTours,
    currentPage,
    currentStep,
    isTourActive,
    isLoading,
  };

  const value: OnboardingContextType = {
    state,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetAllTours,
    hasSeenTour,
    shouldShowTour,
    getTotalSteps,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingContext = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};
