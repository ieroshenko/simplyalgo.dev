import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OverlayPositionManager, OverlayPosition, EditorBounds } from '../overlayPositionManager';
import { LocalStorageService } from '../localStorageService';

// Mock LocalStorageService
vi.mock('../localStorageService');

describe('OverlayPositionManager', () => {
  let manager: OverlayPositionManager;
  let mockStorageService: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    isExpired: ReturnType<typeof vi.fn>;
  };
  const problemId = 'test-problem';

  const mockEditorBounds: EditorBounds = {
    left: 100,
    top: 50,
    right: 900,
    bottom: 600,
    width: 800,
    height: 550
  };

  const mockMobileEditorBounds: EditorBounds = {
    left: 10,
    top: 50,
    right: 400,
    bottom: 600,
    width: 390,
    height: 550
  };

  beforeEach(() => {
    // Reset window dimensions to desktop size
    window.innerWidth = 1024;
    window.innerHeight = 768;

    // Mock LocalStorageService
    mockStorageService = {
      load: vi.fn(),
      save: vi.fn(),
      isExpired: vi.fn(),
    };
    
    (LocalStorageService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockStorageService);
    
    manager = new OverlayPositionManager(problemId);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct storage key', () => {
      expect(LocalStorageService).toHaveBeenCalledWith({
        maxAge: 7 * 24 * 60 * 60 * 1000,
        fallbackPosition: { x: 0, y: 0 }
      });
    });
  });

  describe('calculateDefaultPosition', () => {
    it('should return mobile position for mobile viewport', () => {
      // Set mobile viewport
      window.innerWidth = 600;
      
      const position = manager.calculateDefaultPosition(mockMobileEditorBounds);
      
      expect(position.x).toBe(mockMobileEditorBounds.left + 16); // Mobile margin
      expect(position.y).toBe(mockMobileEditorBounds.bottom - 200 - 16); // Bottom docked with overlay height 200
      expect(position.screenSize).toEqual({ width: 600, height: 768 });
    });

    it('should return desktop position for desktop viewport', () => {
      const position = manager.calculateDefaultPosition(mockEditorBounds);
      
      // Should be centered
      expect(position.x).toBe(mockEditorBounds.left + (mockEditorBounds.width / 2) - 150);
      expect(position.y).toBe(mockEditorBounds.top + (mockEditorBounds.height / 2) - 100);
      expect(position.screenSize).toEqual({ width: 1024, height: 768 });
    });

    it('should position relative to highlighted line on desktop', () => {
      const highlightedLine = 10;
      const position = manager.calculateDefaultPosition(mockEditorBounds, highlightedLine);
      
      // New calculation: lineBottom + offset = (top + line * height + height) + offset
      const expectedY = mockEditorBounds.top + (highlightedLine * 20) + 20 + 40; // Line bottom + offset
      expect(position.x).toBe(mockEditorBounds.left + 40); // Preferred offset for desktop
      expect(position.y).toBe(expectedY);
    });

    it('should position above highlighted line if below would be outside bounds', () => {
      const highlightedLine = 25; // High line number that would push overlay outside
      const position = manager.calculateDefaultPosition(mockEditorBounds, highlightedLine);
      
      const lineY = mockEditorBounds.top + (highlightedLine * 20);
      const expectedY = lineY - 40 - 200; // Above the line
      expect(position.y).toBe(expectedY);
    });

    it('should use top margin if above positioning is also outside bounds', () => {
      const highlightedLine = 1; // Very early line
      const position = manager.calculateDefaultPosition(mockEditorBounds, highlightedLine);
      
      // Should be constrained to valid position within bounds
      expect(position.y).toBeGreaterThanOrEqual(mockEditorBounds.top + 20);
      expect(position.y).toBeLessThanOrEqual(mockEditorBounds.bottom - 200 - 20);
    });
  });

  describe('getSavedPosition', () => {
    it('should return saved position when valid and not expired', () => {
      const savedPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      mockStorageService.load.mockReturnValue(savedPosition);
      mockStorageService.isExpired.mockReturnValue(false);
      
      const result = manager.getSavedPosition();
      
      expect(result).toEqual(savedPosition);
      expect(mockStorageService.load).toHaveBeenCalledWith(`overlay_position_${problemId}`);
    });

    it('should return null when position is expired', () => {
      const savedPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        screenSize: { width: 1024, height: 768 }
      };
      
      mockStorageService.load.mockReturnValue(savedPosition);
      mockStorageService.isExpired.mockReturnValue(true);
      
      const result = manager.getSavedPosition();
      
      expect(result).toBeNull();
    });

    it('should return null when no saved position exists', () => {
      mockStorageService.load.mockReturnValue(null);
      
      const result = manager.getSavedPosition();
      
      expect(result).toBeNull();
    });

    it('should handle storage errors gracefully', () => {
      mockStorageService.load.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = manager.getSavedPosition();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load saved position:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('savePosition', () => {
    it('should save position with timestamp and screen size', () => {
      const position: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: 0, // Will be overridden
        screenSize: { width: 0, height: 0 } // Will be overridden
      };
      
      const mockNow = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      manager.savePosition(position);
      
      expect(mockStorageService.save).toHaveBeenCalledWith(
        `overlay_position_${problemId}`,
        {
          x: 200,
          y: 150,
          timestamp: mockNow,
          screenSize: { width: 1024, height: 768 }
        }
      );
    });

    it('should handle save errors gracefully', () => {
      mockStorageService.save.mockImplementation(() => {
        throw new Error('Save error');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const position: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      manager.savePosition(position);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save position:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('validatePosition', () => {
    it('should return original position when valid', () => {
      const validPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.validatePosition(validPosition, mockEditorBounds);
      
      expect(result).toEqual(validPosition);
    });

    it('should constrain position when outside bounds', () => {
      const invalidPosition: OverlayPosition = {
        x: 1000, // Outside right bound
        y: -50,  // Outside top bound
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.validatePosition(invalidPosition, mockEditorBounds);
      
      expect(result.x).toBe(mockEditorBounds.right - 300 - 20); // Constrained to right edge
      expect(result.y).toBe(mockEditorBounds.top + 20); // Constrained to top edge
    });
  });

  describe('getMobilePosition', () => {
    it('should return bottom-docked position', () => {
      const position = manager.getMobilePosition(mockMobileEditorBounds);
      
      expect(position.x).toBe(mockMobileEditorBounds.left + 16); // Mobile margin
      expect(position.y).toBe(mockMobileEditorBounds.bottom - 200 - 16); // Overlay height 200
      expect(position.screenSize).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('getDesktopPosition', () => {
    it('should return centered position without highlighted line', () => {
      const position = manager.getDesktopPosition(mockEditorBounds);
      
      expect(position.x).toBe(mockEditorBounds.left + (mockEditorBounds.width / 2) - 150);
      expect(position.y).toBe(mockEditorBounds.top + (mockEditorBounds.height / 2) - 100);
    });

    it('should position relative to highlighted line', () => {
      const highlightedLine = 5;
      const position = manager.getDesktopPosition(mockEditorBounds, highlightedLine);
      
      const expectedY = mockEditorBounds.top + (highlightedLine * 20) + 20 + 40; // Line bottom + offset
      expect(position.x).toBe(mockEditorBounds.left + 40); // Preferred offset for desktop
      expect(position.y).toBe(expectedY);
    });

    it('should constrain position to bounds', () => {
      const highlightedLine = 50; // Very high line number
      const position = manager.getDesktopPosition(mockEditorBounds, highlightedLine);
      
      // Should be constrained within bounds
      expect(position.y).toBeGreaterThanOrEqual(mockEditorBounds.top + 20);
      expect(position.y).toBeLessThanOrEqual(mockEditorBounds.bottom - 200 - 20);
    });
  });

  describe('isPositionValid', () => {
    it('should return true for valid position', () => {
      const validPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.isPositionValid(validPosition, mockEditorBounds);
      
      expect(result).toBe(true);
    });

    it('should return false for position outside left bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 50, // Less than bounds.left
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.isPositionValid(invalidPosition, mockEditorBounds);
      
      expect(result).toBe(false);
    });

    it('should return false for position outside right bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 700, // x + width (300) > bounds.right (900)
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.isPositionValid(invalidPosition, mockEditorBounds);
      
      expect(result).toBe(false);
    });

    it('should return false for position outside top bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 200,
        y: 30, // Less than bounds.top
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.isPositionValid(invalidPosition, mockEditorBounds);
      
      expect(result).toBe(false);
    });

    it('should return false for position outside bottom bound', () => {
      const invalidPosition: OverlayPosition = {
        x: 200,
        y: 450, // y + height (200) > bounds.bottom (600)
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.isPositionValid(invalidPosition, mockEditorBounds);
      
      expect(result).toBe(false);
    });
  });

  describe('constrainToBounds', () => {
    it('should constrain x to left bound', () => {
      const position: OverlayPosition = {
        x: 50, // Too far left
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.constrainToBounds(position, mockEditorBounds);
      
      expect(result.x).toBe(mockEditorBounds.left + 20); // OVERLAY_MARGIN
    });

    it('should constrain x to right bound', () => {
      const position: OverlayPosition = {
        x: 800, // Too far right
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.constrainToBounds(position, mockEditorBounds);
      
      expect(result.x).toBe(mockEditorBounds.right - 300 - 20); // width + margin
    });

    it('should constrain y to top bound', () => {
      const position: OverlayPosition = {
        x: 200,
        y: 30, // Too high
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.constrainToBounds(position, mockEditorBounds);
      
      expect(result.y).toBe(mockEditorBounds.top + 20); // OVERLAY_MARGIN
    });

    it('should constrain y to bottom bound', () => {
      const position: OverlayPosition = {
        x: 200,
        y: 500, // Too low
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.constrainToBounds(position, mockEditorBounds);
      
      expect(result.y).toBe(mockEditorBounds.bottom - 200 - 20); // height + margin
    });

    it('should preserve other position properties', () => {
      const position: OverlayPosition = {
        x: 50,
        y: 30,
        timestamp: 1234567890,
        screenSize: { width: 1024, height: 768 }
      };
      
      const result = manager.constrainToBounds(position, mockEditorBounds);
      
      expect(result.timestamp).toBe(position.timestamp);
      expect(result.screenSize).toEqual(position.screenSize);
    });
  });

  describe('getPositionWithFallback', () => {
    it('should return saved position when valid', () => {
      const savedPosition: OverlayPosition = {
        x: 200,
        y: 150,
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      mockStorageService.load.mockReturnValue(savedPosition);
      mockStorageService.isExpired.mockReturnValue(false);
      
      const result = manager.getPositionWithFallback(mockEditorBounds);
      
      expect(result).toEqual(savedPosition);
    });

    it('should calculate default position when saved position is significantly different after validation', () => {
      const savedPosition: OverlayPosition = {
        x: 1000, // Will be constrained significantly
        y: -100, // Will be constrained significantly
        timestamp: Date.now(),
        screenSize: { width: 1024, height: 768 }
      };
      
      mockStorageService.load.mockReturnValue(savedPosition);
      mockStorageService.isExpired.mockReturnValue(false);
      
      const result = manager.getPositionWithFallback(mockEditorBounds);
      
      // Should fall back to default centered position
      expect(result.x).toBe(mockEditorBounds.left + (mockEditorBounds.width / 2) - 150);
      expect(result.y).toBe(mockEditorBounds.top + (mockEditorBounds.height / 2) - 100);
    });

    it('should calculate default position when no saved position exists', () => {
      mockStorageService.load.mockReturnValue(null);
      
      const result = manager.getPositionWithFallback(mockEditorBounds, 5);
      
      // Should use highlighted line positioning
      const expectedY = mockEditorBounds.top + (5 * 20) + 20 + 40; // Line bottom + offset
      expect(result.x).toBe(mockEditorBounds.left + 40); // Preferred offset for desktop
      expect(result.y).toBe(expectedY);
    });

    it('should return viewport-centered fallback when no editor bounds provided', () => {
      const result = manager.getPositionWithFallback();
      
      expect(result.x).toBe((1024 / 2) - 150); // Centered horizontally
      expect(result.y).toBe((768 / 2) - 100); // Centered vertically
      expect(result.screenSize).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very small editor bounds', () => {
      const smallBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 150,
        width: 200,
        height: 150
      };
      
      const position = manager.calculateDefaultPosition(smallBounds);
      
      // Should be constrained within available bounds (even if overlay is larger than bounds)
      expect(position.x).toBeGreaterThanOrEqual(smallBounds.left + 20);
      expect(position.y).toBeGreaterThanOrEqual(smallBounds.top + 20);
      // For very small bounds, the overlay might extend beyond, but position should be constrained
      expect(position.x).toBeLessThanOrEqual(Math.max(smallBounds.left + 20, smallBounds.right - 300 - 20));
      expect(position.y).toBeLessThanOrEqual(Math.max(smallBounds.top + 20, smallBounds.bottom - 200 - 20));
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
      
      const position = manager.calculateDefaultPosition(zeroBounds);
      
      // Should handle gracefully without errors
      expect(typeof position.x).toBe('number');
      expect(typeof position.y).toBe('number');
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
      
      // Should be constrained within bounds
      expect(position.x).toBeGreaterThanOrEqual(negativeBounds.left + 20);
      expect(position.y).toBeGreaterThanOrEqual(negativeBounds.top + 20);
      
      // For bounds that can accommodate the overlay
      const maxX = negativeBounds.right - 300 - 20; // -120
      const maxY = negativeBounds.bottom - 200 - 20; // 80
      
      if (maxX >= negativeBounds.left + 20) {
        expect(position.x).toBeLessThanOrEqual(maxX);
      } else {
        // If overlay is too wide, it should be positioned at left margin
        expect(position.x).toBe(negativeBounds.left + 20);
      }
      
      if (maxY >= negativeBounds.top + 20) {
        expect(position.y).toBeLessThanOrEqual(maxY);
      } else {
        // If overlay is too tall, it should be positioned at top margin
        expect(position.y).toBe(negativeBounds.top + 20);
      }
    });
  });
});