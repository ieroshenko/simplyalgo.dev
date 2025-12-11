import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimeAgo } from '../date';

describe('formatTimeAgo', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('past times', () => {
        it('should format seconds ago', () => {
            const thirtySecondsAgo = new Date('2024-01-15T11:59:30Z');
            expect(formatTimeAgo(thirtySecondsAgo)).toBe('30s');
        });

        it('should format 1 second ago', () => {
            const oneSecondAgo = new Date('2024-01-15T11:59:59Z');
            expect(formatTimeAgo(oneSecondAgo)).toBe('1s');
        });

        it('should format minutes ago', () => {
            const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
            expect(formatTimeAgo(fiveMinutesAgo)).toBe('5m');
        });

        it('should format hours ago', () => {
            const twoHoursAgo = new Date('2024-01-15T10:00:00Z');
            expect(formatTimeAgo(twoHoursAgo)).toBe('2h');
        });

        it('should format days ago', () => {
            const threeDaysAgo = new Date('2024-01-12T12:00:00Z');
            expect(formatTimeAgo(threeDaysAgo)).toBe('3d');
        });

        it('should format weeks ago', () => {
            const twoWeeksAgo = new Date('2024-01-01T12:00:00Z');
            expect(formatTimeAgo(twoWeeksAgo)).toBe('2w');
        });

        it('should format months ago', () => {
            const twoMonthsAgo = new Date('2023-11-15T12:00:00Z');
            expect(formatTimeAgo(twoMonthsAgo)).toBe('2mo');
        });

        it('should format about a year ago', () => {
            // Just over a year ago
            const oneYearAgo = new Date('2023-01-14T12:00:00Z');
            const result = formatTimeAgo(oneYearAgo);
            expect(result).toMatch(/^\d+y$/);
        });
    });

    describe('future times', () => {
        it('should format future seconds', () => {
            const thirtySecondsAhead = new Date('2024-01-15T12:00:30Z');
            expect(formatTimeAgo(thirtySecondsAhead)).toBe('in 30s');
        });

        it('should format future minutes', () => {
            const fiveMinutesAhead = new Date('2024-01-15T12:05:00Z');
            expect(formatTimeAgo(fiveMinutesAhead)).toBe('in 5m');
        });
    });

    describe('input types', () => {
        it('should accept string date', () => {
            expect(formatTimeAgo('2024-01-15T11:59:00Z')).toBe('1m');
        });

        it('should accept timestamp number', () => {
            const oneMinuteAgo = new Date('2024-01-15T11:59:00Z').getTime();
            expect(formatTimeAgo(oneMinuteAgo)).toBe('1m');
        });

        it('should accept Date object', () => {
            const oneMinuteAgo = new Date('2024-01-15T11:59:00Z');
            expect(formatTimeAgo(oneMinuteAgo)).toBe('1m');
        });
    });
});
