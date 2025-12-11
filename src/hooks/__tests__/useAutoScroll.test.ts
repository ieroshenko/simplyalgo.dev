import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

import { useAutoScroll } from '../useAutoScroll';

describe('useAutoScroll', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return scrollToBottom function', () => {
        const scrollAreaRef = { current: null };
        const messages: any[] = [];

        const { result } = renderHook(() => useAutoScroll(scrollAreaRef, messages));

        expect(result.current).toHaveProperty('scrollToBottom');
        expect(typeof result.current.scrollToBottom).toBe('function');
    });

    it('should accept options', () => {
        const scrollAreaRef = { current: null };
        const messages: any[] = [];

        const { result } = renderHook(() => useAutoScroll(scrollAreaRef, messages, { enabled: false }));

        expect(result.current.scrollToBottom).toBeDefined();
    });

    it('should not throw when scrollAreaRef is null', () => {
        const scrollAreaRef = { current: null };
        const messages: any[] = [{ id: '1', content: 'test', role: 'user' }];

        expect(() => {
            renderHook(() => useAutoScroll(scrollAreaRef, messages));
        }).not.toThrow();
    });
});
