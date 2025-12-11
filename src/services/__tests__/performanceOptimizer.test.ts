import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    debounce,
    throttle,
    memoize,
    rafScheduler,
    BatchProcessor,
    PerformanceMonitor,
    CleanupManager,
    ViewportMonitor
} from '../performanceOptimizer';

describe('Performance Optimizer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('debounce', () => {
        it('should delay function execution', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced();
            debounced();
            debounced();

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should reset delay on each call', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced();
            vi.advanceTimersByTime(50);
            debounced();
            vi.advanceTimersByTime(50);

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(50);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should pass arguments to debounced function', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced('arg1', 'arg2');
            vi.advanceTimersByTime(100);

            expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });

    describe('throttle', () => {
        it('should limit function calls', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled();
            throttled();
            throttled();

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should allow calls after interval', () => {
            const fn = vi.fn();
            const throttled = throttle(fn, 100);

            throttled();
            expect(fn).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(100);
            throttled();
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('memoize', () => {
        it('should cache function results', () => {
            const fn = vi.fn((x: number) => x * 2);
            const memoized = memoize(fn);

            expect(memoized(5)).toBe(10);
            expect(memoized(5)).toBe(10);

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should call function for different arguments', () => {
            const fn = vi.fn((x: number) => x * 2);
            const memoized = memoize(fn);

            expect(memoized(5)).toBe(10);
            expect(memoized(10)).toBe(20);

            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should accept custom key generator', () => {
            const fn = vi.fn((obj: { id: number }) => obj.id * 2);
            const memoized = memoize(fn, (obj) => String(obj.id));

            expect(memoized({ id: 5 })).toBe(10);
            expect(memoized({ id: 5 })).toBe(10);

            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('BatchProcessor', () => {
        it('should batch multiple items', () => {
            const processor = vi.fn();
            const batch = new BatchProcessor(processor, 50);

            batch.add(1);
            batch.add(2);
            batch.add(3);

            expect(processor).not.toHaveBeenCalled();

            vi.advanceTimersByTime(50);

            expect(processor).toHaveBeenCalledWith([1, 2, 3]);
        });

        it('should flush immediately when max batch size reached', () => {
            const processor = vi.fn();
            const batch = new BatchProcessor(processor, 100, 2);

            batch.add(1);
            batch.add(2);

            expect(processor).toHaveBeenCalledWith([1, 2]);
        });

        it('should clear pending batch', () => {
            const processor = vi.fn();
            const batch = new BatchProcessor(processor, 50);

            batch.add(1);
            batch.clear();
            vi.advanceTimersByTime(50);

            expect(processor).not.toHaveBeenCalled();
        });
    });

    describe('PerformanceMonitor', () => {
        it('should track measurements', () => {
            vi.useRealTimers();
            const monitor = new PerformanceMonitor();

            const end = monitor.startMeasurement('test');
            end();

            const stats = monitor.getStats('test');
            expect(stats).not.toBeNull();
            expect(stats?.count).toBe(1);
        });

        it('should return null for unknown measurement', () => {
            const monitor = new PerformanceMonitor();
            expect(monitor.getStats('unknown')).toBeNull();
        });

        it('should get all stats', () => {
            const monitor = new PerformanceMonitor();
            const allStats = monitor.getAllStats();
            expect(typeof allStats).toBe('object');
        });

        it('should clear measurements', () => {
            vi.useRealTimers();
            const monitor = new PerformanceMonitor();

            const end = monitor.startMeasurement('test');
            end();

            monitor.clear();
            expect(monitor.getStats('test')).toBeNull();
        });
    });

    describe('CleanupManager', () => {
        it('should add cleanup tasks', () => {
            const manager = new CleanupManager();
            const task = vi.fn();

            manager.addCleanupTask(task);
            manager.cleanup();

            expect(task).toHaveBeenCalled();
        });

        it('should clear intervals on cleanup', () => {
            const manager = new CleanupManager();
            const callback = vi.fn();

            manager.addInterval(callback, 100);
            vi.advanceTimersByTime(100);
            expect(callback).toHaveBeenCalled();

            manager.cleanup();
            vi.advanceTimersByTime(100);
            // Should not be called again after cleanup
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should clear timeouts on cleanup', () => {
            const manager = new CleanupManager();
            const callback = vi.fn();

            manager.addTimeout(callback, 100);
            manager.cleanup();
            vi.advanceTimersByTime(100);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('ViewportMonitor', () => {
        it('should get current viewport', () => {
            vi.stubGlobal('window', {
                innerWidth: 1920,
                innerHeight: 1080,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const monitor = new ViewportMonitor();
            const viewport = monitor.getCurrentViewport();

            expect(viewport.width).toBe(1920);
            expect(viewport.height).toBe(1080);
        });

        it('should add and remove listeners', () => {
            vi.stubGlobal('window', {
                innerWidth: 1920,
                innerHeight: 1080,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const monitor = new ViewportMonitor();
            const listener = vi.fn();

            const unsubscribe = monitor.addListener(listener);
            expect(typeof unsubscribe).toBe('function');

            unsubscribe();
        });

        it('should cleanup properly', () => {
            vi.stubGlobal('window', {
                innerWidth: 1920,
                innerHeight: 1080,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const monitor = new ViewportMonitor();
            monitor.cleanup();
            // Should not throw
            expect(true).toBe(true);
        });
    });
});
