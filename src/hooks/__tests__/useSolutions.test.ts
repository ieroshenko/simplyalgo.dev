import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Supabase
let mockSelectResponse: any = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.then = (resolve: any) => Promise.resolve(mockSelectResponse).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { useSolutions } from '../useSolutions';

describe('useSolutions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console logs
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSelectResponse = { data: [], error: null };
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useSolutions());

        expect(result.current.solutions).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.hasSolutions).toBe(false);
    });

    it('should return empty solutions when no problemId', () => {
        const { result } = renderHook(() => useSolutions(undefined));

        expect(result.current.solutions).toEqual([]);
    });

    it('should fetch solutions for a problem', async () => {
        const mockSolutions = [
            { id: '1', title: 'Solution 1', code: 'code1', is_preferred: true, language: 'python' },
            { id: '2', title: 'Solution 2', code: 'code2', is_preferred: false, language: 'python' },
        ];
        mockSelectResponse = { data: mockSolutions, error: null };

        const { result } = renderHook(() => useSolutions('solution-test-1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.hasSolutions).toBe(true);
    });

    describe('getPreferredSolution', () => {
        it('should return preferred solution when available', async () => {
            const mockSolutions = [
                { id: '1', title: 'Solution 1', is_preferred: false, language: 'python', code: '' },
                { id: '2', title: 'Solution 2', is_preferred: true, language: 'python', code: '' },
            ];
            mockSelectResponse = { data: mockSolutions, error: null };

            const { result } = renderHook(() => useSolutions('pref-test'));

            await waitFor(() => {
                expect(result.current.hasSolutions).toBe(true);
            });

            const preferred = result.current.getPreferredSolution();
            expect(preferred).toBeDefined();
        });

        it('should return first solution if no preferred', async () => {
            const mockSolutions = [
                { id: '1', title: 'Solution 1', is_preferred: false, language: 'python', code: '' },
            ];
            mockSelectResponse = { data: mockSolutions, error: null };

            const { result } = renderHook(() => useSolutions('first-sol-test'));

            await waitFor(() => {
                expect(result.current.hasSolutions).toBe(true);
            });

            const preferred = result.current.getPreferredSolution();
            expect(preferred?.id).toBe('1');
        });
    });

    describe('getSolutionsByApproach', () => {
        it('should have getSolutionsByApproach function', () => {
            const { result } = renderHook(() => useSolutions());
            expect(typeof result.current.getSolutionsByApproach).toBe('function');
        });
    });

    describe('clearCache', () => {
        it('should have clearCache function', () => {
            const { result } = renderHook(() => useSolutions('cache-test'));
            expect(typeof result.current.clearCache).toBe('function');
        });

        it('should clear cache without error', async () => {
            const { result } = renderHook(() => useSolutions('clear-test'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should not throw
            result.current.clearCache();
            result.current.clearCache('clear-test');
        });
    });
});
