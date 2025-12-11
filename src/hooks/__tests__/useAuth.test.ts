import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockUnsubscribe = vi.fn();
let authStateCallback: ((event: string, session: unknown) => void) | null = null;

const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
    },
};

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(),
        },
    },
}));

import { useAuth } from '../useAuth';
import { supabase } from '@/integrations/supabase/client';

const mockSupabase = supabase as unknown as {
    auth: {
        getSession: ReturnType<typeof vi.fn>;
        signOut: ReturnType<typeof vi.fn>;
        onAuthStateChange: ReturnType<typeof vi.fn>;
    };
};

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authStateCallback = null;

        // Set up onAuthStateChange mock
        mockSupabase.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
            authStateCallback = callback;
            return {
                data: { subscription: { unsubscribe: mockUnsubscribe } },
            };
        });

        // Default mock implementations
        mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });
        mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should start with loading true', () => {
            const { result } = renderHook(() => useAuth());

            // Initial state before async operations complete
            expect(result.current.loading).toBe(true);
        });

        it('should have null user and session initially', () => {
            const { result } = renderHook(() => useAuth());

            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
        });

        it('should return signOut function', () => {
            const { result } = renderHook(() => useAuth());

            expect(typeof result.current.signOut).toBe('function');
        });
    });

    describe('Session Loading', () => {
        it('should load session on mount', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
        });

        it('should set user and session when authenticated', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.session).toEqual(mockSession);
            expect(result.current.user).toEqual(mockSession.user);
        });

        it('should handle unauthenticated state', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: null },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.session).toBeNull();
            expect(result.current.user).toBeNull();
        });

        it('should set loading to false after session load', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });
    });

    describe('Auth State Change Listener', () => {
        it('should subscribe to auth state changes on mount', () => {
            renderHook(() => useAuth());

            expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
            expect(typeof authStateCallback).toBe('function');
        });

        it('should unsubscribe on unmount', () => {
            const { unmount } = renderHook(() => useAuth());

            unmount();

            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });

        it('should update state when SIGNED_IN event occurs', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: null },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBeNull();

            // Simulate sign in event
            act(() => {
                authStateCallback?.('SIGNED_IN', mockSession);
            });

            expect(result.current.session).toEqual(mockSession);
            expect(result.current.user).toEqual(mockSession.user);
        });

        it('should update state when SIGNED_OUT event occurs', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.user).not.toBeNull();
            });

            // Simulate sign out event
            act(() => {
                authStateCallback?.('SIGNED_OUT', null);
            });

            expect(result.current.session).toBeNull();
            expect(result.current.user).toBeNull();
        });

        it('should handle TOKEN_REFRESHED event', async () => {
            const refreshedSession = {
                ...mockSession,
                access_token: 'new-access-token',
            };

            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Simulate token refresh
            act(() => {
                authStateCallback?.('TOKEN_REFRESHED', refreshedSession);
            });

            expect(result.current.session?.access_token).toBe('new-access-token');
        });

        it('should handle USER_UPDATED event', async () => {
            const updatedSession = {
                ...mockSession,
                user: {
                    ...mockSession.user,
                    email: 'updated@example.com',
                },
            };

            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Simulate user update
            act(() => {
                authStateCallback?.('USER_UPDATED', updatedSession);
            });

            expect(result.current.user?.email).toBe('updated@example.com');
        });
    });

    describe('Sign Out', () => {
        it('should call supabase signOut', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.signOut();
            });

            expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
        });

        it('should return error when signOut fails', async () => {
            const signOutError = new Error('Sign out failed');
            mockSupabase.auth.signOut.mockResolvedValue({ error: signOutError });

            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            let signOutResult: { error: Error | null } = { error: null };
            await act(async () => {
                signOutResult = await result.current.signOut();
            });

            expect(signOutResult.error).toBe(signOutError);
        });

        it('should return null error on successful signOut', async () => {
            mockSupabase.auth.signOut.mockResolvedValue({ error: null });

            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            let signOutResult: { error: Error | null } = { error: new Error('placeholder') };
            await act(async () => {
                signOutResult = await result.current.signOut();
            });

            expect(signOutResult.error).toBeNull();
        });
    });

    describe('Multiple Hook Instances', () => {
        it('should work correctly with multiple hook instances', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result: result1 } = renderHook(() => useAuth());
            const { result: result2 } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
                expect(result2.current.loading).toBe(false);
            });

            expect(result1.current.user?.id).toBe(result2.current.user?.id);
        });
    });

    describe('Edge Cases', () => {
        it('should handle session with missing user gracefully', async () => {
            const sessionWithoutUser = {
                access_token: 'token',
                refresh_token: 'refresh',
                expires_in: 3600,
                token_type: 'bearer',
                user: null,
            };

            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: sessionWithoutUser },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Session exists but user is null
            expect(result.current.session).toBeTruthy();
            expect(result.current.user).toBeNull();
        });

        it('should handle rapid auth state changes', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: null },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Simulate rapid sign in/out
            act(() => {
                authStateCallback?.('SIGNED_IN', mockSession);
                authStateCallback?.('SIGNED_OUT', null);
                authStateCallback?.('SIGNED_IN', mockSession);
            });

            // Should settle on last state
            expect(result.current.session).toEqual(mockSession);
            expect(result.current.user).toEqual(mockSession.user);
        });

        it('should handle unmount during async operations', async () => {
            let resolveSession: (value: unknown) => void = () => { };
            const sessionPromise = new Promise((resolve) => {
                resolveSession = resolve;
            });

            mockSupabase.auth.getSession.mockReturnValue(sessionPromise);

            const { unmount } = renderHook(() => useAuth());

            // Unmount before session resolves
            unmount();

            // Resolve session after unmount - should not cause errors
            resolveSession({
                data: { session: mockSession },
                error: null,
            });

            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });

    describe('Return Value Structure', () => {
        it('should return all expected properties', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current).toHaveProperty('session');
            expect(result.current).toHaveProperty('user');
            expect(result.current).toHaveProperty('loading');
            expect(result.current).toHaveProperty('signOut');
        });

        it('should have signOut as a callable function', async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
                data: { session: mockSession },
                error: null,
            });

            const { result, rerender } = renderHook(() => useAuth());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            rerender();

            expect(typeof result.current.signOut).toBe('function');
        });
    });
});
