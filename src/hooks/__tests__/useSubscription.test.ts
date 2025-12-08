import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
    }),
}));

// Mock Supabase
let mockSingleResponse: any = { data: null, error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.in = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve(mockSingleResponse));
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useSubscription } from '../useSubscription';

describe('useSubscription', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
    });

    it('should return initial loading state', () => {
        const { result } = renderHook(() => useSubscription());
        expect(result.current.isLoading).toBe(true);
    });

    it('should return subscription status', async () => {
        mockSingleResponse = {
            data: { status: 'active', current_period_end: '2024-12-31' },
            error: null
        };

        const { result } = renderHook(() => useSubscription());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.subscription).toBeDefined();
    });

    it('should handle no subscription', async () => {
        mockSingleResponse = { data: null, error: { code: 'PGRST116' } };

        const { result } = renderHook(() => useSubscription());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.subscription).toBeNull();
    });

    it('should have hasActiveSubscription property', () => {
        const { result } = renderHook(() => useSubscription());
        expect(typeof result.current.hasActiveSubscription).toBe('boolean');
    });
});
