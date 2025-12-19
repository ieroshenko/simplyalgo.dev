import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Supabase
let mockSelectResponse: any = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.not = vi.fn(() => mock);
        mock.in = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mockSelectResponse).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useSystemDesignSubmissions } from '../useSystemDesignSubmissions';

describe('useSystemDesignSubmissions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        mockSelectResponse = { data: [], error: null };
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useSystemDesignSubmissions('user-123', 'problem-1'));

        expect(result.current).toHaveProperty('submissions');
        expect(result.current).toHaveProperty('loading');
        expect(result.current).toHaveProperty('error');
    });

    it('should have submissions array', () => {
        const { result } = renderHook(() => useSystemDesignSubmissions('user-123', 'problem-1'));

        expect(Array.isArray(result.current.submissions)).toBe(true);
    });

    it('should start with loading state', () => {
        const { result } = renderHook(() => useSystemDesignSubmissions('user-123', 'problem-1'));
        expect(result.current.loading).toBe(true);
    });

    it('should stop loading when no userId', async () => {
        const { result } = renderHook(() => useSystemDesignSubmissions(undefined, 'problem-1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.submissions).toEqual([]);
    });

    it('should stop loading when no problemId', async () => {
        const { result } = renderHook(() => useSystemDesignSubmissions('user-123', undefined));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.submissions).toEqual([]);
    });
});
