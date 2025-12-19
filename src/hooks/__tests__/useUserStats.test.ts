import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared mock data
let mockStatsData: unknown = null;
let mockProfileData: unknown = null;

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = (tableName: string) => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.upsert = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => {
            if (tableName === 'user_statistics') {
                return Promise.resolve({ data: mockStatsData, error: mockStatsData ? null : { code: 'PGRST116' } });
            }
            if (tableName === 'user_profiles') {
                return Promise.resolve({ data: mockProfileData, error: mockProfileData ? null : { code: 'PGRST116' } });
            }
            return Promise.resolve({ data: null, error: null });
        });
        mock.then = (resolve: (value: unknown) => unknown) => {
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

import { useUserStats, UserStats, UserProfile } from '../useUserStats';

// Wrapper for react-query
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

describe('useUserStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStatsData = null;
        mockProfileData = null;
    });

    describe('Initial State', () => {
        it('should return loading state when userId is provided', () => {
            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.loading).toBe(true);
        });

        it('should return default stats initially', () => {
            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.stats).toEqual({
                totalSolved: 0,
                streak: 0,
                easySolved: 0,
                mediumSolved: 0,
                hardSolved: 0,
                maxStreak: 0,
            });
        });

        it('should return default profile initially', () => {
            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.profile).toEqual({
                name: 'Guest',
                email: '',
            });
        });
    });

    describe('Without userId', () => {
        it('should not be loading when no userId', () => {
            const { result } = renderHook(() => useUserStats(undefined), {
                wrapper: createWrapper(),
            });

            expect(result.current.loading).toBe(false);
        });

        it('should return default stats when no userId', () => {
            const { result } = renderHook(() => useUserStats(undefined), {
                wrapper: createWrapper(),
            });

            expect(result.current.stats.totalSolved).toBe(0);
        });
    });

    describe('Data Fetching', () => {
        it('should load stats from database', async () => {
            mockStatsData = {
                total_solved: 10,
                current_streak: 3,
                easy_solved: 5,
                medium_solved: 3,
                hard_solved: 2,
                max_streak: 7,
                last_activity_date: new Date().toISOString(),
            };

            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.stats.totalSolved).toBe(10);
            expect(result.current.stats.easySolved).toBe(5);
            expect(result.current.stats.mediumSolved).toBe(3);
            expect(result.current.stats.hardSolved).toBe(2);
        });

        it('should load profile from database', async () => {
            mockProfileData = {
                name: 'Test User',
                email: 'test@example.com',
                avatar_url: 'https://example.com/avatar.jpg',
            };

            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profile.name).toBe('Test User');
            expect(result.current.profile.email).toBe('test@example.com');
        });
    });

    describe('updateStatsOnProblemSolved', () => {
        it('should provide updateStatsOnProblemSolved function', () => {
            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.updateStatsOnProblemSolved).toBeDefined();
            expect(typeof result.current.updateStatsOnProblemSolved).toBe('function');
        });
    });

    describe('Streak Validation', () => {
        it('should validate and return current streak when activity is recent', async () => {
            const today = new Date().toISOString();
            mockStatsData = {
                total_solved: 5,
                current_streak: 5,
                easy_solved: 2,
                medium_solved: 2,
                hard_solved: 1,
                max_streak: 10,
                last_activity_date: today,
            };

            const { result } = renderHook(() => useUserStats('user-123'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.stats.streak).toBe(5);
        });
    });

    describe('Caching Behavior', () => {
        it('should use cached data on subsequent renders', async () => {
            mockStatsData = {
                total_solved: 10,
                current_streak: 3,
                easy_solved: 5,
                medium_solved: 3,
                hard_solved: 2,
                max_streak: 7,
                last_activity_date: new Date().toISOString(),
            };

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            });

            const wrapper = ({ children }: { children: React.ReactNode }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children);

            // First render
            const { result: result1 } = renderHook(() => useUserStats('user-123'), { wrapper });

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            // Second render - should use cached data
            const { result: result2 } = renderHook(() => useUserStats('user-123'), { wrapper });

            expect(result2.current.stats).toEqual(result1.current.stats);
        });
    });
});
