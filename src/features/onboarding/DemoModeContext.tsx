import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { trackEvent } from '@/services/analytics';

interface DemoModeContextType {
  isDemoMode: boolean;
  tourStep: number;
  tourComplete: boolean;
  isTourActive: boolean;
  setTourStep: (step: number) => void;
  startTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  completeDemo: () => void;
  totalTourSteps: number;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

const DEMO_STATE_KEY = 'simplyalgo_demo_state';
const TOTAL_TOUR_STEPS = 3;

interface DemoState {
  tourComplete: boolean;
  tourStep: number;
  demoStartedAt?: string;
}

function loadDemoState(): DemoState | null {
  try {
    const stored = localStorage.getItem(DEMO_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function saveDemoState(state: DemoState): void {
  try {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore errors
  }
}

function clearDemoState(): void {
  try {
    localStorage.removeItem(DEMO_STATE_KEY);
  } catch {
    // Ignore errors
  }
}

interface DemoModeProviderProps {
  children: React.ReactNode;
}

export const DemoModeProvider: React.FC<DemoModeProviderProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isDemoMode = searchParams.get('demo') === 'true';

  const [tourStep, setTourStepState] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    if (isDemoMode) {
      const savedState = loadDemoState();
      if (savedState) {
        setTourStepState(savedState.tourStep);
        setTourComplete(savedState.tourComplete);
        // Don't auto-start tour if already completed
        if (!savedState.tourComplete) {
          setIsTourActive(true);
        }
      } else {
        // First time in demo mode
        trackEvent('demo_started', { timestamp: new Date().toISOString() });
        saveDemoState({
          tourComplete: false,
          tourStep: 0,
          demoStartedAt: new Date().toISOString(),
        });
        setIsTourActive(true);
      }
    }
  }, [isDemoMode]);

  const setTourStep = useCallback((step: number) => {
    setTourStepState(step);
    saveDemoState({ tourComplete, tourStep: step });
    trackEvent('demo_tour_step_viewed', { step, totalSteps: TOTAL_TOUR_STEPS });
  }, [tourComplete]);

  const startTour = useCallback(() => {
    setIsTourActive(true);
    setTourStepState(0);
    setTourComplete(false);
    saveDemoState({ tourComplete: false, tourStep: 0 });
    trackEvent('demo_tour_started');
  }, []);

  const completeTour = useCallback(() => {
    setIsTourActive(false);
    setTourComplete(true);
    saveDemoState({ tourComplete: true, tourStep: TOTAL_TOUR_STEPS });
    trackEvent('demo_tour_completed', { stepsViewed: TOTAL_TOUR_STEPS });
  }, []);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    setTourComplete(true);
    saveDemoState({ tourComplete: true, tourStep });
    trackEvent('demo_tour_skipped', { stepsViewed: tourStep });
  }, [tourStep]);

  const nextTourStep = useCallback(() => {
    if (tourStep < TOTAL_TOUR_STEPS - 1) {
      const nextStep = tourStep + 1;
      setTourStepState(nextStep);
      saveDemoState({ tourComplete: false, tourStep: nextStep });
      trackEvent('demo_tour_step_viewed', { step: nextStep, totalSteps: TOTAL_TOUR_STEPS });
    } else {
      completeTour();
    }
  }, [tourStep, completeTour]);

  const prevTourStep = useCallback(() => {
    if (tourStep > 0) {
      const prevStep = tourStep - 1;
      setTourStepState(prevStep);
      saveDemoState({ tourComplete: false, tourStep: prevStep });
    }
  }, [tourStep]);

  const completeDemo = useCallback(() => {
    clearDemoState();
    trackEvent('demo_completed');
    navigate('/survey/20');
  }, [navigate]);

  const value: DemoModeContextType = {
    isDemoMode,
    tourStep,
    tourComplete,
    isTourActive,
    setTourStep,
    startTour,
    completeTour,
    skipTour,
    nextTourStep,
    prevTourStep,
    completeDemo,
    totalTourSteps: TOTAL_TOUR_STEPS,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextType => {
  const context = useContext(DemoModeContext);
  if (!context) {
    // Return a default context for when not in demo mode
    return {
      isDemoMode: false,
      tourStep: 0,
      tourComplete: false,
      isTourActive: false,
      setTourStep: () => {},
      startTour: () => {},
      completeTour: () => {},
      skipTour: () => {},
      nextTourStep: () => {},
      prevTourStep: () => {},
      completeDemo: () => {},
      totalTourSteps: TOTAL_TOUR_STEPS,
    };
  }
  return context;
};
