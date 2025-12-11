import { LocalStorageService } from './localStorageService';
import {
  SmartLinePositioning,
  ResponsivePositioning,
  BoundaryConstraints,
  PositionUtils,
  DEFAULT_OVERLAY_DIMENSIONS,
  DEFAULT_POSITION_CONSTRAINTS,
  DEFAULT_RESPONSIVE_CONFIG,
  type HighlightedLineInfo,
  type OverlayDimensions,
  type PositionConstraints,
  type ResponsiveConfig
} from './positionCalculationUtils';
import { ErrorRecoveryService, ErrorRecoveryStrategy, type ErrorContext } from './errorRecoveryService';
import { debounce, memoize, performanceMonitor, CleanupManager } from './performanceOptimizer';
import { logger } from '@/utils/logger';

export interface OverlayPosition {
  x: number;
  y: number;
  timestamp: number;
  screenSize: { width: number; height: number };
}

export interface EditorBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export class OverlayPositionManager {
  private storageKey: string;
  private storageService: LocalStorageService;
  private smartPositioning: SmartLinePositioning;
  private responsivePositioning: ResponsivePositioning;
  private boundaryConstraints: BoundaryConstraints;
  private overlayDimensions: OverlayDimensions;
  private constraints: PositionConstraints;
  private responsiveConfig: ResponsiveConfig;
  private errorRecovery: ErrorRecoveryService;
  private cleanupManager: CleanupManager;
  private debouncedSave: (position: OverlayPosition) => void;

  constructor(
    problemId: string,
    overlayDimensions: OverlayDimensions = DEFAULT_OVERLAY_DIMENSIONS,
    constraints: PositionConstraints = DEFAULT_POSITION_CONSTRAINTS,
    responsiveConfig: ResponsiveConfig = DEFAULT_RESPONSIVE_CONFIG
  ) {
    this.storageKey = `overlay_position_${problemId}`;
    this.overlayDimensions = overlayDimensions;
    this.constraints = constraints;
    this.responsiveConfig = responsiveConfig;

    this.storageService = new LocalStorageService({
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      fallbackPosition: { x: 0, y: 0 }
    });

    // Initialize utility classes with configurations
    this.smartPositioning = new SmartLinePositioning(constraints, overlayDimensions);
    this.responsivePositioning = new ResponsivePositioning(responsiveConfig, overlayDimensions);
    this.boundaryConstraints = new BoundaryConstraints(overlayDimensions, constraints.minMargin);
    this.errorRecovery = new ErrorRecoveryService({
      strategy: ErrorRecoveryStrategy.ADAPTIVE_FALLBACK,
      safeMargin: constraints.minMargin,
      minOverlaySize: { width: overlayDimensions.width, height: overlayDimensions.height },
    });

    this.cleanupManager = new CleanupManager();

    // Create debounced save function to prevent excessive storage writes
    this.debouncedSave = debounce((position: OverlayPosition) => {
      this.savePositionImmediate(position);
    }, 300);
  }

  /**
   * Calculate default position based on editor bounds and optional highlighted line
   */
  calculateDefaultPosition = memoize((editorBounds: EditorBounds, highlightedLine?: number): OverlayPosition => {
    const endMeasurement = performanceMonitor.startMeasurement('calculateDefaultPosition');

    try {
      // Convert line number to HighlightedLineInfo if provided
      let highlightedLineInfo: HighlightedLineInfo | undefined;
      if (highlightedLine !== undefined && highlightedLine >= 0) {
        highlightedLineInfo = PositionUtils.createHighlightedLineInfo(
          highlightedLine,
          editorBounds,
          20 // Default line height
        );
      }

      // Use responsive positioning for optimal device-specific behavior
      return this.responsivePositioning.calculateResponsivePosition(editorBounds, highlightedLineInfo);
    } finally {
      endMeasurement();
    }
  }, (editorBounds, highlightedLine) =>
    `${editorBounds.left}-${editorBounds.top}-${editorBounds.width}-${editorBounds.height}-${highlightedLine || 'none'}-${window.innerWidth}-${window.innerHeight}`
  );

  /**
   * Get saved position from local storage
   */
  getSavedPosition(): OverlayPosition | null {
    try {
      const saved = this.storageService.load<OverlayPosition>(this.storageKey);

      if (!saved || this.storageService.isExpired(saved.timestamp)) {
        return null;
      }

      return saved;
    } catch (error) {
      logger.warn('[OverlayPositionManager] Failed to load saved position', { problemId: this.storageKey, error });
      return null;
    }
  }

  /**
   * Save position to local storage with debouncing to prevent excessive writes
   */
  savePosition(position: OverlayPosition): void {
    this.debouncedSave(position);
  }

  /**
   * Save position immediately without debouncing (internal use)
   */
  private savePositionImmediate(position: OverlayPosition): void {
    try {
      const positionWithTimestamp = {
        ...position,
        timestamp: Date.now(),
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      this.storageService.save(this.storageKey, positionWithTimestamp);
      // Record successful position for error recovery
      this.errorRecovery.recordSuccessfulPosition(positionWithTimestamp);
    } catch (error) {
      logger.warn('[OverlayPositionManager] Failed to save position', { problemId: this.storageKey, error });
      // Handle storage failure but don't throw - this is not critical
      this.errorRecovery.handleError({
        errorType: 'storage_failed',
        originalError: error instanceof Error ? error : new Error(String(error)),
        attemptCount: 1,
        lastKnownPosition: position,
      });
    }
  }

  /**
   * Validate and constrain position to editor bounds
   */
  validatePosition(position: OverlayPosition, editorBounds: EditorBounds): OverlayPosition {
    return this.boundaryConstraints.constrainToBounds(position, editorBounds);
  }

  /**
   * Get mobile-optimized position (docked to bottom)
   */
  getMobilePosition(editorBounds: EditorBounds): OverlayPosition {
    return this.responsivePositioning.getMobilePosition(editorBounds);
  }

  /**
   * Get desktop position with smart positioning relative to highlighted line
   */
  getDesktopPosition(editorBounds: EditorBounds, highlightedLine?: number): OverlayPosition {
    // Convert line number to HighlightedLineInfo if provided
    let highlightedLineInfo: HighlightedLineInfo | undefined;
    if (highlightedLine !== undefined && highlightedLine >= 0) {
      highlightedLineInfo = PositionUtils.createHighlightedLineInfo(
        highlightedLine,
        editorBounds,
        20 // Default line height
      );
    }

    return this.responsivePositioning.getDesktopPosition(editorBounds, highlightedLineInfo);
  }

  /**
   * Check if position is valid within editor bounds
   */
  isPositionValid(position: OverlayPosition, editorBounds: EditorBounds): boolean {
    return this.boundaryConstraints.isPositionValid(position, editorBounds);
  }

  /**
   * Constrain position to stay within editor bounds
   */
  constrainToBounds(position: OverlayPosition, bounds: EditorBounds): OverlayPosition {
    return this.boundaryConstraints.constrainToBounds(position, bounds);
  }

  /**
   * Get position with fallback handling for various error scenarios
   */
  getPositionWithFallback(editorBounds?: EditorBounds, highlightedLine?: number): OverlayPosition {
    try {
      // Try to get saved position first
      if (editorBounds) {
        try {
          const savedPosition = this.getSavedPosition();
          if (savedPosition) {
            const validatedPosition = this.validatePosition(savedPosition, editorBounds);
            // If the validated position is significantly different, it means the saved position was invalid
            const isSignificantlyDifferent =
              Math.abs(validatedPosition.x - savedPosition.x) > 50 ||
              Math.abs(validatedPosition.y - savedPosition.y) > 50;

            if (!isSignificantlyDifferent) {
              this.errorRecovery.recordSuccessfulPosition(validatedPosition);
              return validatedPosition;
            }
          }

          // Calculate default position
          const defaultPosition = this.calculateDefaultPosition(editorBounds, highlightedLine);
          this.errorRecovery.recordSuccessfulPosition(defaultPosition);
          return defaultPosition;
        } catch (error) {
          // Handle calculation errors
          logger.warn('[OverlayPositionManager] Position calculation failed, using error recovery', { error });
          return this.errorRecovery.handleError({
            errorType: 'calculation_failed',
            originalError: error instanceof Error ? error : new Error(String(error)),
            attemptCount: 1,
            editorBounds,
          });
        }
      }

      // Handle missing editor bounds
      return this.errorRecovery.handleError({
        errorType: 'editor_unavailable',
        attemptCount: 1,
      });
    } catch (error) {
      // Ultimate fallback for any unexpected errors
      logger.error('[OverlayPositionManager] Critical error in getPositionWithFallback', { error });
      return this.errorRecovery.handleError({
        errorType: 'calculation_failed',
        originalError: error instanceof Error ? error : new Error(String(error)),
        attemptCount: 1,
      });
    }
  }

  /**
   * Get viewport-centered fallback position when editor bounds are unavailable
   */
  private getViewportCenteredFallback(): OverlayPosition {
    const viewport = PositionUtils.getViewportBounds();
    const screenSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    return {
      x: (viewport.width / 2) - (this.overlayDimensions.width / 2),
      y: (viewport.height / 2) - (this.overlayDimensions.height / 2),
      timestamp: Date.now(),
      screenSize
    };
  }

  /**
   * Calculate position for highlighted line using smart positioning
   */
  calculatePositionForHighlightedLine(
    highlightedLine: HighlightedLineInfo,
    editorBounds: EditorBounds
  ): OverlayPosition {
    return this.smartPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
  }

  /**
   * Get device type for responsive behavior
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    return this.responsivePositioning.getDeviceType();
  }

  /**
   * Check if bounds are sufficient for overlay
   */
  areBoundsSufficient(bounds: EditorBounds): boolean {
    return this.boundaryConstraints.areBoundsSufficient(bounds);
  }

  /**
   * Get safe positioning area within bounds
   */
  getSafePositioningArea(bounds: EditorBounds): EditorBounds {
    return this.boundaryConstraints.getSafePositioningArea(bounds);
  }

  /**
   * Validate and adjust position with optional partial overlap
   */
  validateAndAdjustPosition(
    position: OverlayPosition,
    bounds: EditorBounds,
    allowPartialOverlap: boolean = false
  ): OverlayPosition {
    return this.boundaryConstraints.validateAndAdjustPosition(position, bounds, allowPartialOverlap);
  }

  /**
   * Calculate distance between two positions
   */
  calculateDistance(pos1: OverlayPosition, pos2: OverlayPosition): number {
    return PositionUtils.calculateDistance(pos1, pos2);
  }

  /**
   * Check if two positions are approximately equal
   */
  arePositionsEqual(pos1: OverlayPosition, pos2: OverlayPosition, tolerance: number = 5): boolean {
    return PositionUtils.arePositionsEqual(pos1, pos2, tolerance);
  }

  /**
   * Clean up expired position data and optimize storage
   */
  cleanupExpiredData(): void {
    try {
      // Get all stored positions for cleanup
      const allKeys = this.storageService.getAllKeys?.() || [];
      const positionKeys = allKeys.filter(key => key.startsWith('overlay_position_'));

      let cleanedCount = 0;
      positionKeys.forEach(key => {
        try {
          const data = this.storageService.load(key);
          if (!data || this.isExpired(data)) {
            this.storageService.remove(key);
            cleanedCount++;
          }
        } catch (error) {
          // Remove corrupted entries
          this.storageService.remove(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        logger.debug('[OverlayPositionManager] Cleaned up expired position entries', { cleanedCount });
      }
    } catch (error) {
      logger.warn('[OverlayPositionManager] Failed to cleanup expired data', { error });
    }
  }

  /**
   * Check if position data is expired
   */
  private isExpired(position: OverlayPosition): boolean {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Date.now() - position.timestamp > maxAge;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    return performanceMonitor.getAllStats();
  }

  /**
   * Cleanup resources and stop background tasks
   */
  cleanup(): void {
    try {
      // Cleanup expired data
      this.cleanupExpiredData();

      // Cleanup manager handles intervals, timeouts, etc.
      this.cleanupManager.cleanup();

      logger.debug('[OverlayPositionManager] Cleanup completed');
    } catch (error) {
      logger.warn('[OverlayPositionManager] Error during cleanup', { error });
    }
  }

  /**
   * Initialize background cleanup task
   */
  startBackgroundCleanup(intervalMs: number = 60 * 60 * 1000): void { // Default: 1 hour
    this.cleanupManager.addInterval(() => {
      this.cleanupExpiredData();
    }, intervalMs);
  }
}