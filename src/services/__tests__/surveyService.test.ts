/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock responses
let mockSingleResponse: any = { data: null, error: null };

// Mock supabase with proper hoisting
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(() => Promise.resolve(mockSingleResponse)),
        })),
    },
}));

import { SurveyService } from '../surveyService';
import { supabase } from '@/integrations/supabase/client';
import { SurveyData } from '@/types/survey';

describe('SurveyService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress expected console.error logs from error handling tests
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
    });

    const mockSurveyData: SurveyData = {
        step1: { name: 'John' },
        step2: { goal: 'Learn coding' },
    } as unknown as SurveyData;

    describe('getSurveyData', () => {
        it('should fetch survey data for user', async () => {
            const mockResponse = {
                id: 'survey-1',
                user_id: 'user-123',
                survey_data: mockSurveyData,
                completed_steps: [1, 2],
                completed_at: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };

            mockSingleResponse = { data: mockResponse, error: null };

            const result = await SurveyService.getSurveyData('user-123');

            expect(supabase.from).toHaveBeenCalledWith('survey_responses');
            expect(result).toEqual(mockResponse);
        });

        it('should return null when no survey found', async () => {
            mockSingleResponse = { data: null, error: { code: 'PGRST116' } };

            const result = await SurveyService.getSurveyData('user-123');

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            mockSingleResponse = { data: null, error: { code: 'OTHER', message: 'Error' } };

            const result = await SurveyService.getSurveyData('user-123');

            expect(result).toBeNull();
        });
    });

    describe('isSurveyCompleted', () => {
        it('should return true when survey is completed', async () => {
            mockSingleResponse = {
                data: { completed_at: '2024-01-01T00:00:00Z' },
                error: null,
            };

            const result = await SurveyService.isSurveyCompleted('user-123');

            expect(result).toBe(true);
        });

        it('should return false when survey not completed', async () => {
            mockSingleResponse = {
                data: { completed_at: null },
                error: null,
            };

            const result = await SurveyService.isSurveyCompleted('user-123');

            expect(result).toBe(false);
        });

        it('should return false when no survey found', async () => {
            mockSingleResponse = { data: null, error: { code: 'PGRST116' } };

            const result = await SurveyService.isSurveyCompleted('user-123');

            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            mockSingleResponse = { data: null, error: { code: 'OTHER', message: 'Error' } };

            const result = await SurveyService.isSurveyCompleted('user-123');

            expect(result).toBe(false);
        });
    });
});
