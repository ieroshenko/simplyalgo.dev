import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
    }),
}));

// Mock surveyService
vi.mock('@/services/surveyService', () => ({
    SurveyService: {
        getSurveyData: vi.fn().mockResolvedValue(null),
        saveSurveyData: vi.fn().mockResolvedValue({ id: 'survey-1' }),
        isSurveyCompleted: vi.fn().mockResolvedValue(false),
    },
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { useSurveyData } from '../useSurveyData';
import { SurveyService } from '@/services/surveyService';

describe('useSurveyData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should return initial loading state', () => {
        const { result } = renderHook(() => useSurveyData());
        expect(result.current.isLoading).toBe(true);
    });

    it('should have expected properties', () => {
        const { result } = renderHook(() => useSurveyData());

        // Check properties without waiting for async
        expect(result.current).toHaveProperty('surveyData');
        expect(result.current).toHaveProperty('isLoading');
        expect(result.current).toHaveProperty('completedSteps');
        expect(result.current).toHaveProperty('isSaving');
    });

    it('should provide saveSurveyData function', () => {
        const { result } = renderHook(() => useSurveyData());
        expect(typeof result.current.saveSurveyData).toBe('function');
    });

    it('should provide updateSurveyData function', () => {
        const { result } = renderHook(() => useSurveyData());
        expect(typeof result.current.updateSurveyData).toBe('function');
    });

    it('should provide loadSurveyData function', () => {
        const { result } = renderHook(() => useSurveyData());
        expect(typeof result.current.loadSurveyData).toBe('function');
    });
});
