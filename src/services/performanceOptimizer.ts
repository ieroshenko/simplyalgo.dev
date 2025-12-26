/**
 * Performance optimization utilities for overlay positioning system
 */

import { logger } from "@/utils/logger";

/**
 * Debounced function wrapper with configurable delay
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttled function wrapper with configurable interval
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= interval) {
      lastCall = now;
      func(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, interval - (now - lastCall));
    }
  };
}

/**
 * Memoization wrapper for expensive calculations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    
    return result;
  }) as T;
}

/**
 * Request animation frame wrapper for smooth updates
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rafScheduler<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let pendingArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>) => {
    pendingArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (pendingArgs) {
          func(...pendingArgs);
          pendingArgs = null;
        }
        rafId = null;
      });
    }
  };
}

/**
 * Batch multiple operations together
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => void;
  private delay: number;
  private maxBatchSize: number;

  constructor(
    processor: (items: T[]) => void,
    delay: number = 16,
    maxBatchSize: number = 10
  ) {
    this.processor = processor;
    this.delay = delay;
    this.maxBatchSize = maxBatchSize;
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.batch.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.delay);
    }
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.batch.length > 0) {
      const items = [...this.batch];
      this.batch = [];
      this.processor(items);
    }
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.batch = [];
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private maxMeasurements = 100;

  startMeasurement(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      
      const measurements = this.measurements.get(name)!;
      measurements.push(duration);
      
      // Keep only recent measurements
      if (measurements.length > this.maxMeasurements) {
        measurements.shift();
      }
    };
  }

  getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  getAllStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [name] of this.measurements) {
      const stat = this.getStats(name);
      if (stat) {
        stats[name] = stat;
      }
    }
    
    return stats;
  }

  clear(): void {
    this.measurements.clear();
  }
}

/**
 * Memory cleanup utilities
 */
export class CleanupManager {
  private cleanupTasks: (() => void)[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private timeouts: NodeJS.Timeout[] = [];

  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  addInterval(callback: () => void, ms: number): NodeJS.Timeout {
    const interval = setInterval(callback, ms);
    this.intervals.push(interval);
    return interval;
  }

  addTimeout(callback: () => void, ms: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      callback();
      // Remove from tracking after execution
      const index = this.timeouts.indexOf(timeout);
      if (index > -1) {
        this.timeouts.splice(index, 1);
      }
    }, ms);
    this.timeouts.push(timeout);
    return timeout;
  }

  cleanup(): void {
    // Execute cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        logger.warn("Cleanup task failed", {
          component: "CleanupManager",
          error,
        });
      }
    });

    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Clear timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];

    // Clear cleanup tasks
    this.cleanupTasks = [];
  }
}

/**
 * Viewport change detection with debouncing
 */
export class ViewportMonitor {
  private listeners: ((viewport: { width: number; height: number }) => void)[] = [];
  private currentViewport = { width: window.innerWidth, height: window.innerHeight };
  private debouncedHandler: () => void;
  private cleanupManager = new CleanupManager();

  constructor(debounceDelay: number = 150) {
    this.debouncedHandler = debounce(() => {
      const newViewport = { width: window.innerWidth, height: window.innerHeight };
      
      if (newViewport.width !== this.currentViewport.width || 
          newViewport.height !== this.currentViewport.height) {
        this.currentViewport = newViewport;
        this.notifyListeners(newViewport);
      }
    }, debounceDelay);

    window.addEventListener('resize', this.debouncedHandler);
    this.cleanupManager.addCleanupTask(() => {
      window.removeEventListener('resize', this.debouncedHandler);
    });
  }

  addListener(listener: (viewport: { width: number; height: number }) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(viewport: { width: number; height: number }): void {
    this.listeners.forEach(listener => {
      try {
        listener(viewport);
      } catch (error) {
        logger.warn("Viewport listener error", {
          component: "ViewportMonitor",
          error,
          viewport,
        });
      }
    });
  }

  getCurrentViewport(): { width: number; height: number } {
    return { ...this.currentViewport };
  }

  cleanup(): void {
    this.listeners = [];
    this.cleanupManager.cleanup();
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility to create optimized position calculation functions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createOptimizedPositionCalculator<T extends (...args: any[]) => any>(
  calculator: T,
  options: {
    debounceDelay?: number;
    memoize?: boolean;
    monitor?: boolean;
  } = {}
): T {
  let optimizedCalculator = calculator;

  // Add performance monitoring
  if (options.monitor) {
    const originalCalculator = optimizedCalculator;
    optimizedCalculator = ((...args: Parameters<T>) => {
      const endMeasurement = performanceMonitor.startMeasurement('position-calculation');
      try {
        const result = originalCalculator(...args);
        return result;
      } finally {
        endMeasurement();
      }
    }) as T;
  }

  // Add memoization
  if (options.memoize) {
    optimizedCalculator = memoize(optimizedCalculator);
  }

  // Add debouncing
  if (options.debounceDelay) {
    optimizedCalculator = debounce(optimizedCalculator, options.debounceDelay) as T;
  }

  return optimizedCalculator;
}