/**
 * Tests for Problem Solver utility functions
 */
import { describe, it, expect, vi } from 'vitest';
import {
    getDifficultyColor,
    formatRelativeTime,
    renderValue,
    getModifierKey,
} from '../problemSolverUtils';

describe('problemSolverUtils', () => {
    describe('getDifficultyColor', () => {
        it('should return success color for Easy', () => {
            expect(getDifficultyColor('Easy')).toBe('bg-success text-success-foreground');
        });

        it('should return amber color for Medium', () => {
            expect(getDifficultyColor('Medium')).toBe('bg-amber-500 text-white');
        });

        it('should return destructive color for Hard', () => {
            expect(getDifficultyColor('Hard')).toBe('bg-destructive text-destructive-foreground');
        });

        it('should return muted color for unknown difficulty', () => {
            expect(getDifficultyColor('Unknown')).toBe('bg-muted text-muted-foreground');
        });
    });

    describe('formatRelativeTime', () => {
        it('should format seconds ago', () => {
            const now = new Date();
            const thirtySecsAgo = new Date(now.getTime() - 30000).toISOString();
            expect(formatRelativeTime(thirtySecsAgo)).toMatch(/\d+s ago/);
        });

        it('should format minutes ago', () => {
            const now = new Date();
            const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
            expect(formatRelativeTime(fiveMinsAgo)).toBe('5 minutes ago');
        });

        it('should format single minute', () => {
            const now = new Date();
            const oneMinAgo = new Date(now.getTime() - 60 * 1000).toISOString();
            expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago');
        });

        it('should format hours ago', () => {
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
            expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
        });

        it('should format days ago', () => {
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
            expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
        });

        it('should format as date for older than a week', () => {
            const now = new Date();
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const result = formatRelativeTime(twoWeeksAgo.toISOString());
            expect(result).toBe(twoWeeksAgo.toLocaleDateString());
        });
    });

    describe('renderValue', () => {
        it('should render null as "null"', () => {
            expect(renderValue(null)).toBe('null');
        });

        it('should render undefined as "null"', () => {
            expect(renderValue(undefined)).toBe('null');
        });

        it('should render numbers as strings', () => {
            expect(renderValue(42)).toBe('42');
            expect(renderValue(3.14)).toBe('3.14');
        });

        it('should render booleans as strings', () => {
            expect(renderValue(true)).toBe('true');
            expect(renderValue(false)).toBe('false');
        });

        it('should render plain strings as-is', () => {
            expect(renderValue('hello')).toBe('hello');
        });

        it('should parse and re-stringify JSON strings', () => {
            expect(renderValue('{"a":1}')).toBe('{"a":1}');
            expect(renderValue('[1,2,3]')).toBe('[1,2,3]');
        });

        it('should stringify objects', () => {
            expect(renderValue({ a: 1 })).toBe('{"a":1}');
        });

        it('should stringify arrays', () => {
            expect(renderValue([1, 2, 3])).toBe('[1,2,3]');
        });
    });

    describe('getModifierKey', () => {
        it('should return modifier key symbol', () => {
            const result = getModifierKey();
            expect(['⌘', 'Ctrl']).toContain(result);
        });
    });
});
