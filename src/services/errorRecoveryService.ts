import { OverlayPosition, EditorBounds } from './overlayPositionManager';

/**
 * Error recovery strategies for overlay positioning
 */
export enum ErrorRecoveryStrategy {
  VIEWPORT_CENTER = 'viewport_center',
  SAFE_CORNER = 'safe_corner',
  LAST_KNOWN_GOOD = 'last_known_good',
  ADAPTIVE_FALLBACK = 'adaptive_fallback'
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  strategy: ErrorRecoveryStrategy;
  safeMargin: number;
  minOverlaySize: { width: number; height: number };
  maxRetries: number;
  fallbackDelay: number;
}

/**
 * Error context for recovery decisions
 */
export interface ErrorContext {
  errorType: 'editor_unavailable' | 'bounds_invalid' | 'storage_failed' | 'calculation_failed';
  originalError?: Error;
  attemptCount: number;
  lastKnownPosition?: OverlayPosition;
  editorBounds?: EditorBounds;
}

/**
 * Service for handling positioning errors and providing fallback strategies
 */
export class ErrorRecoveryService {
  private config: ErrorRecoveryConfig;
  private lastKnownGoodPosition: OverlayPosition | null = null;
  private errorHistory: ErrorContext[] = [];

  constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    this.config = {
      strategy: ErrorRecoveryStrategy.ADAPTIVE_FALLBACK,
      safeMargin: 20,
      minOverlaySize: { width: 300, height: 200 },
      maxRetries: 3,
      fallbackDelay: 100,
      ...config,
    };
  }

  /**
   * Record a successful position for future fallback use
   */
  recordSuccessfulPosition(position: OverlayPosition): void {
    this.lastKnownGoodPosition = { ...position };
    // Clear error history on success
    this.errorHistory = [];
  }

  /**
   * Handle positioning error and provide recovery position
   */
  handleError(context: ErrorContext): OverlayPosition {
    // Record error for analysis
    this.errorHistory.push({
      ...context,
      attemptCount: this.getErrorCount(context.errorType) + 1,
    });

    // Log error for debugging
    console.warn(`[ErrorRecovery] Handling ${context.errorType}:`, context.originalError?.message);

    // Choose recovery strategy based on error type and history
    const strategy = this.selectRecoveryStrategy(context);
    
    try {
      return this.executeRecoveryStrategy(strategy, context);
    } catch (recoveryError) {
      console.error('[ErrorRecovery] Recovery strategy failed:', recoveryError);
      return this.getEmergencyFallback();
    }
  }

  /**
   * Select appropriate recovery strategy based on error context
   */
  private selectRecoveryStrategy(context: ErrorContext): ErrorRecoveryStrategy {
    const errorCount = this.getErrorCount(context.errorType);
    
    // Use configured strategy for first attempt
    if (errorCount === 1) {
      return this.config.strategy;
    }

    // Escalate to more conservative strategies on repeated failures
    switch (context.errorType) {
      case 'editor_unavailable':
        return errorCount > 2 ? ErrorRecoveryStrategy.SAFE_CORNER : ErrorRecoveryStrategy.VIEWPORT_CENTER;
      
      case 'bounds_invalid':
        return errorCount > 1 ? ErrorRecoveryStrategy.VIEWPORT_CENTER : ErrorRecoveryStrategy.LAST_KNOWN_GOOD;
      
      case 'storage_failed':
        return ErrorRecoveryStrategy.VIEWPORT_CENTER;
      
      case 'calculation_failed':
        return errorCount > 2 ? ErrorRecoveryStrategy.SAFE_CORNER : ErrorRecoveryStrategy.LAST_KNOWN_GOOD;
      
      default:
        return ErrorRecoveryStrategy.VIEWPORT_CENTER;
    }
  }

  /**
   * Execute the selected recovery strategy
   */
  private executeRecoveryStrategy(strategy: ErrorRecoveryStrategy, context: ErrorContext): OverlayPosition {
    switch (strategy) {
      case ErrorRecoveryStrategy.VIEWPORT_CENTER:
        return this.getViewportCenterPosition();
      
      case ErrorRecoveryStrategy.SAFE_CORNER:
        return this.getSafeCornerPosition();
      
      case ErrorRecoveryStrategy.LAST_KNOWN_GOOD:
        return this.getLastKnownGoodPosition(context);
      
      case ErrorRecoveryStrategy.ADAPTIVE_FALLBACK:
        return this.getAdaptiveFallbackPosition(context);
      
      default:
        return this.getViewportCenterPosition();
    }
  }

  /**
   * Get viewport-centered position
   */
  private getViewportCenterPosition(): OverlayPosition {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    return {
      x: Math.max(this.config.safeMargin, (viewport.width - this.config.minOverlaySize.width) / 2),
      y: Math.max(this.config.safeMargin, (viewport.height - this.config.minOverlaySize.height) / 2),
      timestamp: Date.now(),
      screenSize: viewport,
    };
  }

  /**
   * Get safe corner position (top-left with margin)
   */
  private getSafeCornerPosition(): OverlayPosition {
    return {
      x: this.config.safeMargin,
      y: this.config.safeMargin,
      timestamp: Date.now(),
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  /**
   * Get last known good position with validation
   */
  private getLastKnownGoodPosition(context: ErrorContext): OverlayPosition {
    if (this.lastKnownGoodPosition) {
      // Validate that the last known position is still reasonable
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      const isValid = 
        this.lastKnownGoodPosition.x >= 0 &&
        this.lastKnownGoodPosition.y >= 0 &&
        this.lastKnownGoodPosition.x + this.config.minOverlaySize.width <= viewport.width &&
        this.lastKnownGoodPosition.y + this.config.minOverlaySize.height <= viewport.height;

      if (isValid) {
        return {
          ...this.lastKnownGoodPosition,
          timestamp: Date.now(),
          screenSize: viewport,
        };
      }
    }

    // Fallback to viewport center if no valid last known position
    return this.getViewportCenterPosition();
  }

  /**
   * Get adaptive fallback position based on available information
   */
  private getAdaptiveFallbackPosition(context: ErrorContext): OverlayPosition {
    // Try to use editor bounds if available
    if (context.editorBounds && this.isValidBounds(context.editorBounds)) {
      return this.getPositionRelativeToEditor(context.editorBounds);
    }

    // Try last known good position
    if (this.lastKnownGoodPosition) {
      const lastKnownPosition = this.getLastKnownGoodPosition(context);
      if (lastKnownPosition !== this.getViewportCenterPosition()) {
        return lastKnownPosition;
      }
    }

    // Fallback to viewport center
    return this.getViewportCenterPosition();
  }

  /**
   * Get position relative to editor bounds
   */
  private getPositionRelativeToEditor(editorBounds: EditorBounds): OverlayPosition {
    // Position overlay to the right of editor if there's space
    const rightSpace = window.innerWidth - editorBounds.right;
    const bottomSpace = window.innerHeight - editorBounds.bottom;

    let x: number;
    let y: number;

    if (rightSpace >= this.config.minOverlaySize.width + this.config.safeMargin) {
      // Position to the right
      x = editorBounds.right + this.config.safeMargin;
      y = Math.max(this.config.safeMargin, editorBounds.top);
    } else if (bottomSpace >= this.config.minOverlaySize.height + this.config.safeMargin) {
      // Position below
      x = Math.max(this.config.safeMargin, editorBounds.left);
      y = editorBounds.bottom + this.config.safeMargin;
    } else {
      // Overlay on editor (center)
      x = editorBounds.left + (editorBounds.width - this.config.minOverlaySize.width) / 2;
      y = editorBounds.top + (editorBounds.height - this.config.minOverlaySize.height) / 2;
    }

    // Ensure position is within viewport
    x = Math.max(this.config.safeMargin, Math.min(x, window.innerWidth - this.config.minOverlaySize.width - this.config.safeMargin));
    y = Math.max(this.config.safeMargin, Math.min(y, window.innerHeight - this.config.minOverlaySize.height - this.config.safeMargin));

    return {
      x,
      y,
      timestamp: Date.now(),
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  /**
   * Emergency fallback position (always works)
   */
  private getEmergencyFallback(): OverlayPosition {
    return {
      x: 20,
      y: 20,
      timestamp: Date.now(),
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  /**
   * Check if editor bounds are valid
   */
  private isValidBounds(bounds: EditorBounds): boolean {
    return (
      bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.left >= 0 &&
      bounds.top >= 0 &&
      bounds.right <= window.innerWidth &&
      bounds.bottom <= window.innerHeight
    );
  }

  /**
   * Get error count for specific error type
   */
  private getErrorCount(errorType: string): number {
    return this.errorHistory.filter(error => error.errorType === errorType).length;
  }

  /**
   * Check if error recovery is needed based on error frequency
   */
  shouldTriggerRecovery(errorType: string): boolean {
    const recentErrors = this.errorHistory.filter(
      error => error.errorType === errorType && Date.now() - (error.lastKnownPosition?.timestamp || 0) < 5000
    );
    
    return recentErrors.length >= this.config.maxRetries;
  }

  /**
   * Clear error history (useful for testing or manual reset)
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error statistics for debugging
   */
  getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    this.errorHistory.forEach(error => {
      stats[error.errorType] = (stats[error.errorType] || 0) + 1;
    });
    
    return stats;
  }
}