import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock useTheme
vi.mock('./useTheme', () => ({
    useTheme: () => ({
        isDark: true,
    }),
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { useEditorTheme } from '../useEditorTheme';

describe('useEditorTheme', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should return editor theme object', () => {
        const { result } = renderHook(() => useEditorTheme());
        expect(result.current).toBeDefined();
    });

    it('should return currentTheme', () => {
        const { result } = renderHook(() => useEditorTheme());
        expect(result.current.currentTheme).toBeDefined();
        expect(typeof result.current.currentTheme).toBe('string');
    });

    it('should return selectedTheme', () => {
        const { result } = renderHook(() => useEditorTheme());
        expect(result.current.selectedTheme).toBeDefined();
    });

    it('should return setCurrentTheme function', () => {
        const { result } = renderHook(() => useEditorTheme());
        expect(typeof result.current.setCurrentTheme).toBe('function');
    });

    it('should return defineCustomThemes function', () => {
        const { result } = renderHook(() => useEditorTheme());
        expect(typeof result.current.defineCustomThemes).toBe('function');
    });

    it('should return availableThemes array', () => {
        const { result } = renderHook(() => useEditorTheme());
        expect(Array.isArray(result.current.availableThemes)).toBe(true);
        expect(result.current.availableThemes.length).toBeGreaterThan(0);
    });

    it('should default to auto theme', () => {
        localStorageMock.getItem.mockReturnValue(null);
        const { result } = renderHook(() => useEditorTheme());
        expect(result.current.selectedTheme).toBe('auto');
    });

    it('should load saved theme from localStorage', () => {
        localStorageMock.getItem.mockReturnValue('monokai');
        const { result } = renderHook(() => useEditorTheme());
        expect(result.current.selectedTheme).toBe('monokai');
    });
});
