import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
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
let mockSingleResponse: any = { data: null, error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve(mockSingleResponse));
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useBehavioralStats } from '../useBehavioralStats';

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

describe('useBehavioralStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useBehavioralStats(), {
            wrapper: createWrapper(),
        });

        expect(result.current).toHaveProperty('stats');
        expect(result.current).toHaveProperty('loading');
        expect(result.current).toHaveProperty('error');
        expect(result.current).toHaveProperty('refetch');
    });

    it('should start with loading state', () => {
        const { result } = renderHook(() => useBehavioralStats(), {
            wrapper: createWrapper(),
        });
        expect(result.current.loading).toBe(true);
    });

    it('should have refetch function', () => {
        const { result } = renderHook(() => useBehavioralStats(), {
            wrapper: createWrapper(),
        });
        expect(typeof result.current.refetch).toBe('function');
    });

    it('should load stats from database', async () => {
        mockSingleResponse = {
            data: {
                user_id: 'user-123',
                total_questions_practiced: 10,
                total_stories_created: 5,
                practice_streak: 3,
                category_scores: {},
                updated_at: new Date().toISOString(),
            },
            error: null,
        };

        const { result } = renderHook(() => useBehavioralStats(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.stats).toBeDefined();
    });
});
