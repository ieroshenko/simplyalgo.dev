/**
 * Position Calculation Utilities
 * Smart positioning algorithms for highlighted lines, responsive positioning logic,
 * and boundary constraint functions for overlay positioning
 */

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

export interface OverlayDimensions {
  width: number;
  height: number;
}

export interface PositionConstraints {
  minMargin: number;
  preferredOffset: number;
  maxDistanceFromTarget: number;
}

export interface HighlightedLineInfo {
  lineNumber: number;
  lineHeight: number;
  lineTop: number;
  lineBottom: number;
}

export interface ResponsiveConfig {
  mobileBreakpoint: number;
  tabletBreakpoint: number;
  mobileMargin: number;
  desktopMargin: number;
}

// Default configurations
export const DEFAULT_OVERLAY_DIMENSIONS: OverlayDimensions = {
  width: 300,
  height: 200
};

export const DEFAULT_POSITION_CONSTRAINTS: PositionConstraints = {
  minMargin: 20,
  preferredOffset: 40,
  maxDistanceFromTarget: 200
};

export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
  mobileMargin: 16,
  desktopMargin: 20
};

/**
 * Smart positioning algorithm for highlighted lines
 * Calculates optimal position relative to a highlighted line with fallback strategies
 */
export class SmartLinePositioning {
  private constraints: PositionConstraints;
  private overlayDimensions: OverlayDimensions;

  constructor(
    constraints: PositionConstraints = DEFAULT_POSITION_CONSTRAINTS,
    overlayDimensions: OverlayDimensions = DEFAULT_OVERLAY_DIMENSIONS
  ) {
    this.constraints = constraints;
    this.overlayDimensions = overlayDimensions;
  }

  /**
   * Calculate position relative to highlighted line with smart fallback
   */
  calculatePositionForHighlightedLine(
    highlightedLine: HighlightedLineInfo,
    editorBounds: EditorBounds
  ): OverlayPosition {
    const strategies = [
      () => this.tryPositionBelow(highlightedLine, editorBounds),
      () => this.tryPositionAbove(highlightedLine, editorBounds),
      () => this.tryPositionSide(highlightedLine, editorBounds, 'right'),
      () => this.tryPositionSide(highlightedLine, editorBounds, 'left'),
      () => this.getFallbackPosition(editorBounds)
    ];

    for (const strategy of strategies) {
      const position = strategy();
      if (position && this.isPositionValid(position, editorBounds)) {
        return position;
      }
    }

    // Final fallback - should never reach here but ensures we always return a position
    return this.getFallbackPosition(editorBounds);
  }

  /**
   * Try positioning below the highlighted line
   */
  private tryPositionBelow(
    highlightedLine: HighlightedLineInfo,
    editorBounds: EditorBounds
  ): OverlayPosition | null {
    const y = highlightedLine.lineBottom + this.constraints.preferredOffset;
    
    // Check if there's enough space below
    if (y + this.overlayDimensions.height + this.constraints.minMargin > editorBounds.bottom) {
      return null;
    }

    const x = this.calculateOptimalHorizontalPosition(editorBounds);

    return {
      x,
      y,
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Try positioning above the highlighted line
   */
  private tryPositionAbove(
    highlightedLine: HighlightedLineInfo,
    editorBounds: EditorBounds
  ): OverlayPosition | null {
    const y = highlightedLine.lineTop - this.constraints.preferredOffset - this.overlayDimensions.height;
    
    // Check if there's enough space above
    if (y < editorBounds.top + this.constraints.minMargin) {
      return null;
    }

    const x = this.calculateOptimalHorizontalPosition(editorBounds);

    return {
      x,
      y,
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Try positioning to the side of the highlighted line
   */
  private tryPositionSide(
    highlightedLine: HighlightedLineInfo,
    editorBounds: EditorBounds,
    side: 'left' | 'right'
  ): OverlayPosition | null {
    let x: number;
    
    if (side === 'right') {
      x = editorBounds.right - this.overlayDimensions.width - this.constraints.minMargin;
      // Check if there's enough space on the right
      if (x < editorBounds.left + this.constraints.minMargin) {
        return null;
      }
    } else {
      x = editorBounds.left + this.constraints.minMargin;
      // Check if overlay would fit
      if (x + this.overlayDimensions.width + this.constraints.minMargin > editorBounds.right) {
        return null;
      }
    }

    // Center vertically relative to the highlighted line
    const y = Math.max(
      editorBounds.top + this.constraints.minMargin,
      Math.min(
        highlightedLine.lineTop - (this.overlayDimensions.height / 2) + (highlightedLine.lineHeight / 2),
        editorBounds.bottom - this.overlayDimensions.height - this.constraints.minMargin
      )
    );

    return {
      x,
      y,
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Calculate optimal horizontal position within editor bounds
   */
  private calculateOptimalHorizontalPosition(editorBounds: EditorBounds): number {
    // Try to position with some offset from the left edge
    const preferredX = editorBounds.left + this.constraints.preferredOffset;
    
    // Ensure it fits within bounds
    const maxX = editorBounds.right - this.overlayDimensions.width - this.constraints.minMargin;
    const minX = editorBounds.left + this.constraints.minMargin;
    
    return Math.max(minX, Math.min(preferredX, maxX));
  }

  /**
   * Get fallback position when no optimal position is found
   */
  private getFallbackPosition(editorBounds: EditorBounds): OverlayPosition {
    const x = editorBounds.left + (editorBounds.width - this.overlayDimensions.width) / 2;
    const y = editorBounds.top + (editorBounds.height - this.overlayDimensions.height) / 2;

    return {
      x: Math.max(editorBounds.left + this.constraints.minMargin, x),
      y: Math.max(editorBounds.top + this.constraints.minMargin, y),
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Check if position is valid within editor bounds
   */
  private isPositionValid(position: OverlayPosition, editorBounds: EditorBounds): boolean {
    return (
      position.x >= editorBounds.left + this.constraints.minMargin &&
      position.x + this.overlayDimensions.width <= editorBounds.right - this.constraints.minMargin &&
      position.y >= editorBounds.top + this.constraints.minMargin &&
      position.y + this.overlayDimensions.height <= editorBounds.bottom - this.constraints.minMargin
    );
  }
}

/**
 * Responsive positioning logic for mobile vs desktop
 */
export class ResponsivePositioning {
  private config: ResponsiveConfig;
  private overlayDimensions: OverlayDimensions;

  constructor(
    config: ResponsiveConfig = DEFAULT_RESPONSIVE_CONFIG,
    overlayDimensions: OverlayDimensions = DEFAULT_OVERLAY_DIMENSIONS
  ) {
    this.config = config;
    this.overlayDimensions = overlayDimensions;
  }

  /**
   * Get device type based on screen width
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    
    if (width < this.config.mobileBreakpoint) {
      return 'mobile';
    } else if (width < this.config.tabletBreakpoint) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Calculate responsive position based on device type
   */
  calculateResponsivePosition(
    editorBounds: EditorBounds,
    highlightedLine?: HighlightedLineInfo
  ): OverlayPosition {
    const deviceType = this.getDeviceType();

    switch (deviceType) {
      case 'mobile':
        return this.getMobilePosition(editorBounds);
      case 'tablet':
        return this.getTabletPosition(editorBounds, highlightedLine);
      case 'desktop':
        return this.getDesktopPosition(editorBounds, highlightedLine);
      default:
        return this.getDesktopPosition(editorBounds, highlightedLine);
    }
  }

  /**
   * Get mobile-optimized position (bottom-docked)
   */
  getMobilePosition(editorBounds: EditorBounds): OverlayPosition {
    // Position at bottom of editor with mobile margins
    const x = editorBounds.left + this.config.mobileMargin;
    const y = Math.max(
      editorBounds.top + this.config.mobileMargin,
      editorBounds.bottom - this.overlayDimensions.height - this.config.mobileMargin
    );

    return {
      x,
      y,
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Get tablet-optimized position
   */
  getTabletPosition(
    editorBounds: EditorBounds,
    highlightedLine?: HighlightedLineInfo
  ): OverlayPosition {
    if (highlightedLine) {
      // Use smart positioning but with tablet-specific constraints
      const smartPositioning = new SmartLinePositioning(
        {
          minMargin: this.config.mobileMargin,
          preferredOffset: 30,
          maxDistanceFromTarget: 150
        },
        this.overlayDimensions
      );
      return smartPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
    }

    // Default tablet position - slightly offset from center
    const x = editorBounds.left + this.config.mobileMargin;
    const y = editorBounds.top + (editorBounds.height - this.overlayDimensions.height) / 3;

    return {
      x,
      y: Math.max(editorBounds.top + this.config.mobileMargin, y),
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Get desktop-optimized position with full smart positioning
   */
  getDesktopPosition(
    editorBounds: EditorBounds,
    highlightedLine?: HighlightedLineInfo
  ): OverlayPosition {
    if (highlightedLine) {
      const smartPositioning = new SmartLinePositioning(
        {
          minMargin: this.config.desktopMargin,
          preferredOffset: DEFAULT_POSITION_CONSTRAINTS.preferredOffset,
          maxDistanceFromTarget: DEFAULT_POSITION_CONSTRAINTS.maxDistanceFromTarget
        },
        this.overlayDimensions
      );
      return smartPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
    }

    // Default desktop position - centered with offset
    const x = editorBounds.left + (editorBounds.width - this.overlayDimensions.width) / 2;
    const y = editorBounds.top + (editorBounds.height - this.overlayDimensions.height) / 2;

    return {
      x: Math.max(editorBounds.left + this.config.desktopMargin, x),
      y: Math.max(editorBounds.top + this.config.desktopMargin, y),
      timestamp: Date.now(),
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  /**
   * Check if current screen size requires responsive adjustments
   */
  shouldUseResponsiveLayout(): boolean {
    return this.getDeviceType() !== 'desktop';
  }

  /**
   * Get appropriate margin for current device type
   */
  getCurrentMargin(): number {
    const deviceType = this.getDeviceType();
    return deviceType === 'desktop' ? this.config.desktopMargin : this.config.mobileMargin;
  }
}

/**
 * Boundary constraint and validation functions
 */
export class BoundaryConstraints {
  private overlayDimensions: OverlayDimensions;
  private minMargin: number;

  constructor(
    overlayDimensions: OverlayDimensions = DEFAULT_OVERLAY_DIMENSIONS,
    minMargin: number = DEFAULT_POSITION_CONSTRAINTS.minMargin
  ) {
    this.overlayDimensions = overlayDimensions;
    this.minMargin = minMargin;
  }

  /**
   * Validate if position is within bounds
   */
  isPositionValid(position: OverlayPosition, bounds: EditorBounds): boolean {
    return (
      position.x >= bounds.left + this.minMargin &&
      position.x + this.overlayDimensions.width <= bounds.right - this.minMargin &&
      position.y >= bounds.top + this.minMargin &&
      position.y + this.overlayDimensions.height <= bounds.bottom - this.minMargin
    );
  }

  /**
   * Constrain position to stay within bounds
   */
  constrainToBounds(position: OverlayPosition, bounds: EditorBounds): OverlayPosition {
    let { x, y } = position;

    // Constrain horizontally
    const minX = bounds.left + this.minMargin;
    const maxX = bounds.right - this.overlayDimensions.width - this.minMargin;
    
    if (maxX < minX) {
      // Bounds too small - position at left edge with margin
      x = minX;
    } else {
      x = Math.max(minX, Math.min(maxX, x));
    }

    // Constrain vertically
    const minY = bounds.top + this.minMargin;
    const maxY = bounds.bottom - this.overlayDimensions.height - this.minMargin;
    
    if (maxY < minY) {
      // Bounds too small - position at top edge with margin
      y = minY;
    } else {
      y = Math.max(minY, Math.min(maxY, y));
    }

    return {
      ...position,
      x,
      y
    };
  }

  /**
   * Check if bounds are large enough to contain the overlay
   */
  areBoundsSufficient(bounds: EditorBounds): boolean {
    const requiredWidth = this.overlayDimensions.width + (2 * this.minMargin);
    const requiredHeight = this.overlayDimensions.height + (2 * this.minMargin);
    
    return bounds.width >= requiredWidth && bounds.height >= requiredHeight;
  }

  /**
   * Get minimum required bounds for the overlay
   */
  getMinimumRequiredBounds(): { width: number; height: number } {
    return {
      width: this.overlayDimensions.width + (2 * this.minMargin),
      height: this.overlayDimensions.height + (2 * this.minMargin)
    };
  }

  /**
   * Calculate safe positioning area within bounds
   */
  getSafePositioningArea(bounds: EditorBounds): EditorBounds {
    return {
      left: bounds.left + this.minMargin,
      top: bounds.top + this.minMargin,
      right: bounds.right - this.minMargin,
      bottom: bounds.bottom - this.minMargin,
      width: bounds.width - (2 * this.minMargin),
      height: bounds.height - (2 * this.minMargin)
    };
  }

  /**
   * Validate and adjust position for edge cases
   */
  validateAndAdjustPosition(
    position: OverlayPosition,
    bounds: EditorBounds,
    allowPartialOverlap: boolean = false
  ): OverlayPosition {
    if (!allowPartialOverlap) {
      return this.constrainToBounds(position, bounds);
    }

    // Allow partial overlap but ensure at least 50% of overlay is visible
    const halfWidth = this.overlayDimensions.width / 2;
    const halfHeight = this.overlayDimensions.height / 2;

    let { x, y } = position;

    // Ensure at least half the overlay is horizontally visible
    const minX = bounds.left - halfWidth;
    const maxX = bounds.right - halfWidth;
    x = Math.max(minX, Math.min(maxX, x));

    // Ensure at least half the overlay is vertically visible
    const minY = bounds.top - halfHeight;
    const maxY = bounds.bottom - halfHeight;
    y = Math.max(minY, Math.min(maxY, y));

    return {
      ...position,
      x,
      y
    };
  }
}

/**
 * Utility functions for position calculations
 */
export const PositionUtils = {
  /**
   * Calculate distance between two positions
   */
  calculateDistance(pos1: OverlayPosition, pos2: OverlayPosition): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Check if two positions are approximately equal
   */
  arePositionsEqual(pos1: OverlayPosition, pos2: OverlayPosition, tolerance: number = 5): boolean {
    return this.calculateDistance(pos1, pos2) <= tolerance;
  },

  /**
   * Create highlighted line info from line number and editor bounds
   */
  createHighlightedLineInfo(
    lineNumber: number,
    editorBounds: EditorBounds,
    lineHeight: number = 20
  ): HighlightedLineInfo {
    const lineTop = editorBounds.top + (lineNumber * lineHeight);
    return {
      lineNumber,
      lineHeight,
      lineTop,
      lineBottom: lineTop + lineHeight
    };
  },

  /**
   * Get viewport bounds
   */
  getViewportBounds(): EditorBounds {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight
    };
  },

  /**
   * Check if position is within viewport
   */
  isPositionInViewport(position: OverlayPosition, overlayDimensions: OverlayDimensions): boolean {
    const viewport = this.getViewportBounds();
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.x + overlayDimensions.width <= viewport.width &&
      position.y + overlayDimensions.height <= viewport.height
    );
  }
};