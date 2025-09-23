/**
 * Coaching Mode Error Recovery Service
 * Provides centralized error handling and recovery mechanisms for coaching mode failures
 */

import { CoachingMode } from '@/types';

export interface CoachingModeError extends Error {
  code: 'INVALID_MODE' | 'STORAGE_ERROR' | 'TOGGLE_FAILURE' | 'VALIDATION_ERROR' | 'UNKNOWN';
  originalMode?: CoachingMode;
  attemptedMode?: CoachingMode;
  recoveryAction?: 'FALLBACK_TO_COMPREHENSIVE' | 'RETRY' | 'MAINTAIN_CURRENT';
}

/**
 * Create a coaching mode error with additional context
 */
export function createCoachingModeError(
  message: string,
  code: CoachingModeError['code'],
  originalMode?: CoachingMode,
  attemptedMode?: CoachingMode
): CoachingModeError {
  const error = new Error(message) as CoachingModeError;
  error.code = code;
  error.originalMode = originalMode;
  error.attemptedMode = attemptedMode;
  
  // Determine recovery action based on error type
  switch (code) {
    case 'INVALID_MODE':
    case 'VALIDATION_ERROR':
      error.recoveryAction = 'FALLBACK_TO_COMPREHENSIVE';
      break;
    case 'STORAGE_ERROR':
      error.recoveryAction = 'MAINTAIN_CURRENT';
      break;
    case 'TOGGLE_FAILURE':
      error.recoveryAction = 'RETRY';
      break;
    default:
      error.recoveryAction = 'FALLBACK_TO_COMPREHENSIVE';
  }
  
  return error;
}

/**
 * Validate coaching mode and return safe mode with error details
 */
export function validateCoachingModeWithRecovery(
  mode: unknown,
  currentMode: CoachingMode = 'comprehensive'
): { mode: CoachingMode; error?: CoachingModeError } {
  try {
    // Handle null/undefined
    if (mode == null) {
      return { mode: currentMode };
    }
    
    // Handle string validation
    if (typeof mode === 'string' && ['socratic', 'comprehensive'].includes(mode)) {
      return { mode: mode as CoachingMode };
    }
    
    // Invalid mode - create error and fallback
    const error = createCoachingModeError(
      `Invalid coaching mode: ${mode}. Using fallback.`,
      'INVALID_MODE',
      currentMode,
      mode as CoachingMode
    );
    
    return { mode: 'comprehensive', error };
    
  } catch (validationError) {
    const error = createCoachingModeError(
      `Validation error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
      'VALIDATION_ERROR',
      currentMode,
      mode as CoachingMode
    );
    
    return { mode: 'comprehensive', error };
  }
}

/**
 * Handle coaching mode errors with appropriate recovery actions
 */
export function handleCoachingModeError(
  error: CoachingModeError,
  onFallback?: (mode: CoachingMode) => void,
  onRetry?: () => void,
  onMaintain?: () => void
): CoachingMode {
  console.error('Coaching mode error:', error);
  
  switch (error.recoveryAction) {
    case 'FALLBACK_TO_COMPREHENSIVE':
      if (onFallback) {
        onFallback('comprehensive');
      }
      return 'comprehensive';
      
    case 'RETRY':
      if (onRetry) {
        onRetry();
      }
      return error.originalMode || 'comprehensive';
      
    case 'MAINTAIN_CURRENT':
      if (onMaintain) {
        onMaintain();
      }
      return error.originalMode || 'comprehensive';
      
    default:
      return 'comprehensive';
  }
}

/**
 * Create user-friendly error messages for coaching mode failures
 */
export function getCoachingModeErrorMessage(error: CoachingModeError): {
  title: string;
  description: string;
  action?: string;
} {
  switch (error.code) {
    case 'INVALID_MODE':
      return {
        title: 'Invalid Coaching Mode',
        description: `The requested mode is not supported. Switched to Comprehensive mode.`,
        action: 'Try switching modes again'
      };
      
    case 'STORAGE_ERROR':
      return {
        title: 'Settings Save Failed',
        description: 'Your mode preference could not be saved, but the mode switch was successful.',
        action: 'Your selection will work for this session'
      };
      
    case 'TOGGLE_FAILURE':
      return {
        title: 'Mode Switch Failed',
        description: `Could not switch to ${error.attemptedMode === 'socratic' ? 'Socratic' : 'Comprehensive'} mode.`,
        action: 'Please try again'
      };
      
    case 'VALIDATION_ERROR':
      return {
        title: 'Mode Validation Error',
        description: 'There was an issue validating the coaching mode. Using Comprehensive mode.',
        action: 'Try refreshing the page if issues persist'
      };
      
    default:
      return {
        title: 'Coaching Mode Error',
        description: 'An unexpected error occurred with coaching modes. Using Comprehensive mode.',
        action: 'Please try again or refresh the page'
      };
  }
}

/**
 * Log coaching mode errors for debugging and monitoring
 */
export function logCoachingModeError(error: CoachingModeError, context?: Record<string, unknown>): void {
  const logData = {
    error: {
      message: error.message,
      code: error.code,
      originalMode: error.originalMode,
      attemptedMode: error.attemptedMode,
      recoveryAction: error.recoveryAction,
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };
  
  console.error('[CoachingMode Error]', logData);
  
  // In a production environment, you might want to send this to an error tracking service
  // Example: errorTrackingService.captureException(error, logData);
}