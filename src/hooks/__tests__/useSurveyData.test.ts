import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock useAuth
vi.mock('../useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'user-123' },
    })),
}));

// Mock SurveyService
vi.mock('@/services/surveyService', () => ({
    SurveyService: {
        getSurveyData: vi.fn().mockResolvedValue(null),
        saveSurveyData: vi.fn().mockResolvedValue({ success: true }),
    },
}));

import { useSurveyData } from '../useSurveyData';

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

describe('useSurveyData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    describe('Initial State', () => {
        it('should return empty surveyData initially', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.surveyData).toEqual({});
        });

        it('should return empty completedSteps initially', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.completedSteps.size).toBe(0);
        });

        it('should not be saving initially', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.isSaving).toBe(false);
        });
    });

    describe('LocalStorage Integration', () => {
        it('should load data from localStorage on mount', async () => {
            const savedData = { 1: 'answer1', 2: 'answer2' };
            const savedCompleted = [1, 2];

            localStorageMock.setItem('surveyData', JSON.stringify(savedData));
            localStorageMock.setItem('surveyCompletedSteps', JSON.stringify(savedCompleted));

            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            // Should load from localStorage as initial data
            expect(result.current.surveyData).toEqual(savedData);
            expect(result.current.completedSteps.has(1)).toBe(true);
            expect(result.current.completedSteps.has(2)).toBe(true);
        });
    });

    describe('updateSurveyData', () => {
        it('should provide updateSurveyData function', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.updateSurveyData).toBeDefined();
            expect(typeof result.current.updateSurveyData).toBe('function');
        });
    });

    describe('saveSurveyData', () => {
        it('should provide saveSurveyData function', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.saveSurveyData).toBeDefined();
            expect(typeof result.current.saveSurveyData).toBe('function');
        });
    });

    describe('loadSurveyData', () => {
        it('should provide loadSurveyData function', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.loadSurveyData).toBeDefined();
            expect(typeof result.current.loadSurveyData).toBe('function');
        });
    });

    describe('saveToLocalStorage', () => {
        it('should provide saveToLocalStorage function', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.saveToLocalStorage).toBeDefined();
            expect(typeof result.current.saveToLocalStorage).toBe('function');
        });
    });

    describe('saveToDatabase', () => {
        it('should provide saveToDatabase function', () => {
            const { result } = renderHook(() => useSurveyData(), {
                wrapper: createWrapper(),
            });

            expect(result.current.saveToDatabase).toBeDefined();
            expect(typeof result.current.saveToDatabase).toBe('function');
        });
    });

    describe('Caching Behavior', () => {
        it('should use cached data on subsequent renders', async () => {
            const savedData = { 1: 'test' };
            localStorageMock.setItem('surveyData', JSON.stringify(savedData));
            localStorageMock.setItem('surveyCompletedSteps', JSON.stringify([1]));

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        staleTime: 10 * 60 * 1000, // 10 minutes
                    },
                },
            });

            const wrapper = ({ children }: { children: React.ReactNode }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children);

            // First render
            const { result: result1 } = renderHook(() => useSurveyData(), { wrapper });

            await waitFor(() => {
                expect(result1.current.isLoading).toBe(false);
            });

            // Second render - should use cached data
            const { result: result2 } = renderHook(() => useSurveyData(), { wrapper });

            expect(result2.current.surveyData).toEqual(result1.current.surveyData);
        });
    });
});
