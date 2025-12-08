import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Supabase
let mockSingleResponse: any = { data: null, error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.limit = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve(mockSingleResponse));
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useUserStats } from '../useUserStats';

describe('useUserStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
    });

    it('should return loading false when no userId', () => {
        const { result } = renderHook(() => useUserStats());
        // When no userId, loading is set to false immediately
        expect(result.current.loading).toBe(false);
    });

    it('should return initial loading true when userId provided', () => {
        const { result } = renderHook(() => useUserStats('user-123'));
        expect(result.current.loading).toBe(true);
    });

    it('should return stats structure', async () => {
        const { result } = renderHook(() => useUserStats('user-123'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current).toHaveProperty('stats');
        expect(result.current).toHaveProperty('profile');
        expect(result.current).toHaveProperty('loading');
    });

    it('should have default stats values', () => {
        const { result } = renderHook(() => useUserStats());
        expect(result.current.stats).toEqual({
            totalSolved: 0,
            streak: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            maxStreak: 0,
        });
    });

    it('should have updateStatsOnProblemSolved function', () => {
        const { result } = renderHook(() => useUserStats('user-123'));
        expect(typeof result.current.updateStatsOnProblemSolved).toBe('function');
    });
});
