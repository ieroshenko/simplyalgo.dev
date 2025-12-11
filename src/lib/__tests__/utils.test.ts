import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
    it('should merge class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('foo', true && 'bar')).toBe('foo bar');
        expect(cn('foo', false && 'bar')).toBe('foo');
    });

    it('should handle undefined and null', () => {
        expect(cn('foo', undefined, 'bar')).toBe('foo bar');
        expect(cn('foo', null, 'bar')).toBe('foo bar');
    });

    it('should handle array of classes', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should merge conflicting Tailwind classes', () => {
        // twMerge should handle conflicting classes
        expect(cn('p-2', 'p-4')).toBe('p-4');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle empty input', () => {
        expect(cn()).toBe('');
        expect(cn('')).toBe('');
    });

    it('should handle object syntax', () => {
        expect(cn({ foo: true, bar: false })).toBe('foo');
    });
});
