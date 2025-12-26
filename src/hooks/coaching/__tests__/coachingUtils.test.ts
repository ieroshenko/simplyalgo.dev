/**
 * Tests for coaching utility functions
 */
import { describe, it, expect } from 'vitest';
import {
    normalizeCode,
    codeContainsSnippet,
    stripCodeFences,
    isLargeInsertion,
    getFallbackPosition,
    clamp,
    createCodeSnippet,
} from '../coachingUtils';

describe('coachingUtils', () => {
    describe('normalizeCode', () => {
        it('should strip inline comments', () => {
            const code = 'x = 1 # this is a comment\ny = 2';
            const result = normalizeCode(code);
            expect(result).not.toContain('#');
        });

        it('should collapse whitespace', () => {
            const code = 'x   =   1\n\n\ny = 2';
            const result = normalizeCode(code);
            expect(result).toBe('x = 1 y = 2');
        });

        it('should handle empty string', () => {
            expect(normalizeCode('')).toBe('');
        });
    });

    describe('codeContainsSnippet', () => {
        it('should return true when snippet is present', () => {
            const full = 'def solution():\n    x = 1\n    return x';
            const snippet = 'x = 1';
            expect(codeContainsSnippet(full, snippet)).toBe(true);
        });

        it('should return false when snippet is not present', () => {
            const full = 'def solution():\n    return 0';
            const snippet = 'x = 1';
            expect(codeContainsSnippet(full, snippet)).toBe(false);
        });

        it('should ignore whitespace differences', () => {
            const full = 'x   =   1';
            const snippet = 'x = 1';
            expect(codeContainsSnippet(full, snippet)).toBe(true);
        });

        it('should ignore comment differences', () => {
            const full = 'x = 1 # set x';
            const snippet = 'x = 1';
            expect(codeContainsSnippet(full, snippet)).toBe(true);
        });
    });

    describe('stripCodeFences', () => {
        it('should strip markdown python code fences', () => {
            const code = '```python\ndef foo():\n    pass\n```';
            expect(stripCodeFences(code)).toBe('def foo():\n    pass');
        });

        it('should strip generic code fences', () => {
            const code = '```\ncode here\n```';
            expect(stripCodeFences(code)).toBe('code here');
        });

        it('should handle code without fences', () => {
            const code = 'def foo():\n    pass';
            expect(stripCodeFences(code)).toBe('def foo():\n    pass');
        });
    });

    describe('isLargeInsertion', () => {
        it('should return true for code with many lines', () => {
            const code = Array(10).fill('x = 1').join('\n');
            expect(isLargeInsertion(code)).toBe(true);
        });

        it('should return true for function definitions', () => {
            const code = 'def my_function(x, y):\n    return x + y';
            expect(isLargeInsertion(code)).toBe(true);
        });

        it('should return true for class definitions', () => {
            const code = 'class MyClass:\n    pass';
            expect(isLargeInsertion(code)).toBe(true);
        });

        it('should return false for small code', () => {
            const code = 'x = 1\ny = 2';
            expect(isLargeInsertion(code)).toBe(false);
        });
    });

    describe('getFallbackPosition', () => {
        it('should return valid position', () => {
            const pos = getFallbackPosition();
            expect(pos.x).toBe(100);
            expect(pos.y).toBeGreaterThan(0);
        });
    });

    describe('clamp', () => {
        it('should return value within range', () => {
            expect(clamp(5, 0, 10)).toBe(5);
        });

        it('should clamp to min', () => {
            expect(clamp(-5, 0, 10)).toBe(0);
        });

        it('should clamp to max', () => {
            expect(clamp(15, 0, 10)).toBe(10);
        });
    });

    describe('createCodeSnippet', () => {
        it('should create snippet with defaults', () => {
            const snippet = createCodeSnippet('x = 1');
            expect(snippet.code).toBe('x = 1');
            expect(snippet.language).toBe('python');
            expect(snippet.isValidated).toBe(true);
            expect(snippet.insertionType).toBe('smart');
            expect(snippet.id).toContain('coaching-');
        });

        it('should use custom id', () => {
            const snippet = createCodeSnippet('x = 1', 'custom-id');
            expect(snippet.id).toBe('custom-id');
        });
    });
});
