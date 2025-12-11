import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock next-themes
vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'dark',
        setTheme: vi.fn(),
        resolvedTheme: 'dark',
        systemTheme: 'light',
    }),
}));

import { useTheme } from '../useTheme';

describe('useTheme', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return current theme', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe('dark');
    });

    it('should return resolvedTheme', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should return systemTheme', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.systemTheme).toBe('light');
    });

    it('should return isDark when theme is dark', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(true);
    });

    it('should return isLight when theme is not dark', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.isLight).toBe(false);
    });

    it('should return isSystem based on theme setting', () => {
        const { result } = renderHook(() => useTheme());
        // theme is 'dark' not 'system'
        expect(result.current.isSystem).toBe(false);
    });

    it('should provide setTheme function', () => {
        const { result } = renderHook(() => useTheme());
        expect(typeof result.current.setTheme).toBe('function');
    });
});
