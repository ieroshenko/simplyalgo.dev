import { useState, useEffect, useCallback } from 'react';
import { CoachingMode, CoachingModeState, CoachingModePreferences } from '../types';
import { 
  validateCoachingModeWithRecovery, 
  handleCoachingModeError, 
  createCoachingModeError,
  logCoachingModeError,
  type CoachingModeError 
} from '../services/coachingModeErrorRecovery';

const STORAGE_KEY = 'coaching-mode-preferences';
const DEFAULT_MODE: CoachingMode = 'comprehensive';

/**
 * Custom hook for managing coaching mode state with local storage persistence
 * Provides mode switching logic with fallback handling
 */
export const useCoachingMode = () => {
  const [state, setState] = useState<CoachingModeState>({
    currentMode: DEFAULT_MODE,
    isEnabled: true,
    preferences: {
      defaultMode: DEFAULT_MODE,
      rememberChoice: true,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<CoachingModeError | null>(null);

  /**
   * Load preferences from local storage with error handling
   */
  const loadPreferences = useCallback((): CoachingModePreferences | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as CoachingModePreferences;
      
      // Validate the stored data
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        ['socratic', 'comprehensive'].includes(parsed.defaultMode) &&
        ['socratic', 'comprehensive'].includes(parsed.lastUsedMode) &&
        typeof parsed.rememberChoice === 'boolean' &&
        typeof parsed.timestamp === 'number'
      ) {
        return parsed;
      }
      
      // Invalid data, remove it
      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch (error) {
      console.warn('Failed to load coaching mode preferences:', error);
      // Clean up corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (cleanupError) {
        console.warn('Failed to clean up corrupted preferences:', cleanupError);
      }
      return null;
    }
  }, []);

  /**
   * Save preferences to local storage with error handling
   */
  const savePreferences = useCallback((preferences: CoachingModePreferences): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save coaching mode preferences:', error);
    }
  }, []);

  /**
   * Initialize state from local storage on mount
   */
  useEffect(() => {
    const loadInitialState = () => {
      const savedPreferences = loadPreferences();
      
      if (savedPreferences && savedPreferences.rememberChoice) {
        setState({
          currentMode: savedPreferences.lastUsedMode,
          isEnabled: true,
          preferences: {
            defaultMode: savedPreferences.defaultMode,
            rememberChoice: savedPreferences.rememberChoice,
          },
        });
      } else {
        // Use default state if no valid preferences found
        setState({
          currentMode: DEFAULT_MODE,
          isEnabled: true,
          preferences: {
            defaultMode: DEFAULT_MODE,
            rememberChoice: true,
          },
        });
      }
      
      setIsLoading(false);
    };

    loadInitialState();
  }, [loadPreferences]);

  /**
   * Switch coaching mode with fallback handling and error recovery
   */
  const setMode = useCallback((newMode: CoachingMode): void => {
    try {
      // Clear any previous errors
      setLastError(null);
      
      setState(prevState => {
        // Validate the new mode with recovery
        const { mode: validatedMode, error: validationError } = validateCoachingModeWithRecovery(
          newMode, 
          prevState.currentMode
        );
        
        if (validationError) {
          logCoachingModeError(validationError, { 
            requestedMode: newMode, 
            currentMode: prevState.currentMode 
          });
          setLastError(validationError);
        }

        const newState = {
          ...prevState,
          currentMode: validatedMode,
        };

        // Save to local storage if remember choice is enabled
        if (newState.preferences.rememberChoice) {
          try {
            const preferencesToSave: CoachingModePreferences = {
              defaultMode: newState.preferences.defaultMode,
              lastUsedMode: validatedMode,
              rememberChoice: newState.preferences.rememberChoice,
              timestamp: Date.now(),
            };
            
            savePreferences(preferencesToSave);
          } catch (storageError) {
            // Storage error shouldn't prevent mode switching
            const storageErrorObj = createCoachingModeError(
              'Failed to save mode preference, but mode switch succeeded',
              'STORAGE_ERROR',
              prevState.currentMode,
              validatedMode
            );
            
            logCoachingModeError(storageErrorObj, { storageError });
            setLastError(storageErrorObj);
          }
        }

        return newState;
      });
    } catch (error) {
      // Critical error in mode switching - maintain current state
      const criticalError = createCoachingModeError(
        `Critical error in setMode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN',
        state.currentMode,
        newMode
      );
      
      logCoachingModeError(criticalError, { originalError: error });
      setLastError(criticalError);
      
      // Don't change state if there's a critical error
      // This ensures chat continues functioning with the current mode
    }
  }, [savePreferences, state.currentMode]);

  /**
   * Update preferences with validation and persistence
   */
  const updatePreferences = useCallback((
    updates: Partial<CoachingModeState['preferences']>
  ): void => {
    setState(prevState => {
      const newPreferences = {
        ...prevState.preferences,
        ...updates,
      };

      // Validate preference values
      if (updates.defaultMode && !['socratic', 'comprehensive'].includes(updates.defaultMode)) {
        console.warn(`Invalid default mode: ${updates.defaultMode}. Keeping current default.`);
        newPreferences.defaultMode = prevState.preferences.defaultMode;
      }

      const newState = {
        ...prevState,
        preferences: newPreferences,
      };

      // Save updated preferences to local storage
      if (newPreferences.rememberChoice) {
        const preferencesToSave: CoachingModePreferences = {
          defaultMode: newPreferences.defaultMode,
          lastUsedMode: prevState.currentMode,
          rememberChoice: newPreferences.rememberChoice,
          timestamp: Date.now(),
        };
        
        savePreferences(preferencesToSave);
      } else {
        // If remember choice is disabled, clear stored preferences
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.warn('Failed to remove coaching mode preferences:', error);
        }
      }

      return newState;
    });
  }, [savePreferences]);

  /**
   * Reset to default mode and preferences
   */
  const resetToDefault = useCallback((): void => {
    const defaultState: CoachingModeState = {
      currentMode: DEFAULT_MODE,
      isEnabled: true,
      preferences: {
        defaultMode: DEFAULT_MODE,
        rememberChoice: true,
      },
    };

    setState(defaultState);

    // Clear local storage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear coaching mode preferences:', error);
    }
  }, []);

  /**
   * Toggle between socratic and comprehensive modes with error recovery
   */
  const toggleMode = useCallback((): void => {
    try {
      const newMode: CoachingMode = state.currentMode === 'socratic' ? 'comprehensive' : 'socratic';
      setMode(newMode);
    } catch (error) {
      const toggleError = createCoachingModeError(
        `Failed to toggle coaching mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TOGGLE_FAILURE',
        state.currentMode,
        state.currentMode === 'socratic' ? 'comprehensive' : 'socratic'
      );
      
      logCoachingModeError(toggleError, { originalError: error });
      setLastError(toggleError);
    }
  }, [state.currentMode, setMode]);

  /**
   * Clear the last error
   */
  const clearError = useCallback((): void => {
    setLastError(null);
  }, []);

  return {
    // Current state
    mode: state.currentMode,
    isEnabled: state.isEnabled,
    preferences: state.preferences,
    isLoading,
    lastError,
    
    // Actions
    setMode,
    toggleMode,
    updatePreferences,
    resetToDefault,
    clearError,
    
    // Utilities
    isSocraticMode: state.currentMode === 'socratic',
    isComprehensiveMode: state.currentMode === 'comprehensive',
  };
};

export default useCoachingMode;