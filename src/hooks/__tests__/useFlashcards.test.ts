import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared mock data
let mockDecksData: unknown[] = [];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.lte = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mockDecksData, error: null }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
            rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
    };
});

// Mock sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { useFlashcards } from '../useFlashcards';

// Wrapper for react-query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
    return Wrapper;
};

describe('useFlashcards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDecksData = [];
    });

    describe('Initial State', () => {
        it('should return loading state initially', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            // Hook returns 'isLoading' not 'isLoadingDecks'
            expect(result.current.isLoading).toBe(true);
        });

        it('should return empty flashcards array initially', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            // Hook returns 'flashcards' not 'decks'
            expect(result.current.flashcards).toEqual([]);
        });
    });

    describe('Deck Management', () => {
        it('should provide addToFlashcards mutation', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.addToFlashcards).toBeDefined();
            expect(typeof result.current.addToFlashcards).toBe('function');
        });

        it('should provide removeFromFlashcards mutation', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.removeFromFlashcards).toBeDefined();
            expect(typeof result.current.removeFromFlashcards).toBe('function');
        });

        it('should provide submitReview mutation', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.submitReview).toBeDefined();
            expect(typeof result.current.submitReview).toBe('function');
        });
    });

    describe('isInFlashcards', () => {
        it('should return false when problem is not in flashcards', () => {
            mockDecksData = [];

            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.isInFlashcards('problem-1')).toBe(false);
        });
    });

    describe('Due Cards', () => {
        it('should have dueCards property', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(result.current.dueCards).toBeDefined();
        });
    });

    describe('Loading States', () => {
        it('should track loading state', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(typeof result.current.isLoading).toBe('boolean');
        });

        it('should track adding state', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(typeof result.current.isAddingToFlashcards).toBe('boolean');
        });

        it('should track review submission state', () => {
            const { result } = renderHook(() => useFlashcards('user-123'), {
                wrapper: createWrapper(),
            });

            expect(typeof result.current.isSubmittingReview).toBe('boolean');
        });
    });
});
