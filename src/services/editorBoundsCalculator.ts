import { EditorBounds } from './overlayPositionManager';

/**
 * Interface for Monaco editor instance
 */
export interface MonacoEditor {
  getDomNode(): HTMLElement | null;
  getLayoutInfo(): {
    width: number;
    height: number;
    contentLeft: number;
    contentTop: number;
    contentWidth: number;
    contentHeight: number;
  };
  getScrollTop(): number;
  getScrollLeft(): number;
  getScrolledVisiblePosition(position: { lineNumber: number; column: number }): {
    top: number;
    left: number;
    height: number;
  } | null;
  onDidLayoutChange(callback: () => void): { dispose(): void };
  onDidScrollChange(callback: () => void): { dispose(): void };
}

/**
 * Interface for scroll position information
 */
export interface ScrollPosition {
  top: number;
  left: number;
}

/**
 * Interface for viewport information
 */
export interface ViewportInfo {
  width: number;
  height: number;
  scrollTop: number;
  scrollLeft: number;
  visibleRange: {
    startLineNumber: number;
    endLineNumber: number;
  };
}

/**
 * Configuration options for bounds calculation
 */
export interface BoundsCalculatorConfig {
  includeScrollbars?: boolean;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  minWidth?: number;
  minHeight?: number;
}

/**
 * Event listener for bounds changes
 */
export type BoundsChangeListener = (bounds: EditorBounds) => void;

/**
 * Utility class for calculating Monaco editor bounds and handling viewport changes
 */
export class EditorBoundsCalculator {
  private editor: MonacoEditor | null = null;
  private config: BoundsCalculatorConfig;
  private boundsChangeListeners: Set<BoundsChangeListener> = new Set();
  private layoutDisposable: { dispose(): void } | null = null;
  private scrollDisposable: { dispose(): void } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastKnownBounds: EditorBounds | null = null;

  constructor(config: BoundsCalculatorConfig = {}) {
    this.config = {
      includeScrollbars: false,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      minWidth: 100,
      minHeight: 100,
      ...config,
    };
  }

  /**
   * Initialize the bounds calculator with a Monaco editor instance
   */
  initialize(editor: MonacoEditor): void {
    this.cleanup();
    this.editor = editor;
    this.setupEventListeners();
  }

  /**
   * Get current editor bounds with enhanced error handling
   */
  getEditorBounds(): EditorBounds | null {
    if (!this.editor) {
      console.warn('EditorBoundsCalculator: No editor initialized');
      return this.lastKnownBounds;
    }

    try {
      const domNode = this.editor.getDomNode();
      if (!domNode) {
        console.warn('EditorBoundsCalculator: Editor DOM node not available');
        return this.lastKnownBounds;
      }

      const rect = domNode.getBoundingClientRect();
      
      // Validate DOM rect
      if (!rect || rect.width === 0 || rect.height === 0) {
        console.warn('EditorBoundsCalculator: Invalid DOM rect dimensions');
        return this.lastKnownBounds;
      }

      const layoutInfo = this.editor.getLayoutInfo();
      const padding = this.config.padding!;

      // Calculate bounds with padding
      const bounds: EditorBounds = {
        left: rect.left + (padding.left || 0),
        top: rect.top + (padding.top || 0),
        right: rect.right - (padding.right || 0),
        bottom: rect.bottom - (padding.bottom || 0),
        width: Math.max(rect.width - (padding.left || 0) - (padding.right || 0), this.config.minWidth || 0),
        height: Math.max(rect.height - (padding.top || 0) - (padding.bottom || 0), this.config.minHeight || 0),
      };

      // Validate calculated bounds
      if (bounds.width <= 0 || bounds.height <= 0) {
        console.warn('EditorBoundsCalculator: Calculated bounds have invalid dimensions');
        return this.lastKnownBounds;
      }

      // Additional validation for reasonable bounds
      if (bounds.left < -window.innerWidth || bounds.top < -window.innerHeight ||
          bounds.right > window.innerWidth * 2 || bounds.bottom > window.innerHeight * 2) {
        console.warn('EditorBoundsCalculator: Bounds appear to be outside reasonable viewport range');
        return this.lastKnownBounds;
      }

      this.lastKnownBounds = bounds;
      return bounds;
    } catch (error) {
      console.warn('EditorBoundsCalculator: Failed to calculate editor bounds:', error);
      return this.lastKnownBounds;
    }
  }

  /**
   * Get current scroll position
   */
  getScrollPosition(): ScrollPosition | null {
    if (!this.editor) {
      return null;
    }

    try {
      return {
        top: this.editor.getScrollTop(),
        left: this.editor.getScrollLeft(),
      };
    } catch (error) {
      console.warn('Failed to get scroll position:', error);
      return null;
    }
  }

  /**
   * Get viewport information including visible line range
   */
  getViewportInfo(): ViewportInfo | null {
    if (!this.editor) {
      return null;
    }

    try {
      const layoutInfo = this.editor.getLayoutInfo();
      const scrollPosition = this.getScrollPosition();
      
      if (!scrollPosition) {
        return null;
      }

      // Calculate visible line range (approximate)
      const lineHeight = 20; // Default line height, could be made configurable
      const visibleLines = Math.floor(layoutInfo.contentHeight / lineHeight);
      const startLine = Math.floor(scrollPosition.top / lineHeight) + 1;
      const endLine = startLine + visibleLines;

      return {
        width: layoutInfo.contentWidth,
        height: layoutInfo.contentHeight,
        scrollTop: scrollPosition.top,
        scrollLeft: scrollPosition.left,
        visibleRange: {
          startLineNumber: Math.max(1, startLine),
          endLineNumber: endLine,
        },
      };
    } catch (error) {
      console.warn('Failed to get viewport info:', error);
      return null;
    }
  }

  /**
   * Get bounds for a specific line number
   */
  getLineBounds(lineNumber: number): { top: number; bottom: number; height: number } | null {
    if (!this.editor) {
      return null;
    }

    try {
      const position = this.editor.getScrolledVisiblePosition({
        lineNumber,
        column: 1,
      });

      if (!position) {
        return null;
      }

      return {
        top: position.top,
        bottom: position.top + position.height,
        height: position.height,
      };
    } catch (error) {
      console.warn('Failed to get line bounds:', error);
      return null;
    }
  }

  /**
   * Check if editor bounds are valid and sufficient for overlay positioning
   */
  areBoundsValid(bounds?: EditorBounds): boolean {
    const targetBounds = bounds || this.getEditorBounds();
    
    if (!targetBounds) {
      return false;
    }

    const minWidth = this.config.minWidth || 100;
    const minHeight = this.config.minHeight || 100;

    return (
      targetBounds.width >= minWidth &&
      targetBounds.height >= minHeight &&
      targetBounds.left >= 0 &&
      targetBounds.top >= 0 &&
      targetBounds.right > targetBounds.left &&
      targetBounds.bottom > targetBounds.top
    );
  }

  /**
   * Add listener for bounds changes
   */
  onBoundsChange(listener: BoundsChangeListener): () => void {
    this.boundsChangeListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.boundsChangeListeners.delete(listener);
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BoundsCalculatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Force recalculation and notification of bounds
   */
  recalculateBounds(): EditorBounds | null {
    const bounds = this.getEditorBounds();
    if (bounds && this.areBoundsValid(bounds)) {
      this.notifyBoundsChange(bounds);
    }
    return bounds;
  }

  /**
   * Cleanup resources and event listeners
   */
  cleanup(): void {
    // Dispose Monaco editor event listeners
    if (this.layoutDisposable) {
      this.layoutDisposable.dispose();
      this.layoutDisposable = null;
    }

    if (this.scrollDisposable) {
      this.scrollDisposable.dispose();
      this.scrollDisposable = null;
    }

    // Cleanup ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear listeners
    this.boundsChangeListeners.clear();
    this.editor = null;
    this.lastKnownBounds = null;
  }

  /**
   * Setup event listeners for bounds changes
   */
  private setupEventListeners(): void {
    if (!this.editor) {
      return;
    }

    // Listen to editor layout changes
    this.layoutDisposable = this.editor.onDidLayoutChange(() => {
      this.handleBoundsChange();
    });

    // Listen to scroll changes
    this.scrollDisposable = this.editor.onDidScrollChange(() => {
      this.handleBoundsChange();
    });

    // Setup ResizeObserver for DOM changes
    const domNode = this.editor.getDomNode();
    if (domNode && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleBoundsChange();
      });
      this.resizeObserver.observe(domNode);
    }

    // Initial bounds calculation
    setTimeout(() => {
      this.handleBoundsChange();
    }, 0);
  }

  /**
   * Handle bounds change events
   */
  private handleBoundsChange(): void {
    const bounds = this.getEditorBounds();
    if (bounds && this.areBoundsValid(bounds)) {
      this.notifyBoundsChange(bounds);
    }
  }

  /**
   * Notify all listeners of bounds changes
   */
  private notifyBoundsChange(bounds: EditorBounds): void {
    this.boundsChangeListeners.forEach(listener => {
      try {
        listener(bounds);
      } catch (error) {
        console.warn('Error in bounds change listener:', error);
      }
    });
  }
}

/**
 * Factory function to create a bounds calculator with default configuration
 */
export function createEditorBoundsCalculator(config?: BoundsCalculatorConfig): EditorBoundsCalculator {
  return new EditorBoundsCalculator(config);
}

/**
 * Utility function to get bounds from a Monaco editor instance
 */
export function getEditorBoundsFromMonaco(editor: MonacoEditor, config?: BoundsCalculatorConfig): EditorBounds | null {
  const calculator = createEditorBoundsCalculator(config);
  calculator.initialize(editor);
  const bounds = calculator.getEditorBounds();
  calculator.cleanup();
  return bounds;
}