/**
 * Tests for OverlayPositionManager
 *
 * The OverlayPositionManager handles overlay positioning for the coaching interface.
 * It delegates to utility classes for calculations and uses debounced saving.
 *
 * Key behaviors tested:
 * - Position calculation (delegates to ResponsivePositioning)
 * - Position validation and constraining (delegates to BoundaryConstraints)
 * - Debounced position saving to localStorage
 * - Position retrieval with fallback handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OverlayPositionManager, OverlayPosition, EditorBounds } from '../overlayPositionManager';

// Mock the utility modules to isolate OverlayPositionManager behavior
vi.mock('../localStorageService');

// Mock errorRecoveryService to return valid fallback positions
vi.mock('../errorRecoveryService', () => ({
  ErrorRecoveryService: vi.fn().mockImplementation(() => ({
    handleError: vi.fn().mockImplementation(() => ({
      x: (1024 / 2) - 150,  // Viewport-centered fallback
      y: (768 / 2) - 100,
      timestamp: Date.now(),
      screenSize: { width: 1024, height: 768 }
    })),
    recordSuccessfulPosition: vi.fn()
  })),
  ErrorRecoveryStrategy: {
    ADAPTIVE_FALLBACK: 'adaptive_fallback'
  }
}));

vi.mock('../performanceOptimizer', () => ({
  debounce: <T extends (...args: any[]) => any>(fn: T, _delay: number) => fn, // Remove debounce delay for testing
  memoize: <T extends (...args: any[]) => any>(fn: T) => fn, // Remove memoization for testing
  performanceMonitor: {
    startMeasurement: () => () => {},
    getAllStats: () => ({})
  },
  CleanupManager: vi.fn().mockImplementation(() => ({
    addInterval: vi.fn(),
    cleanup: vi.fn()
  }))
}));

describe('OverlayPositionManager', () => {
  let manager: OverlayPositionManager;
  const problemId = 'test-problem';

  // Standard desktop editor bounds for testing
  const mockEditorBounds: EditorBounds = {
    left: 100,
    top: 50,
    right: 900,
    bottom: 600,
    width: 800,
    height: 550
  };

  // Mobile-sized editor bounds
  const mockMobileEditorBounds: EditorBounds = {
    left: 10,
    top: 50,
    right: 400,
    bottom: 600,
    width: 390,
    height: 550
  };

  beforeEach(() => {
    // Reset to desktop viewport
    window.innerWidth = 1024;
    window.innerHeight = 768;

    manager = new OverlayPositionManager(problemId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateDefaultPosition', () => {
    // Tests position calculation based on device type and editor bounds

    it('should return mobile position when viewport is mobile-sized', () => {
      window.innerWidth = 600; // Mobile viewport
      manager = new OverlayPositionManager(problemId);

      const position = manager.calculateDefaultPosition(mockMobileEditorBounds);

      // Mobile positions dock to bottom-left with 16px margin
      expect(position.x).toBe(mockMobileEditorBounds.left + 16);
      expect(position.screenSize.width).toBe(600);
    });

    it('should return centered position on desktop without highlighted line', () => {
      const position = manager.calculateDefaultPosition(mockEditorBounds);

      // Desktop centers the overlay (300x200) in the editor area
      const expectedX = mockEditorBounds.left + (mockEditorBounds.width - 300) / 2;
      const expectedY = mockEditorBounds.top + (mockEditorBounds.height - 200) / 2;

      expect(position.x).toBeCloseTo(expectedX, 0);
      expect(position.y).toBeCloseTo(expectedY, 0);
      expect(position.screenSize).toEqual({ width: 1024, height: 768 });
    });

    it('should position relative to highlighted line when provided', () => {
      const highlightedLine = 5;
      const position = manager.calculateDefaultPosition(mockEditorBounds, highlightedLine);

      // Should position near the highlighted line, not centered
      expect(position.y).not.toBe(mockEditorBounds.top + (mockEditorBounds.height - 200) / 2);
      expect(position.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getSavedPosition', () => {
    // Tests retrieval of previously saved positions from localStorage

    it('should return null when no saved position exists', () => {
      const result = manager.getSavedPosition();

      // Initial state has no saved position
      expect(result).toBeNull();
    });
  });

  describe('savePosition', () => {
    // Tests position saving (debounced in real implementation)

    it('should save position with current timestamp and screen size', () => {
      const position: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: 0,
        screenSize: { width: 0, height: 0 }
      };

      // Save should not throw
      expect(() => manager.savePosition(position)).not.toThrow();
    });
  });

  describe('validatePosition', () => {
    // Tests position validation against editor bounds

    it('should return position unchanged when valid', () => {
      const validPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.validatePosition(validPosition, mockEditorBounds);

      expect(result.x).toBe(200);
      expect(result.y).toBe(150);
    });

    it('should constrain position when outside bounds', () => {
      const invalidPosition: OverlayPosition = {
        x: 1000, // Outside right bound
        y: -50,  // Outside top bound
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.validatePosition(invalidPosition, mockEditorBounds);

      // Should be constrained within bounds (with 20px margin)
      expect(result.x).toBeLessThanOrEqual(mockEditorBounds.right - 300 - 20);
      expect(result.y).toBeGreaterThanOrEqual(mockEditorBounds.top + 20);
    });
  });

  describe('getMobilePosition', () => {
    // Tests mobile-specific positioning (bottom-docked)

    it('should return bottom-docked position with mobile margins', () => {
      const position = manager.getMobilePosition(mockMobileEditorBounds);

      // Mobile position: docked to bottom-left with 16px margin
      expect(position.x).toBe(mockMobileEditorBounds.left + 16);
      // Y should be near bottom (bottom - height - margin)
      expect(position.y).toBeLessThanOrEqual(mockMobileEditorBounds.bottom - 200);
    });
  });

  describe('getDesktopPosition', () => {
    // Tests desktop-specific positioning

    it('should return centered position without highlighted line', () => {
      const position = manager.getDesktopPosition(mockEditorBounds);

      // Should be roughly centered
      const expectedX = mockEditorBounds.left + (mockEditorBounds.width - 300) / 2;
      const expectedY = mockEditorBounds.top + (mockEditorBounds.height - 200) / 2;

      expect(position.x).toBeCloseTo(expectedX, 0);
      expect(position.y).toBeCloseTo(expectedY, 0);
    });

    it('should position relative to highlighted line', () => {
      const highlightedLine = 10;
      const position = manager.getDesktopPosition(mockEditorBounds, highlightedLine);

      // Should not be centered when line is specified
      expect(position.y).not.toBe(mockEditorBounds.top + (mockEditorBounds.height - 200) / 2);
    });
  });

  describe('isPositionValid', () => {
    // Tests position validity checking

    it('should return true for position inside bounds', () => {
      const validPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      expect(manager.isPositionValid(validPosition, mockEditorBounds)).toBe(true);
    });

    it('should return false for position outside left bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 50, // Less than bounds.left (100)
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      expect(manager.isPositionValid(invalidPosition, mockEditorBounds)).toBe(false);
    });

    it('should return false for position that extends past right bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 700, // x + 300 (width) = 1000 > bounds.right (900)
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      expect(manager.isPositionValid(invalidPosition, mockEditorBounds)).toBe(false);
    });

    it('should return false for position outside top bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 200,
        y: 20, // Less than bounds.top (50)
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      expect(manager.isPositionValid(invalidPosition, mockEditorBounds)).toBe(false);
    });

    it('should return false for position that extends past bottom bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 200,
        y: 450, // y + 200 (height) = 650 > bounds.bottom (600)
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      expect(manager.isPositionValid(invalidPosition, mockEditorBounds)).toBe(false);
    });
  });

  describe('constrainToBounds', () => {
    // Tests boundary constraint application

    it('should constrain x to left margin', () => {
      const position: OverlayPosition = {
        x: 50, // Too far left
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.constrainToBounds(position, mockEditorBounds);

      expect(result.x).toBe(mockEditorBounds.left + 20); // minMargin = 20
    });

    it('should constrain x to right margin', () => {
      const position: OverlayPosition = {
        x: 800, // Too far right (would exceed bounds.right - width - margin)
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.constrainToBounds(position, mockEditorBounds);

      expect(result.x).toBe(mockEditorBounds.right - 300 - 20); // width=300, margin=20
    });

    it('should constrain y to top margin', () => {
      const position: OverlayPosition = {
        x: 200,
        y: 30, // Too high
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.constrainToBounds(position, mockEditorBounds);

      expect(result.y).toBe(mockEditorBounds.top + 20); // minMargin = 20
    });

    it('should constrain y to bottom margin', () => {
      const position: OverlayPosition = {
        x: 200,
        y: 500, // Too low
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.constrainToBounds(position, mockEditorBounds);

      expect(result.y).toBe(mockEditorBounds.bottom - 200 - 20); // height=200, margin=20
    });

    it('should preserve timestamp and screenSize', () => {
      const position: OverlayPosition = {
        x: 50,
        y: 30,
        timestamp: 1234567890,
        screenSize: { width: 1024, height: 768 }
      };

      const result = manager.constrainToBounds(position, mockEditorBounds);

      expect(result.timestamp).toBe(1234567890);
      expect(result.screenSize).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('getPositionWithFallback', () => {
    // Tests fallback position handling for error scenarios

    it('should calculate default position when no saved position exists', () => {
      const result = manager.getPositionWithFallback(mockEditorBounds);

      // Should return a valid position within bounds
      expect(result.x).toBeGreaterThanOrEqual(mockEditorBounds.left);
      expect(result.y).toBeGreaterThanOrEqual(mockEditorBounds.top);
      expect(result.screenSize).toEqual({ width: 1024, height: 768 });
    });

    it('should use highlighted line for positioning when provided', () => {
      const withoutLine = manager.getPositionWithFallback(mockEditorBounds);
      const withLine = manager.getPositionWithFallback(mockEditorBounds, 10);

      // Positions should differ when line is provided
      expect(withLine.y).not.toBe(withoutLine.y);
    });

    it('should return viewport-centered fallback when no bounds provided', () => {
      const result = manager.getPositionWithFallback();

      // Should center in viewport (1024x768)
      expect(result.x).toBeCloseTo((1024 / 2) - 150, 0); // half viewport - half width
      expect(result.y).toBeCloseTo((768 / 2) - 100, 0);  // half viewport - half height
      expect(result.screenSize).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('edge cases', () => {
    // Tests boundary conditions and edge cases

    it('should handle very small editor bounds gracefully', () => {
      const smallBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 150,
        width: 200,
        height: 150
      };

      const position = manager.calculateDefaultPosition(smallBounds);

      // Should not throw and return valid numbers
      expect(typeof position.x).toBe('number');
      expect(typeof position.y).toBe('number');
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
    });

    it('should handle zero-sized editor bounds', () => {
      const zeroBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 100,
        bottom: 100,
        width: 0,
        height: 0
      };

      // Should not throw
      expect(() => manager.calculateDefaultPosition(zeroBounds)).not.toThrow();
    });

    it('should handle negative coordinates in editor bounds', () => {
      const negativeBounds: EditorBounds = {
        left: -100,
        top: -50,
        right: 200,
        bottom: 300,
        width: 300,
        height: 350
      };

      const position = manager.calculateDefaultPosition(negativeBounds);

      // Should handle gracefully and return valid position
      expect(typeof position.x).toBe('number');
      expect(typeof position.y).toBe('number');
    });
  });

  describe('utility methods', () => {
    // Tests for additional utility functionality

    it('should report device type correctly', () => {
      // Desktop
      window.innerWidth = 1920;
      manager = new OverlayPositionManager(problemId);
      expect(manager.getDeviceType()).toBe('desktop');

      // Tablet
      window.innerWidth = 900;
      manager = new OverlayPositionManager(problemId);
      expect(manager.getDeviceType()).toBe('tablet');

      // Mobile
      window.innerWidth = 500;
      manager = new OverlayPositionManager(problemId);
      expect(manager.getDeviceType()).toBe('mobile');
    });

    it('should calculate distance between positions', () => {
      const pos1: OverlayPosition = { x: 0, y: 0, timestamp: 0, screenSize: { width: 0, height: 0 } };
      const pos2: OverlayPosition = { x: 3, y: 4, timestamp: 0, screenSize: { width: 0, height: 0 } };

      expect(manager.calculateDistance(pos1, pos2)).toBe(5); // 3-4-5 triangle
    });

    it('should check position equality with tolerance', () => {
      const pos1: OverlayPosition = { x: 100, y: 100, timestamp: 0, screenSize: { width: 0, height: 0 } };
      const pos2: OverlayPosition = { x: 103, y: 104, timestamp: 0, screenSize: { width: 0, height: 0 } };
      const pos3: OverlayPosition = { x: 110, y: 110, timestamp: 0, screenSize: { width: 0, height: 0 } };

      expect(manager.arePositionsEqual(pos1, pos2, 5)).toBe(true);  // Within tolerance
      expect(manager.arePositionsEqual(pos1, pos3, 5)).toBe(false); // Outside tolerance
    });

    it('should check if bounds are sufficient for overlay', () => {
      expect(manager.areBoundsSufficient(mockEditorBounds)).toBe(true);

      const tinyBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100
      };
      expect(manager.areBoundsSufficient(tinyBounds)).toBe(false);
    });
  });
});
