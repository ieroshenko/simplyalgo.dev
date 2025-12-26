/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { normalizeCode } from '../code';

describe('normalizeCode', () => {
    it('should return empty string for null input', () => {
        expect(normalizeCode(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
        expect(normalizeCode(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
        expect(normalizeCode(123 as any)).toBe('');
        expect(normalizeCode({} as any)).toBe('');
    });

    it('should collapse multiple spaces to single space', () => {
        expect(normalizeCode('hello    world')).toBe('hello world');
    });

    it('should collapse tabs to single space', () => {
        expect(normalizeCode('hello\t\tworld')).toBe('hello world');
    });

    it('should collapse newlines to single space', () => {
        expect(normalizeCode('hello\n\nworld')).toBe('hello world');
    });

    it('should collapse mixed whitespace', () => {
        expect(normalizeCode('hello \t\n  world')).toBe('hello world');
    });

    it('should trim leading and trailing whitespace', () => {
        expect(normalizeCode('  hello world  ')).toBe('hello world');
    });

    it('should handle code with indentation', () => {
        const code = `
def solution():
    return True
        `;
        expect(normalizeCode(code)).toBe('def solution(): return True');
    });

    it('should handle empty string', () => {
        expect(normalizeCode('')).toBe('');
    });

    it('should handle string with only whitespace', () => {
        expect(normalizeCode('   \t\n   ')).toBe('');
    });
});
