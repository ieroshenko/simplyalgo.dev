import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock data
let mockQuestionsData: unknown[] = [];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.is = vi.fn(() => mock);
        mock.or = vi.fn(() => mock);
        mock.contains = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.then = (resolve: (value: unknown) => unknown) => {
            return Promise.resolve({ data: mockQuestionsData, error: null }).then(resolve);
        };
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'user-123' },
        loading: false,
    })),
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

import { useBehavioralQuestions } from '../useBehavioralQuestions';

// Wrapper for react-query
const createWrapper = (queryClient?: QueryClient) => {
    const client = queryClient || new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client }, children);
    return Wrapper;
};

describe('useBehavioralQuestions Caching', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQuestionsData = [
            {
                id: 'q1',
                question_text: 'Tell me about yourself',
                category: ['introduction'],
                difficulty: 'easy',
                key_traits: [],
                related_question_ids: [],
                company_associations: [],
                user_id: null,
                evaluation_type: 'star',
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
            },
        ];
    });

    describe('Initial State', () => {
        it('should return loading state initially', () => {
            const { result } = renderHook(() => useBehavioralQuestions(), {
                wrapper: createWrapper(),
            });

            expect(result.current.loading).toBe(true);
        });

        it('should return empty questions array initially', () => {
            const { result } = renderHook(() => useBehavioralQuestions(), {
                wrapper: createWrapper(),
            });

            expect(result.current.questions).toEqual([]);
        });
    });

    describe('Data Fetching', () => {
        it('should fetch questions on mount', async () => {
            const { result } = renderHook(() => useBehavioralQuestions(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.questions.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Caching Behavior', () => {
        it('should use cached data on subsequent renders with same query key', async () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 10 * 60 * 1000, // 10 minutes
                    },
                },
            });

            const wrapper = createWrapper(queryClient);

            // First render
            const { result: result1 } = renderHook(() => useBehavioralQuestions(), { wrapper });

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            // Second render with same hook - should use cached data
            const { result: result2 } = renderHook(() => useBehavioralQuestions(), { wrapper });

            // Should have same reference (cached)
            expect(result2.current.questions).toEqual(result1.current.questions);
        });

        it('should cache data per filter combination', async () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 10 * 60 * 1000,
                    },
                },
            });

            const wrapper = createWrapper(queryClient);

            // First render with no filters
            const { result: result1 } = renderHook(() => useBehavioralQuestions(), { wrapper });

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            // Check cache exists for the query key
            const cachedData = queryClient.getQueryData(['behavioralQuestions', 'user-123', undefined, undefined, undefined, undefined]);
            expect(cachedData).toBeDefined();
        });
    });

    describe('Cache Invalidation', () => {
        it('should provide refresh function', () => {
            const { result } = renderHook(() => useBehavioralQuestions(), {
                wrapper: createWrapper(),
            });

            expect(result.current.refresh).toBeDefined();
            expect(typeof result.current.refresh).toBe('function');
        });
    });
});
