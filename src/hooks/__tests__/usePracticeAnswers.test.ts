import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
    }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.in = vi.fn(() => mock);
        mock.not = vi.fn(() => mock);
        mock.is = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.limit = vi.fn(() => mock);
        mock.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { usePracticeAnswers } from '../usePracticeAnswers';

describe('usePracticeAnswers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => usePracticeAnswers());

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should provide getLastAnswer function', () => {
        const { result } = renderHook(() => usePracticeAnswers());
        expect(typeof result.current.getLastAnswer).toBe('function');
    });

    it('should provide getQuestionScores function', () => {
        const { result } = renderHook(() => usePracticeAnswers());
        expect(typeof result.current.getQuestionScores).toBe('function');
    });

    it('should provide getProgress function', () => {
        const { result } = renderHook(() => usePracticeAnswers());
        expect(typeof result.current.getProgress).toBe('function');
    });

    it('should have loading property', () => {
        const { result } = renderHook(() => usePracticeAnswers());
        expect(result.current).toHaveProperty('loading');
    });
});
