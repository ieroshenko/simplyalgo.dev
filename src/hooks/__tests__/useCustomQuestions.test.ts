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
        mock.insert = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useCustomQuestions } from '../useCustomQuestions';

describe('useCustomQuestions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useCustomQuestions());

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should provide CRUD functions', () => {
        const { result } = renderHook(() => useCustomQuestions());

        expect(typeof result.current.createQuestion).toBe('function');
        expect(typeof result.current.updateQuestion).toBe('function');
        expect(typeof result.current.deleteQuestion).toBe('function');
    });

    it('should have loading property', () => {
        const { result } = renderHook(() => useCustomQuestions());
        expect(result.current).toHaveProperty('loading');
    });

    it('should have error property', () => {
        const { result } = renderHook(() => useCustomQuestions());
        expect(result.current).toHaveProperty('error');
    });
});
