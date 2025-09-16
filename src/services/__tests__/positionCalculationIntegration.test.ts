/**
 * Integration tests for position calculation utilities with OverlayPositionManager
 * Verifies that the utilities work correctly together
 */

import { OverlayPositionManager } from '../overlayPositionManager';
import {
  SmartLinePositioning,
  ResponsivePositioning,
  BoundaryConstraints,
  PositionUtils,
  DEFAULT_OVERLAY_DIMENSIONS,
  DEFAULT_POSITION_CONSTRAINTS,
  DEFAULT_RESPONSIVE_CONFIG,
  type EditorBounds,
  type HighlightedLineInfo
} from '../positionCalculationUtils';

// Mock window object for tests
const mockWindow = {
  innerWidth: 1920,
  innerHeight: 1080
};

// @ts-expect-error - Mocking window for tests
global.window = mockWindow;

describe('Position Calculation Integration', () => {
  let manager: OverlayPositionManager;
  let editorBounds: EditorBounds;

  beforeEach(() => {
    manager = new OverlayPositionManager('test-problem');
    editorBounds = {
      left: 100,
      top: 100,
      right: 800,
      bottom: 600,
      width: 700,
      height: 500
    };
    mockWindow.innerWidth = 1920;
    mockWindow.innerHeight = 1080;
  });

  describe('OverlayPositionManager integration with utilities', () => {
    it('should use smart positioning for highlighted lines', () => {
      const highlightedLine = 10;
      const position = manager.calculateDefaultPosition(editorBounds, highlightedLine);

      // Should position below the highlighted line
      const expectedLineBottom = editorBounds.top + (highlightedLine * 20) + 20;
      const expectedY = expectedLineBottom + DEFAULT_POSITION_CONSTRAINTS.preferredOffset;

      expect(position.y).toBe(expectedY);
      expect(position.x).toBe(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.preferredOffset);
    });

    it('should use responsive positioning for mobile devices', () => {
      mockWindow.innerWidth = 600; // Mobile width

      const position = manager.calculateDefaultPosition(editorBounds);

      // Should use mobile positioning
      expect(position.x).toBe(editorBounds.left + DEFAULT_RESPONSIVE_CONFIG.mobileMargin);
      expect(position.y).toBeGreaterThan(editorBounds.bottom - DEFAULT_OVERLAY_DIMENSIONS.height - DEFAULT_RESPONSIVE_CONFIG.mobileMargin - 50);
    });

    it('should validate and constrain positions correctly', () => {
      const invalidPosition = {
        x: -50,
        y: -50,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const validatedPosition = manager.validatePosition(invalidPosition, editorBounds);

      expect(validatedPosition.x).toBe(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(validatedPosition.y).toBe(editorBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should provide device type information', () => {
      mockWindow.innerWidth = 1200;
      expect(manager.getDeviceType()).toBe('desktop');

      mockWindow.innerWidth = 900;
      expect(manager.getDeviceType()).toBe('tablet');

      mockWindow.innerWidth = 600;
      expect(manager.getDeviceType()).toBe('mobile');
    });

    it('should check bounds sufficiency', () => {
      expect(manager.areBoundsSufficient(editorBounds)).toBe(true);

      const smallBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100
      };

      expect(manager.areBoundsSufficient(smallBounds)).toBe(false);
    });

    it('should provide safe positioning area', () => {
      const safeArea = manager.getSafePositioningArea(editorBounds);

      expect(safeArea.left).toBe(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(safeArea.top).toBe(editorBounds.top + DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(safeArea.right).toBe(editorBounds.right - DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(safeArea.bottom).toBe(editorBounds.bottom - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should calculate distances between positions', () => {
      const pos1 = {
        x: 0,
        y: 0,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const pos2 = {
        x: 3,
        y: 4,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const distance = manager.calculateDistance(pos1, pos2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should compare positions for equality', () => {
      const pos1 = {
        x: 100,
        y: 100,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const pos2 = {
        x: 103,
        y: 104,
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      expect(manager.arePositionsEqual(pos1, pos2, 10)).toBe(true);
      expect(manager.arePositionsEqual(pos1, pos2, 3)).toBe(false);
    });
  });

  describe('Direct utility usage', () => {
    it('should work with SmartLinePositioning directly', () => {
      const smartPositioning = new SmartLinePositioning();
      const highlightedLine: HighlightedLineInfo = {
        lineNumber: 5,
        lineHeight: 20,
        lineTop: 200,
        lineBottom: 220
      };

      const position = smartPositioning.calculatePositionForHighlightedLine(highlightedLine, editorBounds);

      expect(position.y).toBe(highlightedLine.lineBottom + DEFAULT_POSITION_CONSTRAINTS.preferredOffset);
      expect(position.x).toBeGreaterThanOrEqual(editorBounds.left + DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should work with ResponsivePositioning directly', () => {
      const responsivePositioning = new ResponsivePositioning();

      mockWindow.innerWidth = 600;
      const mobilePosition = responsivePositioning.calculateResponsivePosition(editorBounds);
      expect(mobilePosition.x).toBe(editorBounds.left + DEFAULT_RESPONSIVE_CONFIG.mobileMargin);

      mockWindow.innerWidth = 1200;
      const desktopPosition = responsivePositioning.calculateResponsivePosition(editorBounds);
      expect(desktopPosition.x).toBeGreaterThan(mobilePosition.x);
    });

    it('should work with BoundaryConstraints directly', () => {
      const boundaryConstraints = new BoundaryConstraints();
      const position = {
        x: 1000, // Outside bounds
        y: 1000, // Outside bounds
        timestamp: Date.now(),
        screenSize: { width: 1920, height: 1080 }
      };

      const constrainedPosition = boundaryConstraints.constrainToBounds(position, editorBounds);

      expect(constrainedPosition.x).toBeLessThanOrEqual(editorBounds.right - DEFAULT_OVERLAY_DIMENSIONS.width - DEFAULT_POSITION_CONSTRAINTS.minMargin);
      expect(constrainedPosition.y).toBeLessThanOrEqual(editorBounds.bottom - DEFAULT_OVERLAY_DIMENSIONS.height - DEFAULT_POSITION_CONSTRAINTS.minMargin);
    });

    it('should work with PositionUtils directly', () => {
      const highlightedLineInfo = PositionUtils.createHighlightedLineInfo(10, editorBounds, 25);

      expect(highlightedLineInfo.lineNumber).toBe(10);
      expect(highlightedLineInfo.lineHeight).toBe(25);
      expect(highlightedLineInfo.lineTop).toBe(editorBounds.top + (10 * 25));
      expect(highlightedLineInfo.lineBottom).toBe(editorBounds.top + (10 * 25) + 25);

      const viewport = PositionUtils.getViewportBounds();
      expect(viewport.width).toBe(mockWindow.innerWidth);
      expect(viewport.height).toBe(mockWindow.innerHeight);
    });
  });

  describe('Edge case integration', () => {
    it('should handle very small editor bounds gracefully', () => {
      const tinyBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 150,
        bottom: 150,
        width: 50,
        height: 50
      };

      const position = manager.calculateDefaultPosition(tinyBounds, 5);

      // Should still return a valid position
      expect(position).toBeDefined();
      expect(typeof position.x).toBe('number');
      expect(typeof position.y).toBe('number');
      expect(position.x).toBeGreaterThanOrEqual(tinyBounds.left);
      expect(position.y).toBeGreaterThanOrEqual(tinyBounds.top);
    });

    it('should handle extreme screen sizes', () => {
      // Very small screen
      mockWindow.innerWidth = 320;
      mockWindow.innerHeight = 568;

      const smallScreenBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 320,
        bottom: 568,
        width: 320,
        height: 568
      };

      const position = manager.calculateDefaultPosition(smallScreenBounds);
      expect(position).toBeDefined();

      // Very large screen
      mockWindow.innerWidth = 3840;
      mockWindow.innerHeight = 2160;

      const largeScreenBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 3840,
        bottom: 2160,
        width: 3840,
        height: 2160
      };

      const largePosition = manager.calculateDefaultPosition(largeScreenBounds);
      expect(largePosition).toBeDefined();
    });

    it('should maintain consistency across multiple calculations', () => {
      const highlightedLine = 15;
      const position1 = manager.calculateDefaultPosition(editorBounds, highlightedLine);
      const position2 = manager.calculateDefaultPosition(editorBounds, highlightedLine);

      expect(manager.arePositionsEqual(position1, position2, 1)).toBe(true);
    });
  });
});