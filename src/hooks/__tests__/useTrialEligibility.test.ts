/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
    }),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase
let mockSelectResponse: any = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
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

import { useTrialEligibility } from '../useTrialEligibility';

// Create wrapper with QueryClientProvider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
    return Wrapper;
};

describe('useTrialEligibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSelectResponse = { data: [], error: null };
    });

    it('should return initial loading state', () => {
        const { result } = renderHook(() => useTrialEligibility(), {
            wrapper: createWrapper(),
        });
        expect(result.current.isLoading).toBe(true);
    });

    it('should return isEligibleForTrial property', () => {
        const { result } = renderHook(() => useTrialEligibility(), {
            wrapper: createWrapper(),
        });
        expect(result.current).toHaveProperty('isEligibleForTrial');
    });

    it('should be eligible for trial when no subscriptions exist', async () => {
        mockSelectResponse = { data: [], error: null };

        const { result } = renderHook(() => useTrialEligibility(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isEligibleForTrial).toBe(true);
    });

    it('should not be eligible when user had trial before', async () => {
        mockSelectResponse = {
            data: [{ status: 'trialing', user_id: 'user-123' }],
            error: null
        };

        const { result } = renderHook(() => useTrialEligibility(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isEligibleForTrial).toBe(false);
    });

    it('should not be eligible when user cancelled subscription', async () => {
        mockSelectResponse = {
            data: [{ status: 'cancelled', user_id: 'user-123' }],
            error: null
        };

        const { result } = renderHook(() => useTrialEligibility(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isEligibleForTrial).toBe(false);
    });

    it('should default to eligible on error', async () => {
        mockSelectResponse = { data: null, error: { message: 'Database error' } };

        const { result } = renderHook(() => useTrialEligibility(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isEligibleForTrial).toBe(true);
    });
});
