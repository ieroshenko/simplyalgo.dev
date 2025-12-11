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
let mockSelectResponse: any = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve(mockSelectResponse));
        mock.then = (resolve: any) => Promise.resolve(mockSelectResponse).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useUserStories } from '../useUserStories';

describe('useUserStories', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSelectResponse = { data: [], error: null };
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useUserStories());

        expect(result.current.stories).toEqual([]);
        expect(result.current.loading).toBe(true);
    });

    it('should provide story management functions', () => {
        const { result } = renderHook(() => useUserStories());

        expect(typeof result.current.createStory).toBe('function');
        expect(typeof result.current.updateStory).toBe('function');
        expect(typeof result.current.deleteStory).toBe('function');
        expect(typeof result.current.refetch).toBe('function');
    });

    it('should load stories on mount', async () => {
        mockSelectResponse = {
            data: [
                { id: 's1', title: 'Story 1', tags: [], user_id: 'user-123' },
            ],
            error: null
        };

        const { result } = renderHook(() => useUserStories());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.stories).toBeDefined();
    });

    it('should have error property', () => {
        const { result } = renderHook(() => useUserStories());
        expect(result.current).toHaveProperty('error');
    });
});
