/**
 * Unit tests for position calculation utilities
 * Tests smart positioning algorithms, responsive logic, and boundary constraints
 */

import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import {
  SmartLinePositioning,
  ResponsivePositioning,
  BoundaryConstraints,
  PositionUtils,
  DEFAULT_OVERLAY_DIMENSIONS,
  DEFAULT_POSITION_CONSTRAINTS,
  DEFAULT_RESPONSIVE_CONFIG,
  type OverlayPosition,
  type EditorBounds,
  type HighlightedLineInfo,
  type OverlayDimensions,
  type PositionConstraints,
  type ResponsiveConfig
} from '../positionCalculationUtils';

// Mock window object for tests
const mockWindow = {
  innerWidth: 1920,
  innerHeight: 1080
};

// @ts-expect-error - Mocking window for tests
global.window = mockWindow;

describe('SmartLinePositioning', () => {
  let smartPositioning: SmartLinePositioning;
  let editorBounds: EditorBounds;
  let highlightedLine: HighlightedLineInfo;

  beforeEach(() => {
    smartPositioning = new SmartLinePositioning();
    editorBounds = {
      left: 100,
      top: 100,
      right: 800,
      bottom: 600,
      width: 700,
      height: 500
    };
    highlightedLine = {
      lineNumber: 10,
      lineHeight: 20,
      lineTop: 200,
      lineBottom: 220
    };
  });

  describe('calculatePositionForHighlightedLine', () => {
    it('should position below highlighted line when space is available', () => {
      const position = smartPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
      
      expect(position.y).toBe(highlightedLine.lineBottom + DEFAULT_POSITION_CONSTRAINTS.preferredOffset);
      expect(position.x).toBeGreaterThanOrEqual(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(position.x + DEFAULT_OVERLAY_DIMENSIONS.width).toBeLessThanOrEqual(editorBounds.right - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should position above highlighted line when no space below', () => {
      // Position highlighted line near bottom
      const lowHighlightedLine: HighlightedLineInfo = {
        lineNumber: 20,
        lineHeight: 20,
        lineTop: 550,
        lineBottom: 570
      };

      const position = smartPositioning.calculatePositionForHighlightedLine(lowHighlightedLine, editorBounds);
      
      expect(position.y).toBeLessThan(lowHighlightedLine.lineTop);
      expect(position.y + DEFAULT_OVERLAY_DIMENSIONS.height).toBeLessThanOrEqual(lowHighlightedLine.lineTop - DEFAULT_POSITION_CONSTRAINTS.preferredOffset);
    });

    it('should use side positioning when vertical space is insufficient', () => {
      // Create very narrow vertical bounds
      const narrowBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 800,
        bottom: 250, // Very short height
        width: 700,
        height: 150
      };

      const position = smartPositioning.calculatePositionForHighlightedLine(highlightedLine, narrowBounds);
      
      // Should still return a valid position
      expect(position.x).toBeGreaterThanOrEqual(narrowBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(position.y).toBeGreaterThanOrEqual(narrowBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should use fallback position when no strategy works', () => {
      // Create impossibly small bounds
      const tinyBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 150,
        bottom: 150,
        width: 50,
        height: 50
      };

      const position = smartPositioning.calculatePositionForHighlightedLine(highlightedLine, tinyBounds);
      
      // Should return fallback centered position
      expect(position).toBeDefined();
      expect(typeof position.x).toBe('number');
      expect(typeof position.y).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle highlighted line at editor top', () => {
      const topHighlightedLine: HighlightedLineInfo = {
        lineNumber: 0,
        lineHeight: 20,
        lineTop: 100,
        lineBottom: 120
      };

      const position = smartPositioning.calculatePositionForHighlightedLine(topHighlightedLine, editorBounds);
      
      expect(position.y).toBeGreaterThanOrEqual(editorBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should handle highlighted line at editor bottom', () => {
      const bottomHighlightedLine: HighlightedLineInfo = {
        lineNumber: 25,
        lineHeight: 20,
        lineTop: 580,
        lineBottom: 600
      };

      const position = smartPositioning.calculatePositionForHighlightedLine(bottomHighlightedLine, editorBounds);
      
      expect(position.y + DEFAULT_OVERLAY_DIMENSIONS.height).toBeLessThanOrEqual(editorBounds.bottom - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should handle custom overlay dimensions', () => {
      const customDimensions: OverlayDimensions = { width: 400, height: 300 };
      const customPositioning = new SmartLinePositioning(DEFAULT_POSITION_CONSTRAINTS, customDimensions);

      const position = customPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
      
      expect(position.x + customDimensions.width).toBeLessThanOrEqual(editorBounds.right - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should handle custom constraints', () => {
      const customConstraints: PositionConstraints = {
        minMargin: 50,
        preferredOffset: 80,
        maxDistanceFromTarget: 300
      };
      const customPositioning = new SmartLinePositioning(customConstraints);

      const position = customPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
      
      expect(position.x).toBeGreaterThanOrEqual(editorBounds.left + customConstraints.minMargin);
      expect(position.y).toBeGreaterThanOrEqual(editorBounds.top + customConstraints.minMargin);
    });
  });
});

describe('ResponsivePositioning', () => {
  let responsivePositioning: ResponsivePositioning;
  let editorBounds: EditorBounds;

  beforeEach(() => {
    responsivePositioning = new ResponsivePositioning();
    editorBounds = {
      left: 50,
      top: 50,
      right: 750,
      bottom: 550,
      width: 700,
      height: 500
    };
  });

  describe('getDeviceType', () => {
    it('should return mobile for small screens', () => {
      mockWindow.innerWidth = 600;
      expect(responsivePositioning.getDeviceType()).toBe('mobile');
    });

    it('should return tablet for medium screens', () => {
      mockWindow.innerWidth = 900;
      expect(responsivePositioning.getDeviceType()).toBe('tablet');
    });

    it('should return desktop for large screens', () => {
      mockWindow.innerWidth = 1200;
      expect(responsivePositioning.getDeviceType()).toBe('desktop');
    });
  });

  describe('calculateResponsivePosition', () => {
    it('should use mobile positioning for mobile devices', () => {
      mockWindow.innerWidth = 600;
      
      const position = responsivePositioning.calculateResponsivePosition(editorBounds);
      
      // Mobile position should be at bottom with mobile margins
      expect(position.x).toBe(editorBounds.left + DEFAULT_RESPONSIVE_CONFIG.mobileMargin);
      expect(position.y).toBeGreaterThan(editorBounds.bottom - DEFAULT_OVERLAY_DIMENSIONS.height - DEFAULT_RESPONSIVE_CONFIG.mobileMargin - 50);
    });

    it('should use tablet positioning for tablet devices', () => {
      mockWindow.innerWidth = 900;
      
      const position = responsivePositioning.calculateResponsivePosition(editorBounds);
      
      expect(position.x).toBe(editorBounds.left + DEFAULT_RESPONSIVE_CONFIG.mobileMargin);
      expect(position.y).toBeGreaterThanOrEqual(editorBounds.top + DEFAULT_RESPONSIVE_CONFIG.mobileMargin);
    });

    it('should use desktop positioning for desktop devices', () => {
      mockWindow.innerWidth = 1200;
      
      const position = responsivePositioning.calculateResponsivePosition(editorBounds);
      
      // Desktop should center the overlay
      const expectedX = editorBounds.left + (editorBounds.width - DEFAULT_OVERLAY_DIMENSIONS.width) / 2;
      expect(position.x).toBeCloseTo(expectedX, 0);
    });

    it('should use smart positioning with highlighted line on desktop', () => {
      mockWindow.innerWidth = 1200;
      
      const highlightedLine: HighlightedLineInfo = {
        lineNumber: 5,
        lineHeight: 20,
        lineTop: 150,
        lineBottom: 170
      };

      const position = responsivePositioning.calculateResponsivePosition(editorBounds, highlightedLine);
      
      // Should position relative to highlighted line
      expect(position.y).toBeGreaterThan(highlightedLine.lineBottom);
    });
  });

  describe('responsive configuration', () => {
    it('should use custom responsive config', () => {
      const customConfig: ResponsiveConfig = {
        mobileBreakpoint: 600,
        tabletBreakpoint: 900,
        mobileMargin: 10,
        desktopMargin: 30
      };

      const customResponsive = new ResponsivePositioning(customConfig);
      mockWindow.innerWidth = 500;

      const position = customResponsive.calculateResponsivePosition(editorBounds);
      
      expect(position.x).toBe(editorBounds.left + customConfig.mobileMargin);
    });

    it('should handle shouldUseResponsiveLayout correctly', () => {
      mockWindow.innerWidth = 600;
      expect(responsivePositioning.shouldUseResponsiveLayout()).toBe(true);

      mockWindow.innerWidth = 1200;
      expect(responsivePositioning.shouldUseResponsiveLayout()).toBe(false);
    });

    it('should return correct margin for device type', () => {
      mockWindow.innerWidth = 600;
      expect(responsivePositioning.getCurrentMargin()).toBe(DEFAULT_RESPONSIVE_CONFIG.mobileMargin);

      mockWindow.innerWidth = 1200;
      expect(responsivePositioning.getCurrentMargin()).toBe(DEFAULT_RESPONSIVE_CONFIG.desktopMargin);
    });
  });
});

describe('BoundaryConstraints', () => {
  let boundaryConstraints: BoundaryConstraints;
  let editorBounds: EditorBounds;
  let position: OverlayPosition;

  beforeEach(() => {
    boundaryConstraints = new BoundaryConstraints();
    editorBounds = {
      left: 100,
      top: 100,
      right: 800,
      bottom: 600,
      width: 700,
      height: 500
    };
    position = {
      x: 200,
      y: 200,
      timestamp: Date.now(),
      screenSize: { width: 1920, height: 1080 }
    };
  });

  describe('isPositionValid', () => {
    it('should return true for valid positions', () => {
      expect(boundaryConstraints.isPositionValid(position, editorBounds)).toBe(true);
    });

    it('should return false for positions outside left boundary', () => {
      position.x = 50;
      expect(boundaryConstraints.isPositionValid(position, editorBounds)).toBe(false);
    });

    it('should return false for positions outside right boundary', () => {
      position.x = 750; // Would extend beyond right edge
      expect(boundaryConstraints.isPositionValid(position, editorBounds)).toBe(false);
    });

    it('should return false for positions outside top boundary', () => {
      position.y = 50;
      expect(boundaryConstraints.isPositionValid(position, editorBounds)).toBe(false);
    });

    it('should return false for positions outside bottom boundary', () => {
      position.y = 550; // Would extend beyond bottom edge
      expect(boundaryConstraints.isPositionValid(position, editorBounds)).toBe(false);
    });
  });

  describe('constrainToBounds', () => {
    it('should constrain position to left boundary', () => {
      position.x = 50;
      const constrained = boundaryConstraints.constrainToBounds(position, editorBounds);
      
      expect(constrained.x).toBe(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should constrain position to right boundary', () => {
      position.x = 750;
      const constrained = boundaryConstraints.constrainToBounds(position, editorBounds);
      
      expect(constrained.x + DEFAULT_OVERLAY_DIMENSIONS.width).toBeLessThanOrEqual(editorBounds.right - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should constrain position to top boundary', () => {
      position.y = 50;
      const constrained = boundaryConstraints.constrainToBounds(position, editorBounds);
      
      expect(constrained.y).toBe(editorBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should constrain position to bottom boundary', () => {
      position.y = 550;
      const constrained = boundaryConstraints.constrainToBounds(position, editorBounds);
      
      expect(constrained.y + DEFAULT_OVERLAY_DIMENSIONS.height).toBeLessThanOrEqual(editorBounds.bottom - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should handle bounds too small for overlay', () => {
      const smallBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 200,
        bottom: 200,
        width: 100,
        height: 100
      };

      const constrained = boundaryConstraints.constrainToBounds(position, smallBounds);
      
      // Should position at edge with margin
      expect(constrained.x).toBe(smallBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(constrained.y).toBe(smallBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });
  });

  describe('areBoundsSufficient', () => {
    it('should return true for sufficient bounds', () => {
      expect(boundaryConstraints.areBoundsSufficient(editorBounds)).toBe(true);
    });

    it('should return false for insufficient width', () => {
      const narrowBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 200,
        bottom: 600,
        width: 100,
        height: 500
      };

      expect(boundaryConstraints.areBoundsSufficient(narrowBounds)).toBe(false);
    });

    it('should return false for insufficient height', () => {
      const shortBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 800,
        bottom: 200,
        width: 700,
        height: 100
      };

      expect(boundaryConstraints.areBoundsSufficient(shortBounds)).toBe(false);
    });
  });

  describe('getSafePositioningArea', () => {
    it('should return safe area with margins', () => {
      const safeArea = boundaryConstraints.getSafePositioningArea(editorBounds);
      
      expect(safeArea.left).toBe(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(safeArea.top).toBe(editorBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(safeArea.right).toBe(editorBounds.right - DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(safeArea.bottom).toBe(editorBounds.bottom - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });
  });

  describe('validateAndAdjustPosition', () => {
    it('should constrain position when allowPartialOverlap is false', () => {
      position.x = 50;
      const adjusted = boundaryConstraints.validateAndAdjustPosition(position, editorBounds, false);
      
      expect(adjusted.x).toBe(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should allow partial overlap when allowPartialOverlap is true', () => {
      position.x = 50;
      const adjusted = boundaryConstraints.validateAndAdjustPosition(position, editorBounds, true);
      
      // Should allow position that shows at least half the overlay
      expect(adjusted.x).toBeGreaterThanOrEqual(editorBounds.left - DEFAULT_OVERLAY_DIMENSIONS.width / 2);
    });
  });

  describe('custom dimensions and margins', () => {
    it('should work with custom overlay dimensions', () => {
      const customDimensions: OverlayDimensions = { width: 400, height: 300 };
      const customConstraints = new BoundaryConstraints(customDimensions, 30);

      position.x = 750;
      const constrained = customConstraints.constrainToBounds(position, editorBounds);
      
      expect(constrained.x + customDimensions.width).toBeLessThanOrEqual(editorBounds.right - 30);
    });
  });
});

describe('PositionUtils', () => {
  describe('calculateDistance', () => {
    it('should calculate correct distance between positions', () => {
      const pos1: OverlayPosition = {
        x: 0,
        y: 0,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };
      const pos2: OverlayPosition = {
        x: 3,
        y: 4,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const distance = PositionUtils.calculateDistance(pos1, pos2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });
  });

  describe('arePositionsEqual', () => {
    it('should return true for positions within tolerance', () => {
      const pos1: OverlayPosition = {
        x: 100,
        y: 100,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };
      const pos2: OverlayPosition = {
        x: 103,
        y: 104,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      expect(PositionUtils.arePositionsEqual(pos1, pos2, 10)).toBe(true);
      expect(PositionUtils.arePositionsEqual(pos1, pos2, 3)).toBe(false);
    });
  });

  describe('createHighlightedLineInfo', () => {
    it('should create correct highlighted line info', () => {
      const editorBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 800,
        bottom: 600,
        width: 700,
        height: 500
      };

      const lineInfo = PositionUtils.createHighlightedLineInfo(5, editorBounds, 25);
      
      expect(lineInfo.lineNumber).toBe(5);
      expect(lineInfo.lineHeight).toBe(25);
      expect(lineInfo.lineTop).toBe(225); // 100 + (5 * 25)
      expect(lineInfo.lineBottom).toBe(250); // 225 + 25
    });
  });

  describe('getViewportBounds', () => {
    it('should return correct viewport bounds', () => {
      const viewport = PositionUtils.getViewportBounds();
      
      expect(viewport.left).toBe(0);
      expect(viewport.top).toBe(0);
      expect(viewport.right).toBe(mockWindow.innerWidth);
      expect(viewport.bottom).toBe(mockWindow.innerHeight);
      expect(viewport.width).toBe(mockWindow.innerWidth);
      expect(viewport.height).toBe(mockWindow.innerHeight);
    });
  });

  describe('isPositionInViewport', () => {
    it('should return true for positions within viewport', () => {
      const position: OverlayPosition = {
        x: 100,
        y: 100,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      expect(PositionUtils.isPositionInViewport(position, DEFAULT_OVERLAY_DIMENSIONS)).toBe(true);
    });

    it('should return false for positions outside viewport', () => {
      const position: OverlayPosition = {
        x: 2000,
        y: 100,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      expect(PositionUtils.isPositionInViewport(position, DEFAULT_OVERLAY_DIMENSIONS)).toBe(false);
    });
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  describe('zero and negative dimensions', () => {
    it('should handle zero-width editor bounds', () => {
      const zeroBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 100,
        bottom: 600,
        width: 0,
        height: 500
      };

      const constraints = new BoundaryConstraints();
      const position: OverlayPosition = {
        x: 100,
        y: 200,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const constrained = constraints.constrainToBounds(position, zeroBounds);
      expect(constrained).toBeDefined();
    });

    it('should handle negative coordinates', () => {
      const position: OverlayPosition = {
        x: -50,
        y: -50,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const editorBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600
      };

      const constraints = new BoundaryConstraints();
      const constrained = constraints.constrainToBounds(position, editorBounds);
      
      expect(constrained.x).toBeGreaterThanOrEqual(0);
      expect(constrained.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extreme screen sizes', () => {
    it('should handle very small screens', () => {
      mockWindow.innerWidth = 320;
      mockWindow.innerHeight = 568;

      const responsive = new ResponsivePositioning();
      const editorBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 320,
        bottom: 568,
        width: 320,
        height: 568
      };

      const position = responsive.calculateResponsivePosition(editorBounds);
      expect(position).toBeDefined();
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large screens', () => {
      mockWindow.innerWidth = 3840;
      mockWindow.innerHeight = 2160;

      const responsive = new ResponsivePositioning();
      const editorBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 3840,
        bottom: 2160,
        width: 3840,
        height: 2160
      };

      const position = responsive.calculateResponsivePosition(editorBounds);
      expect(position).toBeDefined();
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance with many calculations', () => {
    it('should handle rapid position calculations efficiently', () => {
      const smartPositioning = new SmartLinePositioning();
      const editorBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 800,
        bottom: 600,
        width: 700,
        height: 500
      };

      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const highlightedLine: HighlightedLineInfo = {
          lineNumber: i % 50,
          lineHeight: 20,
          lineTop: 100 + (i % 50) * 20,
          lineBottom: 120 + (i % 50) * 20
        };
        
        smartPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 calculations in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});