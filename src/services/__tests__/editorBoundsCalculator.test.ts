import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EditorBoundsCalculator, 
  MonacoEditor, 
  createEditorBoundsCalculator,
  getEditorBoundsFromMonaco,
  BoundsCalculatorConfig 
} from '../editorBoundsCalculator';
import { EditorBounds } from '../overlayPositionManager';

// Mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
  
  // Helper method to trigger resize
  triggerResize(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

// Mock Monaco Editor
function createMockEditor(overrides: Partial<MonacoEditor> = {}): MonacoEditor {
  const mockDomNode = {
    getBoundingClientRect: vi.fn(() => ({
      left: 100,
      top: 50,
      right: 700,
      bottom: 450,
      width: 600,
      height: 400,
    })),
  } as unknown as HTMLElement;

  return {
    getDomNode: vi.fn(() => mockDomNode),
    getLayoutInfo: vi.fn(() => ({
      width: 600,
      height: 400,
      contentLeft: 10,
      contentTop: 10,
      contentWidth: 580,
      contentHeight: 380,
    })),
    getScrollTop: vi.fn(() => 0),
    getScrollLeft: vi.fn(() => 0),
    getScrolledVisiblePosition: vi.fn((position) => ({
      top: position.lineNumber * 20,
      left: 0,
      height: 20,
    })),
    onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidScrollChange: vi.fn(() => ({ dispose: vi.fn() })),
    ...overrides,
  };
}

describe('EditorBoundsCalculator', () => {
  let calculator: EditorBoundsCalculator;
  let mockEditor: MonacoEditor;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    // Mock ResizeObserver globally
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as any;
    
    calculator = new EditorBoundsCalculator();
    mockEditor = createMockEditor();
  });

  afterEach(() => {
    calculator.cleanup();
    global.ResizeObserver = originalResizeObserver;
  });

  describe('initialization', () => {
    it('should initialize with Monaco editor', () => {
      calculator.initialize(mockEditor);
      
      expect(mockEditor.onDidLayoutChange).toHaveBeenCalled();
      expect(mockEditor.onDidScrollChange).toHaveBeenCalled();
    });

    it('should cleanup previous initialization', () => {
      const disposeMock = vi.fn();
      const firstEditor = createMockEditor({
        onDidLayoutChange: vi.fn(() => ({ dispose: disposeMock })),
        onDidScrollChange: vi.fn(() => ({ dispose: disposeMock })),
      });

      calculator.initialize(firstEditor);
      calculator.initialize(mockEditor);

      expect(disposeMock).toHaveBeenCalledTimes(2); // Layout and scroll disposables
    });
  });

  describe('getEditorBounds', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should return null when no editor is initialized', () => {
      const uninitializedCalculator = new EditorBoundsCalculator();
      expect(uninitializedCalculator.getEditorBounds()).toBeNull();
    });

    it('should return null when DOM node is not available', () => {
      const editorWithoutDom = createMockEditor({
        getDomNode: vi.fn(() => null),
      });
      calculator.initialize(editorWithoutDom);
      
      expect(calculator.getEditorBounds()).toBeNull();
    });

    it('should calculate bounds correctly with default config', () => {
      const bounds = calculator.getEditorBounds();
      
      expect(bounds).toEqual({
        left: 100,
        top: 50,
        right: 700,
        bottom: 450,
        width: 600,
        height: 400,
      });
    });

    it('should apply padding configuration', () => {
      const configWithPadding: BoundsCalculatorConfig = {
        padding: { top: 10, right: 20, bottom: 30, left: 40 },
      };
      
      calculator.updateConfig(configWithPadding);
      const bounds = calculator.getEditorBounds();
      
      expect(bounds).toEqual({
        left: 140, // 100 + 40
        top: 60,   // 50 + 10
        right: 680, // 700 - 20
        bottom: 420, // 450 - 30
        width: 540, // 600 - 40 - 20
        height: 360, // 400 - 10 - 30
      });
    });

    it('should enforce minimum dimensions', () => {
      const configWithMinDimensions: BoundsCalculatorConfig = {
        minWidth: 800,
        minHeight: 600,
      };
      
      calculator.updateConfig(configWithMinDimensions);
      const bounds = calculator.getEditorBounds();
      
      expect(bounds?.width).toBe(800);
      expect(bounds?.height).toBe(600);
    });

    it('should return null for invalid bounds', () => {
      // Test: When DOM rect has zero dimensions, should return null (or lastKnownBounds)
      const editorWithInvalidBounds = createMockEditor();
      (editorWithInvalidBounds.getDomNode() as any).getBoundingClientRect = vi.fn(() => ({
        left: 100,
        top: 50,
        right: 100, // Same as left - invalid
        bottom: 50, // Same as top - invalid
        width: 0,
        height: 0,
      }));

      calculator.initialize(editorWithInvalidBounds);
      const bounds = calculator.getEditorBounds();
      // Implementation returns lastKnownBounds (null) for zero-dimension rects
      expect(bounds).toBeNull();
    });

    it('should handle errors gracefully and return last known bounds', () => {
      // First get valid bounds
      const validBounds = calculator.getEditorBounds();
      expect(validBounds).not.toBeNull();
      
      // Then make getDomNode throw an error
      (mockEditor.getDomNode as any).mockImplementation(() => {
        throw new Error('DOM access error');
      });
      
      const boundsAfterError = calculator.getEditorBounds();
      expect(boundsAfterError).toEqual(validBounds);
    });
  });

  describe('getScrollPosition', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should return null when no editor is initialized', () => {
      const uninitializedCalculator = new EditorBoundsCalculator();
      expect(uninitializedCalculator.getScrollPosition()).toBeNull();
    });

    it('should return current scroll position', () => {
      (mockEditor.getScrollTop as any).mockReturnValue(100);
      (mockEditor.getScrollLeft as any).mockReturnValue(50);
      
      const scrollPosition = calculator.getScrollPosition();
      
      expect(scrollPosition).toEqual({
        top: 100,
        left: 50,
      });
    });

    it('should handle scroll position errors gracefully', () => {
      (mockEditor.getScrollTop as any).mockImplementation(() => {
        throw new Error('Scroll access error');
      });
      
      expect(calculator.getScrollPosition()).toBeNull();
    });
  });

  describe('getViewportInfo', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should return viewport information', () => {
      (mockEditor.getScrollTop as any).mockReturnValue(200);
      (mockEditor.getScrollLeft as any).mockReturnValue(0);
      
      const viewportInfo = calculator.getViewportInfo();
      
      expect(viewportInfo).toEqual({
        width: 580,
        height: 380,
        scrollTop: 200,
        scrollLeft: 0,
        visibleRange: {
          startLineNumber: 11, // (200 / 20) + 1
          endLineNumber: 30,   // 11 + (380 / 20)
        },
      });
    });

    it('should return null when scroll position is unavailable', () => {
      (mockEditor.getScrollTop as any).mockImplementation(() => {
        throw new Error('Scroll error');
      });
      
      expect(calculator.getViewportInfo()).toBeNull();
    });
  });

  describe('getLineBounds', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should return bounds for a specific line', () => {
      const lineBounds = calculator.getLineBounds(5);
      
      expect(lineBounds).toEqual({
        top: 100, // 5 * 20
        bottom: 120, // 100 + 20
        height: 20,
      });
    });

    it('should return null when line position is not available', () => {
      (mockEditor.getScrolledVisiblePosition as any).mockReturnValue(null);
      
      expect(calculator.getLineBounds(5)).toBeNull();
    });

    it('should handle errors gracefully', () => {
      (mockEditor.getScrolledVisiblePosition as any).mockImplementation(() => {
        throw new Error('Position error');
      });
      
      expect(calculator.getLineBounds(5)).toBeNull();
    });
  });

  describe('areBoundsValid', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should return true for valid bounds', () => {
      const validBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 600,
        bottom: 400,
        width: 600,
        height: 400,
      };
      
      expect(calculator.areBoundsValid(validBounds)).toBe(true);
    });

    it('should return false for bounds that are too small', () => {
      const smallBounds: EditorBounds = {
        left: 0,
        top: 0,
        right: 50,
        bottom: 50,
        width: 50,
        height: 50,
      };
      
      expect(calculator.areBoundsValid(smallBounds)).toBe(false);
    });

    it('should return false for invalid bounds geometry', () => {
      const invalidBounds: EditorBounds = {
        left: 100,
        top: 100,
        right: 50, // Less than left
        bottom: 50, // Less than top
        width: -50,
        height: -50,
      };
      
      expect(calculator.areBoundsValid(invalidBounds)).toBe(false);
    });

    it('should use current bounds when no bounds provided', () => {
      expect(calculator.areBoundsValid()).toBe(true);
    });

    it('should return false when no bounds available', () => {
      const uninitializedCalculator = new EditorBoundsCalculator();
      expect(uninitializedCalculator.areBoundsValid()).toBe(false);
    });
  });

  describe('bounds change events', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should notify listeners on bounds changes', () => {
      const listener = vi.fn();
      const unsubscribe = calculator.onBoundsChange(listener);
      
      // Force recalculation which should notify listeners
      calculator.recalculateBounds();
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should not notify unsubscribed listeners', () => {
      const listener = vi.fn();
      const unsubscribe = calculator.onBoundsChange(listener);
      
      calculator.initialize(mockEditor);
      unsubscribe();
      
      // Trigger layout change
      const layoutCallback = (mockEditor.onDidLayoutChange as any).mock.calls[0][0];
      layoutCallback();
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      calculator.onBoundsChange(errorListener);
      calculator.onBoundsChange(goodListener);
      
      // Force recalculation which should trigger both listeners
      calculator.recalculateBounds();
      
      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('recalculateBounds', () => {
    beforeEach(() => {
      calculator.initialize(mockEditor);
    });

    it('should force recalculation and notify listeners', () => {
      const listener = vi.fn();
      calculator.onBoundsChange(listener);
      
      const bounds = calculator.recalculateBounds();
      
      expect(bounds).not.toBeNull();
      expect(listener).toHaveBeenCalledWith(bounds);
    });

    it('should not notify listeners for invalid bounds', () => {
      const listener = vi.fn();
      calculator.onBoundsChange(listener);
      
      // Make bounds invalid
      (mockEditor.getDomNode as any).mockReturnValue(null);
      
      const bounds = calculator.recalculateBounds();
      
      expect(bounds).toBeNull();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should dispose all resources', () => {
      const layoutDispose = vi.fn();
      const scrollDispose = vi.fn();
      
      const editorWithDisposables = createMockEditor({
        onDidLayoutChange: vi.fn(() => ({ dispose: layoutDispose })),
        onDidScrollChange: vi.fn(() => ({ dispose: scrollDispose })),
      });
      
      calculator.initialize(editorWithDisposables);
      calculator.cleanup();
      
      expect(layoutDispose).toHaveBeenCalled();
      expect(scrollDispose).toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      const listener = vi.fn();
      calculator.onBoundsChange(listener);
      calculator.initialize(mockEditor);
      
      calculator.cleanup();
      
      // Manually trigger what would be a bounds change
      calculator.recalculateBounds();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      calculator.initialize(mockEditor);
      
      calculator.updateConfig({
        padding: { top: 20 },
        minWidth: 200,
      });
      
      const bounds = calculator.getEditorBounds();
      expect(bounds?.top).toBe(70); // 50 + 20
      expect(bounds?.width).toBe(600); // Original width is already > 200
    });
  });
});

describe('Factory functions', () => {
  let mockEditor: MonacoEditor;

  beforeEach(() => {
    mockEditor = createMockEditor();
  });

  describe('createEditorBoundsCalculator', () => {
    it('should create calculator with default config', () => {
      const calculator = createEditorBoundsCalculator();
      expect(calculator).toBeInstanceOf(EditorBoundsCalculator);
    });

    it('should create calculator with custom config', () => {
      const config: BoundsCalculatorConfig = {
        minWidth: 300,
        padding: { top: 10 },
      };
      
      const calculator = createEditorBoundsCalculator(config);
      calculator.initialize(mockEditor);
      
      const bounds = calculator.getEditorBounds();
      expect(bounds?.top).toBe(60); // 50 + 10
      
      calculator.cleanup();
    });
  });

  describe('getEditorBoundsFromMonaco', () => {
    it('should get bounds from Monaco editor instance', () => {
      const bounds = getEditorBoundsFromMonaco(mockEditor);
      
      expect(bounds).toEqual({
        left: 100,
        top: 50,
        right: 700,
        bottom: 450,
        width: 600,
        height: 400,
      });
    });

    it('should apply config when getting bounds', () => {
      const config: BoundsCalculatorConfig = {
        padding: { left: 50 },
      };
      
      const bounds = getEditorBoundsFromMonaco(mockEditor, config);
      
      expect(bounds?.left).toBe(150); // 100 + 50
      expect(bounds?.width).toBe(550); // 600 - 50
    });

    it('should return null for invalid editor', () => {
      const invalidEditor = createMockEditor({
        getDomNode: vi.fn(() => null),
      });
      
      const bounds = getEditorBoundsFromMonaco(invalidEditor);
      expect(bounds).toBeNull();
    });
  });
});