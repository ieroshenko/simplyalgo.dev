import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useTimer } from '../useTimer';

describe('useTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial state', () => {
        it('should start in stopwatch mode', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.mode).toBe('stopwatch');
        });

        it('should start with time at 0', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.time).toBe(0);
        });

        it('should not be running initially', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.isRunning).toBe(false);
        });

        it('should have default timer duration of 25 minutes', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.timerDuration).toEqual({ hours: 0, minutes: 25 });
        });
    });

    describe('formatTime', () => {
        it('should format seconds correctly', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.formatTime(30)).toBe('00:30');
        });

        it('should format minutes and seconds', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.formatTime(90)).toBe('01:30');
        });

        it('should format hours', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.formatTime(3661)).toBe('01:01:01');
        });

        it('should pad single digits', () => {
            const { result } = renderHook(() => useTimer());
            expect(result.current.formatTime(5)).toBe('00:05');
        });
    });

    describe('start and pause', () => {
        it('should start the timer', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.start();
            });

            expect(result.current.isRunning).toBe(true);
        });

        it('should pause the timer', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.start();
            });

            act(() => {
                result.current.pause();
            });

            expect(result.current.isRunning).toBe(false);
        });

        it('should increment time in stopwatch mode', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.start();
            });

            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(result.current.time).toBe(3);
        });
    });

    describe('reset', () => {
        it('should reset to 0 in stopwatch mode', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.start();
            });

            act(() => {
                vi.advanceTimersByTime(5000);
            });

            act(() => {
                result.current.reset();
            });

            expect(result.current.time).toBe(0);
            expect(result.current.isRunning).toBe(false);
        });
    });

    describe('switchMode', () => {
        it('should switch to timer mode', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.switchMode('timer');
            });

            expect(result.current.mode).toBe('timer');
        });

        it('should set time to timer duration when switching to timer mode', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.switchMode('timer');
            });

            // Default 25 minutes = 1500 seconds
            expect(result.current.time).toBe(1500);
        });

        it('should reset time to 0 when switching to stopwatch mode', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.switchMode('timer');
            });

            act(() => {
                result.current.switchMode('stopwatch');
            });

            expect(result.current.time).toBe(0);
        });
    });

    describe('setTimerDuration', () => {
        it('should update timer duration', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.setTimerDuration({ hours: 1, minutes: 30 });
            });

            expect(result.current.timerDuration).toEqual({ hours: 1, minutes: 30 });
        });
    });

    describe('timer mode countdown', () => {
        it('should decrement time in timer mode', () => {
            const { result } = renderHook(() => useTimer());

            act(() => {
                result.current.switchMode('timer');
                result.current.start();
            });

            const initialTime = result.current.time;

            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(result.current.time).toBe(initialTime - 3);
        });
    });
});
