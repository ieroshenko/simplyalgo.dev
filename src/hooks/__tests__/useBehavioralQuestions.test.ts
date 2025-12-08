import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'user-123' },
        loading: false,
    })),
}));

// Mock supabase responses
let mockQuestionsData: any[] = [];
let mockError: any = null;

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.is = vi.fn(() => mock);
        mock.or = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.contains = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.then = (resolve: any) => Promise.resolve({ data: mockQuestionsData, error: mockError }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useBehavioralQuestions } from '../useBehavioralQuestions';

describe('useBehavioralQuestions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQuestionsData = [];
        mockError = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should return loading state initially', () => {
            const { result } = renderHook(() => useBehavioralQuestions());

            expect(result.current.loading).toBe(true);
        });

        it('should return empty questions initially', () => {
            const { result } = renderHook(() => useBehavioralQuestions());

            expect(result.current.questions).toEqual([]);
        });

        it('should return no error initially', () => {
            const { result } = renderHook(() => useBehavioralQuestions());

            expect(result.current.error).toBeNull();
        });
    });

    describe('Filters', () => {
        it('should accept category filter', () => {
            const { result } = renderHook(() =>
                useBehavioralQuestions({ category: 'leadership' as any })
            );

            expect(result.current).toBeDefined();
        });

        it('should accept difficulty filter', () => {
            const { result } = renderHook(() =>
                useBehavioralQuestions({ difficulty: 'Easy' })
            );

            expect(result.current).toBeDefined();
        });

        it('should accept company filter', () => {
            const { result } = renderHook(() =>
                useBehavioralQuestions({ company: 'Google' })
            );

            expect(result.current).toBeDefined();
        });

        it('should accept includeCustom filter', () => {
            const { result } = renderHook(() =>
                useBehavioralQuestions({ includeCustom: true })
            );

            expect(result.current).toBeDefined();
        });
    });

    describe('Refresh', () => {
        it('should provide refresh function', () => {
            const { result } = renderHook(() => useBehavioralQuestions());

            expect(result.current.refresh).toBeDefined();
            expect(typeof result.current.refresh).toBe('function');
        });
    });

    describe('Return Type', () => {
        it('should return all expected properties', () => {
            const { result } = renderHook(() => useBehavioralQuestions());

            expect(result.current).toHaveProperty('questions');
            expect(result.current).toHaveProperty('loading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('refresh');
        });
    });
});
