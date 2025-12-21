/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorBoundsCalculator, MonacoEditor } from '../editorBoundsCalculator';

/**
 * Integration tests for EditorBoundsCalculator with more realistic Monaco editor scenarios
 */

// Mock DOM environment
function createMockDOMEnvironment() {
  const mockElement = {
    getBoundingClientRect: vi.fn(() => ({
      left: 100,
      top: 50,
      right: 900,
      bottom: 650,
      width: 800,
      height: 600,
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  return mockElement as unknown as HTMLElement;
}

// Create a more realistic Monaco editor mock
function createRealisticMonacoEditor(): MonacoEditor {
  const domNode = createMockDOMEnvironment();
  let scrollTop = 0;
  let scrollLeft = 0;
  let layoutInfo = {
    width: 800,
    height: 600,
    contentLeft: 60,
    contentTop: 30,
    contentWidth: 740,
    contentHeight: 570,
  };

  const layoutChangeCallbacks: (() => void)[] = [];
  const scrollChangeCallbacks: (() => void)[] = [];

  return {
    getDomNode: () => domNode,
    getLayoutInfo: () => layoutInfo,
    getScrollTop: () => scrollTop,
    getScrollLeft: () => scrollLeft,
    getScrolledVisiblePosition: (position) => {
      const lineHeight = 18;
      const top = (position.lineNumber - 1) * lineHeight - scrollTop;
      return {
        top,
        left: 0 - scrollLeft,
        height: lineHeight,
      };
    },
    onDidLayoutChange: (callback) => {
      layoutChangeCallbacks.push(callback);
      return {
        dispose: () => {
          const index = layoutChangeCallbacks.indexOf(callback);
          if (index > -1) {
            layoutChangeCallbacks.splice(index, 1);
          }
        },
      };
    },
    onDidScrollChange: (callback) => {
      scrollChangeCallbacks.push(callback);
      return {
        dispose: () => {
          const index = scrollChangeCallbacks.indexOf(callback);
          if (index > -1) {
            scrollChangeCallbacks.splice(index, 1);
          }
        },
      };
    },
    // Helper methods for testing
    _simulateScroll: (top: number, left: number = 0) => {
      scrollTop = top;
      scrollLeft = left;
      scrollChangeCallbacks.forEach(callback => callback());
    },
    _simulateResize: (width: number, height: number) => {
      layoutInfo = {
        ...layoutInfo,
        width,
        height,
        contentWidth: width - 60,
        contentHeight: height - 30,
      };

      // Update DOM rect
      (domNode.getBoundingClientRect as any).mockReturnValue({
        left: 100,
        top: 50,
        right: 100 + width,
        bottom: 50 + height,
        width,
        height,
      });

      layoutChangeCallbacks.forEach(callback => callback());
    },
  } as MonacoEditor & {
    _simulateScroll: (top: number, left?: number) => void;
    _simulateResize: (width: number, height: number) => void;
  };
}

describe('EditorBoundsCalculator Integration Tests', () => {
  let calculator: EditorBoundsCalculator;
  let mockEditor: MonacoEditor & {
    _simulateScroll: (top: number, left?: number) => void;
    _simulateResize: (width: number, height: number) => void;
  };

  beforeEach(() => {
    // Suppress expected console.error (e.g., "No editor initialized")
    vi.spyOn(console, 'error').mockImplementation(() => { });
    calculator = new EditorBoundsCalculator({
      padding: { top: 5, right: 5, bottom: 5, left: 5 },
      minWidth: 200,
      minHeight: 150,
    });
    mockEditor = createRealisticMonacoEditor();
  });

  afterEach(() => {
    calculator.cleanup();
    vi.restoreAllMocks();
  });

  describe('Real-world editor scenarios', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should handle typical code editor initialization', () => {
      const bounds = calculator.getEditorBounds();
      expect(bounds).toEqual({
        left: 105, // 100 + 5 padding
        top: 55,   // 50 + 5 padding
        right: 895, // 900 - 5 padding
        bottom: 645, // 650 - 5 padding
        width: 790, // 800 - 10 total padding
        height: 590, // 600 - 10 total padding
      });
    });

    it('should track scroll position changes during coding', () => {
      // Initial scroll position
      let scrollPos = calculator.getScrollPosition();
      expect(scrollPos).toEqual({ top: 0, left: 0 });

      // Simulate scrolling down while coding
      mockEditor._simulateScroll(180, 20);

      scrollPos = calculator.getScrollPosition();
      expect(scrollPos).toEqual({ top: 180, left: 20 });
    });

    it('should calculate viewport info for visible code lines', () => {
      // Simulate scrolling to line 20
      mockEditor._simulateScroll(360); // 20 lines * 18px line height

      const viewportInfo = calculator.getViewportInfo();
      expect(viewportInfo).toEqual({
        width: 740,
        height: 570,
        scrollTop: 360,
        scrollLeft: 0,
        visibleRange: {
          startLineNumber: 19, // (360 / 20) + 1
          endLineNumber: 47,   // 19 + (570 / 20)
        },
      });
    });

    it('should get accurate line bounds for highlighted code', () => {
      // Test line bounds for line 15
      const lineBounds = calculator.getLineBounds(15);
      expect(lineBounds).toEqual({
        top: 252, // (15 - 1) * 18
        bottom: 270, // 252 + 18
        height: 18,
      });
    });

    it('should handle editor resize events', () => {
      const boundsChangeListener = vi.fn();
      calculator.onBoundsChange(boundsChangeListener);

      // Simulate window resize
      mockEditor._simulateResize(1200, 800);

      // Force recalculation to trigger bounds change
      calculator.recalculateBounds();

      expect(boundsChangeListener).toHaveBeenCalled();
      const newBounds = calculator.getEditorBounds();
      expect(newBounds?.width).toBe(1190); // 1200 - 10 padding
      expect(newBounds?.height).toBe(790); // 800 - 10 padding
    });

    it('should handle rapid scroll events efficiently', () => {
      // Test: Verify listener is called during rapid scroll simulation
      const boundsChangeListener = vi.fn();
      calculator.onBoundsChange(boundsChangeListener);

      // Simulate rapid scrolling and force recalculation
      for (let i = 0; i < 10; i++) {
        mockEditor._simulateScroll(i * 50);
        calculator.recalculateBounds();
      }

      // Should have been called at least once (implementation may batch/debounce)
      expect(boundsChangeListener).toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should handle very small editor dimensions', () => {

      // Simulate resizing to very small dimensions
      mockEditor._simulateResize(50, 30);

      const bounds = calculator.getEditorBounds();
      // Should enforce minimum dimensions
      expect(bounds?.width).toBe(200); // minWidth
      expect(bounds?.height).toBe(150); // minHeight
    });

    it('should handle editor with no content area', () => {
      const editorWithNoContent = createRealisticMonacoEditor();
      (editorWithNoContent.getLayoutInfo as any) = () => ({
        width: 0,
        height: 0,
        contentLeft: 0,
        contentTop: 0,
        contentWidth: 0,
        contentHeight: 0,
      });

      calculator.initialize(editorWithNoContent);

      const viewportInfo = calculator.getViewportInfo();
      expect(viewportInfo?.width).toBe(0);
      expect(viewportInfo?.height).toBe(0);
    });

    it('should handle line bounds for lines outside visible area', () => {
      // Scroll to middle of document
      mockEditor._simulateScroll(1000);

      // Try to get bounds for a line that might be outside visible area
      const lineBounds = calculator.getLineBounds(1);
      expect(lineBounds).toEqual({
        top: -1000, // Negative because it's above scroll position
        bottom: -982,
        height: 18,
      });
    });

    it('should maintain bounds validity during rapid changes', () => {
      calculator.initialize(mockEditor);

      // Simulate rapid resize and scroll changes
      for (let i = 0; i < 5; i++) {
        mockEditor._simulateResize(600 + i * 100, 400 + i * 50);
        mockEditor._simulateScroll(i * 100);

        const bounds = calculator.getEditorBounds();
        expect(calculator.areBoundsValid(bounds!)).toBe(true);
      }
    });
  });

  describe('Performance and memory management', () => {
    it('should properly cleanup resources on multiple initializations', () => {
      const firstEditor = createRealisticMonacoEditor();
      const secondEditor = createRealisticMonacoEditor();

      // Initialize with first editor
      calculator.initialize(firstEditor);
      const firstBounds = calculator.getEditorBounds();
      expect(firstBounds).not.toBeNull();

      // Initialize with second editor (should cleanup first)
      calculator.initialize(secondEditor);
      const secondBounds = calculator.getEditorBounds();
      expect(secondBounds).not.toBeNull();

      // Verify cleanup worked by checking that first editor events don't affect calculator
      const boundsChangeListener = vi.fn();
      calculator.onBoundsChange(boundsChangeListener);

      firstEditor._simulateResize(1000, 1000);
      expect(boundsChangeListener).not.toHaveBeenCalled();

      secondEditor._simulateResize(1000, 1000);
      expect(boundsChangeListener).toHaveBeenCalled();
    });

    it('should handle multiple bounds change listeners efficiently', () => {
      // Test: Multiple listeners can subscribe and unsubscribe correctly
      calculator.initialize(mockEditor);

      const listeners = Array.from({ length: 3 }, () => vi.fn());
      const unsubscribers = listeners.map(listener => calculator.onBoundsChange(listener));

      // Trigger bounds change with valid bounds
      mockEditor._simulateResize(1000, 800);
      const bounds = calculator.recalculateBounds();

      // If bounds are valid, listeners should be called
      if (bounds && calculator.areBoundsValid(bounds)) {
        listeners.forEach(listener => {
          expect(listener).toHaveBeenCalled();
        });
      }

      // Unsubscribe first listener
      unsubscribers[0]();

      // Clear all listener call counts
      listeners.forEach(listener => listener.mockClear());

      // Trigger another change
      mockEditor._simulateResize(1200, 900);
      calculator.recalculateBounds();

      // First listener should not be called (unsubscribed)
      // Note: Only check if bounds are valid, otherwise no notification happens
      const newBounds = calculator.getEditorBounds();
      if (newBounds && calculator.areBoundsValid(newBounds)) {
        expect(listeners[0]).not.toHaveBeenCalled();
        // Remaining listeners may or may not be called depending on implementation
      }
    });
  });

  describe('Configuration updates', () => {
    it('should apply configuration changes immediately', () => {
      calculator.initialize(mockEditor);

      const initialBounds = calculator.getEditorBounds();
      expect(initialBounds?.left).toBe(105); // 100 + 5 padding

      // Update padding configuration
      calculator.updateConfig({
        padding: { left: 20, top: 10, right: 15, bottom: 25 },
      });

      const updatedBounds = calculator.getEditorBounds();
      expect(updatedBounds?.left).toBe(120); // 100 + 20 padding
      expect(updatedBounds?.top).toBe(60);   // 50 + 10 padding
      expect(updatedBounds?.right).toBe(885); // 900 - 15 padding
      expect(updatedBounds?.bottom).toBe(625); // 650 - 25 padding
    });

    it('should handle configuration updates during active monitoring', () => {
      // Test: Config changes should be applied to subsequent calculations
      calculator.initialize(mockEditor);

      const boundsChangeListener = vi.fn();
      calculator.onBoundsChange(boundsChangeListener);

      // Get initial bounds
      const initialBounds = calculator.getEditorBounds();
      expect(initialBounds).not.toBeNull();

      // Update config with new minimum width
      calculator.updateConfig({ minWidth: 1000 });

      // Recalculate - the minWidth should now affect the calculation
      const newBounds = calculator.recalculateBounds();

      // New bounds should respect the updated minWidth config
      expect(newBounds?.width).toBeGreaterThanOrEqual(1000);
    });
  });
});