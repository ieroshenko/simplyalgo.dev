/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock responses
let mockSingleResponse: any = { data: null, error: null };
let mockMaybeSingleResponse: any = { data: null, error: null };
let mockLimitResponse: any = { data: [], error: null };
let mockOrderResponse: any = { data: [], error: null };

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock normalizeCode
vi.mock('@/utils/code', () => ({
    normalizeCode: vi.fn((code: string) => code?.replace(/\s+/g, ' ').trim() || ''),
}));

// Mock supabase with proper hoisting - full chainable mock
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {
            select: vi.fn(() => mock),
            insert: vi.fn(() => mock),
            update: vi.fn(() => mock),
            delete: vi.fn(() => mock),
            eq: vi.fn(() => mock),
            in: vi.fn(() => mock),
            order: vi.fn(() => mock),
            limit: vi.fn(() => mock),
            single: vi.fn(() => Promise.resolve(mockSingleResponse)),
            maybeSingle: vi.fn(() => Promise.resolve(mockMaybeSingleResponse)),
        };
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { UserAttemptsService } from '../userAttempts';
import { supabase } from '@/integrations/supabase/client';

describe('UserAttemptsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress expected console.error logs from error handling tests
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
        mockMaybeSingleResponse = { data: null, error: null };
        mockLimitResponse = { data: [], error: null };
        mockOrderResponse = { data: [], error: null };
    });

    describe('getLatestAttempt', () => {
        it('should fetch latest attempt for user and problem', async () => {
            const mockAttempt = {
                id: '1',
                user_id: 'user-id',
                problem_id: 'two-sum',
                code: 'def solution(): pass',
                status: 'passed',
            };

            mockMaybeSingleResponse = { data: mockAttempt, error: null };

            const result = await UserAttemptsService.getLatestAttempt('user-id', 'two-sum');

            expect(supabase.from).toHaveBeenCalledWith('user_problem_attempts');
            expect(result).toEqual(mockAttempt);
        });

        it('should return null on error', async () => {
            mockMaybeSingleResponse = { data: null, error: { message: 'Error' } };

            const result = await UserAttemptsService.getLatestAttempt('user-id', 'two-sum');

            expect(result).toBeNull();
        });
    });

    describe('submitCode', () => {
        it('should create new submission', async () => {
            const newSubmission = {
                id: 'submission-1',
                user_id: 'user-id',
                problem_id: 'two-sum',
                code: 'def solution(): pass',
                status: 'pending',
            };

            mockSingleResponse = { data: newSubmission, error: null };

            const result = await UserAttemptsService.submitCode('user-id', 'two-sum', 'def solution(): pass');

            expect(supabase.from).toHaveBeenCalledWith('user_problem_attempts');
            expect(result).toEqual(newSubmission);
        });

        it('should return null on error', async () => {
            mockSingleResponse = { data: null, error: { message: 'Error' } };

            const result = await UserAttemptsService.submitCode('user-id', 'two-sum', 'code');

            expect(result).toBeNull();
        });
    });

    describe('getUserProblemStatus', () => {
        it('should return solved when status is passed', async () => {
            mockMaybeSingleResponse = { data: { status: 'passed' }, error: null };

            const result = await UserAttemptsService.getUserProblemStatus('user-id', 'two-sum');

            expect(result).toBe('solved');
        });

        it('should return attempted when status is not passed', async () => {
            mockMaybeSingleResponse = { data: { status: 'failed' }, error: null };

            const result = await UserAttemptsService.getUserProblemStatus('user-id', 'two-sum');

            expect(result).toBe('attempted');
        });

        it('should return not-started when no data', async () => {
            mockMaybeSingleResponse = { data: null, error: null };

            const result = await UserAttemptsService.getUserProblemStatus('user-id', 'two-sum');

            expect(result).toBe('not-started');
        });
    });

    describe('saveComplexityAnalysis', () => {
        it('should save complexity analysis for submission', async () => {
            const analysis = {
                time_complexity: 'O(n)',
                time_explanation: 'Linear time',
                space_complexity: 'O(1)',
                space_explanation: 'Constant space',
                analysis: 'Good solution',
            };

            const updatedSubmission = { id: 'sub-1', complexity_analysis: analysis };
            mockSingleResponse = { data: updatedSubmission, error: null };

            const result = await UserAttemptsService.saveComplexityAnalysis('sub-1', analysis);

            expect(supabase.from).toHaveBeenCalledWith('user_problem_attempts');
            expect(result).toEqual(updatedSubmission);
        });

        it('should return null on error', async () => {
            mockSingleResponse = { data: null, error: { message: 'Error' } };

            const result = await UserAttemptsService.saveComplexityAnalysis('sub-1', {
                time_complexity: 'O(n)',
                time_explanation: '',
                space_complexity: 'O(1)',
                space_explanation: '',
                analysis: '',
            });

            expect(result).toBeNull();
        });
    });
});
