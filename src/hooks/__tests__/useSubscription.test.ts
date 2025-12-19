import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock data
let mockSubscriptionData: unknown = null;

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.in = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({
            data: mockSubscriptionData,
            error: mockSubscriptionData ? null : { code: 'PGRST116' }
        }));
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
            auth: {
                onAuthStateChange: vi.fn(() => ({
                    data: { subscription: { unsubscribe: vi.fn() } },
                })),
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            },
        },
    };
});

// Mock useAuth - use the correct path
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'user-123' },
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

import { useSubscription } from '../useSubscription';

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

describe('useSubscription Caching', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSubscriptionData = null;
    });

    describe('Initial State', () => {
        it('should return loading state initially', () => {
            const { result } = renderHook(() => useSubscription(), {
                wrapper: createWrapper(),
            });

            expect(result.current.isLoading).toBe(true);
        });

        it('should return null subscription initially', () => {
            const { result } = renderHook(() => useSubscription(), {
                wrapper: createWrapper(),
            });

            expect(result.current.subscription).toBeNull();
        });

        it('should return hasActiveSubscription as false initially', () => {
            const { result } = renderHook(() => useSubscription(), {
                wrapper: createWrapper(),
            });

            expect(result.current.hasActiveSubscription).toBe(false);
        });
    });

    describe('Data Fetching', () => {
        it('should detect active subscription', async () => {
            mockSubscriptionData = {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'active',
                plan_type: 'premium',
            };

            const { result } = renderHook(() => useSubscription(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasActiveSubscription).toBe(true);
            expect(result.current.subscription?.status).toBe('active');
        });

        it('should detect trialing subscription', async () => {
            mockSubscriptionData = {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'trialing',
                plan_type: 'premium',
            };

            const { result } = renderHook(() => useSubscription(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasActiveSubscription).toBe(true);
        });
    });

    describe('Caching Behavior', () => {
        it('should use cached subscription data on subsequent renders', async () => {
            mockSubscriptionData = {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'active',
                plan_type: 'premium',
            };

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000, // 5 minutes
                    },
                },
            });

            const wrapper = createWrapper(queryClient);

            // First render
            const { result: result1 } = renderHook(() => useSubscription(), { wrapper });

            await waitFor(() => {
                expect(result1.current.isLoading).toBe(false);
            });

            // Second render - should use cached data
            const { result: result2 } = renderHook(() => useSubscription(), { wrapper });

            expect(result2.current.subscription).toEqual(result1.current.subscription);
            expect(result2.current.hasActiveSubscription).toBe(true);
        });

        it('should cache subscription per user id', async () => {
            mockSubscriptionData = {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'active',
                plan_type: 'premium',
            };

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            });

            const wrapper = createWrapper(queryClient);

            // First render
            const { result } = renderHook(() => useSubscription(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Check cache exists
            const cachedData = queryClient.getQueryData(['subscription', 'user-123']);
            expect(cachedData).toBeDefined();
        });
    });

    describe('Cache Invalidation', () => {
        it('should provide refreshSubscription function', () => {
            const { result } = renderHook(() => useSubscription(), {
                wrapper: createWrapper(),
            });

            expect(result.current.refreshSubscription).toBeDefined();
            expect(typeof result.current.refreshSubscription).toBe('function');
        });

        it('should invalidate cache when refreshSubscription is called', async () => {
            mockSubscriptionData = {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'active',
                plan_type: 'premium',
            };

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 5 * 60 * 1000,
                    },
                },
            });

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
            const wrapper = createWrapper(queryClient);

            const { result } = renderHook(() => useSubscription(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Call refreshSubscription
            act(() => {
                result.current.refreshSubscription();
            });

            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['subscription', 'user-123'] });
        });
    });
});
