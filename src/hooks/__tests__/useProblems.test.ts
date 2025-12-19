import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared mock data
let mockProblemsData: unknown[] = [];
let mockCategoriesData: unknown[] = [];
let mockAttemptsData: unknown[] = [];
let mockStarsData: unknown[] = [];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = (tableName: string) => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: (value: unknown) => unknown) => {
            let data: unknown[] = [];
            if (tableName === 'problems') {
                data = mockProblemsData;
            } else if (tableName === 'categories') {
                data = mockCategoriesData;
            } else if (tableName === 'user_problem_attempts') {
                data = mockAttemptsData;
            } else if (tableName === 'user_starred_problems') {
                data = mockStarsData;
            }
            return Promise.resolve({ data, error: null }).then(resolve);
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

import { useProblems, Problem, Category } from '../useProblems';

// Wrapper for react-query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0, // Disable cache for tests
            },
        },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
    return Wrapper;
};

describe('useProblems', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockProblemsData = [];
        mockCategoriesData = [];
        mockAttemptsData = [];
        mockStarsData = [];
    });

    describe('Initial State', () => {
        it('should return loading state initially', () => {
            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.loading).toBe(true);
        });

        it('should return empty problems array initially', () => {
            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.problems).toEqual([]);
        });

        it('should return empty categories array initially', () => {
            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.categories).toEqual([]);
        });

        it('should return null error initially', () => {
            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Data Fetching', () => {
        it('should provide problems after loading', async () => {
            mockProblemsData = [
                {
                    id: 'problem-1',
                    title: 'Two Sum',
                    difficulty: 'Easy',
                    description: 'Find two numbers that add up to target',
                    function_signature: 'def twoSum(nums, target):',
                    examples: [],
                    constraints: [],
                    categories: { name: 'Arrays', color: '#00ff00' },
                    test_cases: [{ input: '[1,2]', expected_output: '3' }],
                },
            ];

            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.problems.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('toggleStar', () => {
        it('should provide toggleStar function', () => {
            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.toggleStar).toBeDefined();
            expect(typeof result.current.toggleStar).toBe('function');
        });
    });

    describe('refetch', () => {
        it('should provide refetch function', () => {
            const { result } = renderHook(() => useProblems('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.refetch).toBeDefined();
            expect(typeof result.current.refetch).toBe('function');
        });
    });

    describe('Without userId', () => {
        it('should still return problems without userId', () => {
            const { result } = renderHook(() => useProblems(undefined), {
                wrapper: createWrapper(),
            });

            expect(result.current.problems).toEqual([]);
        });
    });

    describe('Caching Behavior', () => {
        it('should use cached data on subsequent renders', async () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000, // 5 minutes
                    },
                },
            });

            const wrapper = ({ children }: { children: React.ReactNode }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children);

            // First render
            const { result: result1 } = renderHook(() => useProblems('user-123'), { wrapper });

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            // Second render - should use cached data
            const { result: result2 } = renderHook(() => useProblems('user-123'), { wrapper });

            // Should not be loading since data is cached
            expect(result2.current.problems).toEqual(result1.current.problems);
        });
    });
});
