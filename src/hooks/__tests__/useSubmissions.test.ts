import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock data
const mockSubmissions = [
    {
        id: 'sub-1',
        user_id: 'test-user-id',
        problem_id: 'two-sum',
        code: 'function twoSum(nums, target) { return [0, 1]; }',
        status: 'passed',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        test_results: [],
    },
    {
        id: 'sub-2',
        user_id: 'test-user-id',
        problem_id: 'two-sum',
        code: 'function twoSum(nums, target) { const map = {}; }',
        status: 'passed',
        created_at: '2024-01-14T10:00:00Z',
        updated_at: '2024-01-14T10:00:00Z',
        test_results: [],
    },
];

// Mock channel
const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
        if (callback) callback('SUBSCRIBED');
        return mockChannel;
    }),
};

// Mock UserAttemptsService
vi.mock('@/services/userAttempts', () => ({
    UserAttemptsService: {
        getAcceptedSubmissions: vi.fn(),
    },
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn(),
    },
}));

// Mock normalizeCode
vi.mock('@/utils/code', () => ({
    normalizeCode: vi.fn((code: string) => code?.replace(/\s+/g, '').toLowerCase() || ''),
}));

import { useSubmissions } from '@/features/problems/hooks/useSubmissions';
import { UserAttemptsService } from '@/services/userAttempts';
import { supabase } from '@/integrations/supabase/client';

const mockUserAttemptsService = UserAttemptsService as unknown as {
    getAcceptedSubmissions: ReturnType<typeof vi.fn>;
};

const mockSupabase = supabase as unknown as {
    channel: ReturnType<typeof vi.fn>;
    removeChannel: ReturnType<typeof vi.fn>;
};

describe('useSubmissions', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Suppress console output from hook
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Default mock implementation
        mockUserAttemptsService.getAcceptedSubmissions.mockResolvedValue(mockSubmissions);

        // Reset channel mock
        mockChannel.on.mockClear().mockReturnThis();
        mockChannel.subscribe.mockClear().mockImplementation((cb) => {
            if (cb) cb('SUBSCRIBED');
            return mockChannel;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should start with loading true', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(result.current.loading).toBe(true);
        });

        it('should start with empty submissions array', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(result.current.submissions).toEqual([]);
        });

        it('should start with null error', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(result.current.error).toBeNull();
        });
    });

    describe('Missing Parameters', () => {
        it('should handle missing userId', async () => {
            const { result } = renderHook(() => useSubmissions(undefined, 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.submissions).toEqual([]);
            expect(mockUserAttemptsService.getAcceptedSubmissions).not.toHaveBeenCalled();
        });

        it('should handle missing problemId', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', undefined));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.submissions).toEqual([]);
            expect(mockUserAttemptsService.getAcceptedSubmissions).not.toHaveBeenCalled();
        });

        it('should handle both missing', async () => {
            const { result } = renderHook(() => useSubmissions(undefined, undefined));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.submissions).toEqual([]);
        });
    });

    describe('Fetching Submissions', () => {
        it('should fetch submissions on mount', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockUserAttemptsService.getAcceptedSubmissions).toHaveBeenCalledWith(
                'test-user-id',
                'two-sum'
            );
        });

        it('should set submissions after fetch', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.submissions.length).toBe(2);
            });

            expect(result.current.submissions[0].id).toBe('sub-1');
            expect(result.current.submissions[1].id).toBe('sub-2');
        });

        it('should set loading to false after fetch', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('should refetch when userId changes', async () => {
            const { result, rerender } = renderHook(
                ({ userId, problemId }) => useSubmissions(userId, problemId),
                { initialProps: { userId: 'user-1', problemId: 'two-sum' } }
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockUserAttemptsService.getAcceptedSubmissions).toHaveBeenCalledWith('user-1', 'two-sum');

            rerender({ userId: 'user-2', problemId: 'two-sum' });

            await waitFor(() => {
                expect(mockUserAttemptsService.getAcceptedSubmissions).toHaveBeenCalledWith('user-2', 'two-sum');
            });
        });

        it('should refetch when problemId changes', async () => {
            const { result, rerender } = renderHook(
                ({ userId, problemId }) => useSubmissions(userId, problemId),
                { initialProps: { userId: 'test-user-id', problemId: 'problem-1' } }
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            rerender({ userId: 'test-user-id', problemId: 'problem-2' });

            await waitFor(() => {
                expect(mockUserAttemptsService.getAcceptedSubmissions).toHaveBeenCalledWith('test-user-id', 'problem-2');
            });
        });
    });

    describe('Error Handling', () => {
        it('should set error when fetch fails', async () => {
            mockUserAttemptsService.getAcceptedSubmissions.mockRejectedValue(
                new Error('Database connection failed')
            );

            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.error?.message).toBe('Database connection failed');
            });
        });

        it('should clear submissions on error', async () => {
            mockUserAttemptsService.getAcceptedSubmissions.mockRejectedValue(
                new Error('Failed')
            );

            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.submissions).toEqual([]);
        });

        it('should handle non-Error exceptions', async () => {
            mockUserAttemptsService.getAcceptedSubmissions.mockRejectedValue('String error');

            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.error?.message).toBe('Failed to fetch submissions');
            });
        });
    });

    describe('Realtime Subscription', () => {
        it('should set up realtime channel on mount', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.channel).toHaveBeenCalledWith(
                'user_attempts_test-user-id_two-sum'
            );
        });

        it('should subscribe to INSERT events', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockChannel.on).toHaveBeenCalledWith(
                'postgres_changes',
                expect.objectContaining({
                    event: 'INSERT',
                    table: 'user_problem_attempts',
                }),
                expect.any(Function)
            );
        });

        it('should subscribe to UPDATE events', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockChannel.on).toHaveBeenCalledWith(
                'postgres_changes',
                expect.objectContaining({
                    event: 'UPDATE',
                    table: 'user_problem_attempts',
                }),
                expect.any(Function)
            );
        });

        it('should clean up channel on unmount', async () => {
            const { result, unmount } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            unmount();

            expect(mockSupabase.removeChannel).toHaveBeenCalled();
        });

        it('should not set up channel without userId', async () => {
            const { result } = renderHook(() => useSubmissions(undefined, 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Channel should not be created for realtime subscription
            // But may be called for fetch - check channel specifically
            const channelCalls = mockSupabase.channel.mock.calls.filter(
                (call: string[]) => call[0]?.includes('user_attempts')
            );
            expect(channelCalls.length).toBe(0);
        });

        it('should not set up channel without problemId', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', undefined));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const channelCalls = mockSupabase.channel.mock.calls.filter(
                (call: string[]) => call[0]?.includes('user_attempts')
            );
            expect(channelCalls.length).toBe(0);
        });
    });

    describe('Refetch', () => {
        it('should provide refetch function', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(typeof result.current.refetch).toBe('function');
        });

        it('should refetch submissions when called', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const initialCallCount = mockUserAttemptsService.getAcceptedSubmissions.mock.calls.length;

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockUserAttemptsService.getAcceptedSubmissions.mock.calls.length).toBe(initialCallCount + 1);
        });

        it('should do nothing without userId', async () => {
            const { result } = renderHook(() => useSubmissions(undefined, 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockUserAttemptsService.getAcceptedSubmissions).not.toHaveBeenCalled();
        });
    });

    describe('Optimistic Add', () => {
        it('should provide optimisticAdd function', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(typeof result.current.optimisticAdd).toBe('function');
        });

        it('should add passed submission optimistically', async () => {
            mockUserAttemptsService.getAcceptedSubmissions.mockResolvedValue([]);

            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const newSubmission = {
                id: 'new-sub',
                user_id: 'test-user-id',
                problem_id: 'two-sum',
                code: 'new code',
                status: 'passed' as const,
                created_at: '2024-01-20T10:00:00Z',
                updated_at: '2024-01-20T10:00:00Z',
                test_results: [],
            };

            act(() => {
                result.current.optimisticAdd(newSubmission);
            });

            expect(result.current.submissions.length).toBe(1);
            expect(result.current.submissions[0].id).toBe('new-sub');
        });

        it('should not add non-passed submission', async () => {
            mockUserAttemptsService.getAcceptedSubmissions.mockResolvedValue([]);

            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const failedSubmission = {
                id: 'failed-sub',
                user_id: 'test-user-id',
                problem_id: 'two-sum',
                code: 'failed code',
                status: 'failed' as const,
                created_at: '2024-01-20T10:00:00Z',
                updated_at: '2024-01-20T10:00:00Z',
                test_results: [],
            };

            act(() => {
                result.current.optimisticAdd(failedSubmission);
            });

            expect(result.current.submissions.length).toBe(0);
        });

        it('should handle null input', async () => {
            mockUserAttemptsService.getAcceptedSubmissions.mockResolvedValue([]);

            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            act(() => {
                result.current.optimisticAdd(null);
            });

            expect(result.current.submissions.length).toBe(0);
        });

        it('should update existing submission', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.submissions.length).toBe(2);
            });

            const updatedSubmission = {
                ...mockSubmissions[0],
                code: 'updated code',
            };

            act(() => {
                result.current.optimisticAdd(updatedSubmission);
            });

            const updated = result.current.submissions.find(s => s.id === 'sub-1');
            expect(updated?.code).toBe('updated code');
        });
    });

    describe('Watch For Acceptance (Polling)', () => {
        it('should provide watchForAcceptance function', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(typeof result.current.watchForAcceptance).toBe('function');
        });

        it('should not start polling without userId', async () => {
            const { result } = renderHook(() => useSubmissions(undefined, 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // This should not throw
            result.current.watchForAcceptance();

            expect(mockUserAttemptsService.getAcceptedSubmissions).not.toHaveBeenCalled();
        });
    });

    describe('Return Value Structure', () => {
        it('should return all expected properties', () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            expect(result.current).toHaveProperty('submissions');
            expect(result.current).toHaveProperty('loading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('refetch');
            expect(result.current).toHaveProperty('optimisticAdd');
            expect(result.current).toHaveProperty('watchForAcceptance');
        });

        it('should have correct types', async () => {
            const { result } = renderHook(() => useSubmissions('test-user-id', 'two-sum'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(Array.isArray(result.current.submissions)).toBe(true);
            expect(typeof result.current.loading).toBe('boolean');
            expect(typeof result.current.refetch).toBe('function');
            expect(typeof result.current.optimisticAdd).toBe('function');
            expect(typeof result.current.watchForAcceptance).toBe('function');
        });
    });
});
