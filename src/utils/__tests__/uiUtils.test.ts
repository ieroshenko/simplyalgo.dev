/**
 * Tests for UI utility functions
 */
import { describe, it, expect } from 'vitest';
import { getDifficultyColor, formatRelativeTime, getErrorMessage } from '../uiUtils';

describe('getDifficultyColor', () => {
    it('returns success colors for Easy difficulty (case insensitive)', () => {
        expect(getDifficultyColor('easy')).toBe('bg-success text-success-foreground');
        expect(getDifficultyColor('Easy')).toBe('bg-success text-success-foreground');
        expect(getDifficultyColor('EASY')).toBe('bg-success text-success-foreground');
    });

    it('returns success colors for beginner difficulty', () => {
        expect(getDifficultyColor('beginner')).toBe('bg-success text-success-foreground');
        expect(getDifficultyColor('Beginner')).toBe('bg-success text-success-foreground');
    });

    it('returns amber colors for Medium difficulty', () => {
        expect(getDifficultyColor('medium')).toBe('bg-amber-500 text-white');
        expect(getDifficultyColor('Medium')).toBe('bg-amber-500 text-white');
        expect(getDifficultyColor('intermediate')).toBe('bg-amber-500 text-white');
    });

    it('returns destructive colors for Hard difficulty', () => {
        expect(getDifficultyColor('hard')).toBe('bg-destructive text-destructive-foreground');
        expect(getDifficultyColor('Hard')).toBe('bg-destructive text-destructive-foreground');
        expect(getDifficultyColor('advanced')).toBe('bg-destructive text-destructive-foreground');
    });

    it('returns muted colors for unknown difficulty', () => {
        expect(getDifficultyColor('unknown')).toBe('bg-muted text-muted-foreground');
        expect(getDifficultyColor('')).toBe('bg-muted text-muted-foreground');
    });
});

describe('formatRelativeTime', () => {
    it('formats seconds ago', () => {
        const now = new Date();
        const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
        expect(formatRelativeTime(thirtySecondsAgo.toISOString())).toBe('30s ago');
    });

    it('formats minutes ago', () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinutesAgo.toISOString())).toBe('5 minutes ago');
    });

    it('formats single minute correctly', () => {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        expect(formatRelativeTime(oneMinuteAgo.toISOString())).toBe('1 minute ago');
    });

    it('formats hours ago', () => {
        const now = new Date();
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        expect(formatRelativeTime(threeHoursAgo.toISOString())).toBe('3 hours ago');
    });

    it('formats days ago', () => {
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoDaysAgo.toISOString())).toBe('2 days ago');
    });

    it('formats dates older than a week as locale date string', () => {
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(twoWeeksAgo.toISOString());
        // Should not contain "ago" since it's a formatted date
        expect(result).not.toContain('ago');
    });
});

describe('getErrorMessage', () => {
    it('extracts message from Error instance', () => {
        const error = new Error('Something went wrong');
        expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('returns string errors as-is', () => {
        expect(getErrorMessage('Error string')).toBe('Error string');
    });

    it('returns fallback for unknown types', () => {
        expect(getErrorMessage(null)).toBe('An error occurred');
        expect(getErrorMessage(undefined)).toBe('An error occurred');
        expect(getErrorMessage(42)).toBe('An error occurred');
        expect(getErrorMessage({})).toBe('An error occurred');
    });

    it('uses custom fallback when provided', () => {
        expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });
});
