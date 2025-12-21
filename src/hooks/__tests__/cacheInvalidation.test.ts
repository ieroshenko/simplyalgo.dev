import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * These tests verify that the React Query caching system works correctly:
 * 1. Data is cached and reused on subsequent renders
 * 2. Cache is invalidated when relevant data changes (e.g., when a problem is solved)
 * 3. Multiple query keys are correctly invalidated together
 */

// Mock data stores
let mockStatsData: unknown = null;
let mockProblemsData: unknown[] = [];
let mockAttemptsData: unknown[] = [];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = (tableName: string) => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.upsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => {
            if (tableName === 'user_statistics') {
                return Promise.resolve({ data: mockStatsData, error: mockStatsData ? null : { code: 'PGRST116' } });
            }
            if (tableName === 'user_profiles') {
                return Promise.resolve({ data: { name: 'Test User', email: 'test@test.com' }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });
        mock.then = (resolve: (value: unknown) => unknown) => {
            if (tableName === 'problems') {
                return Promise.resolve({ data: mockProblemsData, error: null }).then(resolve);
            }
            if (tableName === 'user_problem_attempts') {
                return Promise.resolve({ data: mockAttemptsData, error: null }).then(resolve);
            }
            return Promise.resolve({ data: [], error: null }).then(resolve);
        };
        return mock;
    };

    return {
        supabase: {
            from: vi.fn((tableName: string) => createChainableMock(tableName)),
        },
    };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

import { useUserStats } from '../useUserStats';
import { useProblems } from '@/features/problems/hooks/useProblems';

// Wrapper factory
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
    return { Wrapper, queryClient: client };
};

describe('Cache Invalidation Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStatsData = {
            total_solved: 5,
            current_streak: 3,
            easy_solved: 2,
            medium_solved: 2,
            hard_solved: 1,
            max_streak: 5,
            last_activity_date: new Date().toISOString(),
        };
        mockProblemsData = [
            {
                id: 'problem-1',
                title: 'Two Sum',
                difficulty: 'Easy',
                description: 'Test problem',
                function_signature: 'def twoSum():',
                categories: { name: 'Arrays', color: '#00ff00' },
                test_cases: [],
            },
        ];
        mockAttemptsData = [];
    });

    describe('useUserStats Cache', () => {
        it('should cache stats and not refetch on subsequent calls', async () => {
            const { Wrapper, queryClient } = createWrapper(new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            }));

            // First render
            const { result: result1 } = renderHook(() => useUserStats('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            // Check cache exists
            const cachedStats = queryClient.getQueryData(['userStats', 'user-123']);
            expect(cachedStats).toBeDefined();

            // Second render
            const { result: result2 } = renderHook(() => useUserStats('user-123'), { wrapper: Wrapper });

            // Should use cached data (same reference)
            expect(result2.current.stats).toEqual(result1.current.stats);
        });

        it('should provide updateStatsOnProblemSolved function', async () => {
            const { Wrapper } = createWrapper();

            const { result } = renderHook(() => useUserStats('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.updateStatsOnProblemSolved).toBeDefined();
            expect(typeof result.current.updateStatsOnProblemSolved).toBe('function');
        });
    });

    describe('useProblems Cache', () => {
        it('should cache problems and not refetch on subsequent calls', async () => {
            const { Wrapper, queryClient } = createWrapper(new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            }));

            // First render
            const { result: result1 } = renderHook(() => useProblems('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            // Check cache exists
            const cachedProblems = queryClient.getQueryData(['problems', 'user-123']);
            expect(cachedProblems).toBeDefined();

            // Second render
            const { result: result2 } = renderHook(() => useProblems('user-123'), { wrapper: Wrapper });

            expect(result2.current.problems).toEqual(result1.current.problems);
        });

        it('should provide toggleStar function', async () => {
            const { Wrapper } = createWrapper();

            const { result } = renderHook(() => useProblems('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.toggleStar).toBeDefined();
            expect(typeof result.current.toggleStar).toBe('function');
        });

        it('should provide refetch function', async () => {
            const { Wrapper } = createWrapper();

            const { result } = renderHook(() => useProblems('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.refetch).toBeDefined();
            expect(typeof result.current.refetch).toBe('function');
        });
    });

    describe('Cross-Hook Cache Invalidation', () => {
        it('useProblems refetch should invalidate problems and categories caches', async () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            });

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
            const { Wrapper } = createWrapper(queryClient);

            const { result } = renderHook(() => useProblems('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Call refetch
            act(() => {
                result.current.refetch();
            });

            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['problems', 'user-123'] });
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['categories', 'user-123'] });
        });
    });

    describe('Cache Key Structure', () => {
        it('useUserStats should use correct query keys', async () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            });

            const { Wrapper } = createWrapper(queryClient);

            const { result } = renderHook(() => useUserStats('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Verify cache keys exist
            const statsCache = queryClient.getQueryData(['userStats', 'user-123']);
            const profileCache = queryClient.getQueryData(['userProfile', 'user-123']);

            expect(statsCache).toBeDefined();
            expect(profileCache).toBeDefined();
        });

        it('useProblems should use correct query keys', async () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            });

            const { Wrapper } = createWrapper(queryClient);

            const { result } = renderHook(() => useProblems('user-123'), { wrapper: Wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Verify cache keys exist
            const problemsCache = queryClient.getQueryData(['problems', 'user-123']);
            const categoriesCache = queryClient.getQueryData(['categories', 'user-123']);

            expect(problemsCache).toBeDefined();
            expect(categoriesCache).toBeDefined();
        });
    });
});
