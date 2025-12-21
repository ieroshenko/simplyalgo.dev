/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock responses
let mockSingleResponse: any = { data: null, error: null };
let mockSelectResponse: any = { data: [], error: null };

// Mock supabase with proper hoisting - full chainable mock
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve(mockSingleResponse));
        // Also make it thenable for queries that don't end with single/order
        mock.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mockSelectResponse).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
        },
    };
});

import { TechnicalInterviewService } from '@/features/technical-interview/services/technicalInterviewService';
import { supabase } from '@/integrations/supabase/client';

describe('TechnicalInterviewService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress expected console.error/log from error handling tests
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
        mockSelectResponse = { data: [], error: null };
    });

    describe('getProblem', () => {
        it('should fetch specific problem by ID', async () => {
            const mockProblem = {
                id: 'two-sum',
                title: 'Two Sum',
                description: 'Find two numbers',
                test_cases: [{ input: '[2,7,11]', expected: '[0,1]' }],
            };

            mockSingleResponse = { data: mockProblem, error: null };

            const result = await TechnicalInterviewService.getProblem('two-sum');

            expect(supabase.from).toHaveBeenCalledWith('problems');
            expect(result).toMatchObject({
                id: 'two-sum',
                title: 'Two Sum',
                testCases: expect.any(Array),
            });
        });

        it('should throw error when problem not found', async () => {
            mockSingleResponse = { data: null, error: { message: 'Not found' } };

            await expect(TechnicalInterviewService.getProblem('invalid-id'))
                .rejects.toThrow('Problem "invalid-id" not found');
        });
    });

    describe('getRandomProblem', () => {
        it('should filter out System Design problems', async () => {
            const mockProblems = [
                { id: 'two-sum', title: 'Two Sum', categories: { name: 'Arrays' }, test_cases: [] },
                { id: 'sd_url', title: 'URL Shortener', categories: { name: 'System Design' }, test_cases: [] },
            ];

            mockSelectResponse = { data: mockProblems, error: null };

            const result = await TechnicalInterviewService.getRandomProblem();

            expect(result.id).not.toContain('sd_');
        });

        it('should throw when no problems found', async () => {
            mockSelectResponse = { data: [], error: null };

            await expect(TechnicalInterviewService.getRandomProblem())
                .rejects.toThrow('No problems found');
        });
    });

    describe('getAllEligibleProblems', () => {
        it('should return filtered list of problems', async () => {
            const mockProblems = [
                { id: 'two-sum', title: 'Two Sum', difficulty: 'Easy', categories: { name: 'Arrays' } },
                { id: 'sd_url', title: 'URL Shortener', difficulty: 'Hard', categories: { name: 'System Design' } },
            ];

            mockSelectResponse = { data: mockProblems, error: null };

            const result = await TechnicalInterviewService.getAllEligibleProblems();

            expect(result.some((p: { id: string }) => p.id === 'two-sum')).toBe(true);
            expect(result.some((p: { id: string }) => p.id === 'sd_url')).toBe(false);
        });
    });

    describe('createSession', () => {
        it('should create new interview session', async () => {
            const mockSession = {
                id: 'session-1',
                user_id: 'user-id',
                problem_id: 'two-sum',
                voice: 'alloy',
                status: 'in_progress',
            };

            mockSingleResponse = { data: mockSession, error: null };

            const result = await TechnicalInterviewService.createSession('user-id', 'two-sum', 'alloy');

            expect(supabase.from).toHaveBeenCalledWith('technical_interview_sessions');
            expect(result).toMatchObject({
                id: 'session-1',
                status: 'in_progress',
            });
        });

        it('should throw on error', async () => {
            mockSingleResponse = { data: null, error: { message: 'DB Error' } };

            await expect(TechnicalInterviewService.createSession('user-id', 'two-sum', 'alloy'))
                .rejects.toThrow();
        });
    });

    describe('endSession', () => {
        it('should update session with end data', async () => {
            const mockUpdated = {
                id: 'session-1',
                status: 'completed',
                duration_seconds: 1800,
                passed: true,
                overall_score: 85,
            };

            mockSingleResponse = { data: mockUpdated, error: null };

            const result = await TechnicalInterviewService.endSession('session-1', 1800, true, 85);

            expect(result).toMatchObject({ status: 'completed' });
        });
    });

    describe('addTranscript', () => {
        it('should add transcript entry', async () => {
            const mockTranscript = {
                id: 'transcript-1',
                session_id: 'session-1',
                role: 'user',
                content: 'Hello',
            };

            mockSingleResponse = { data: mockTranscript, error: null };

            const result = await TechnicalInterviewService.addTranscript('session-1', 'user', 'Hello');

            expect(supabase.from).toHaveBeenCalledWith('technical_interview_transcripts');
            expect(result).toMatchObject({ role: 'user', content: 'Hello' });
        });
    });

    describe('saveCodeSnapshot', () => {
        it('should save code snapshot', async () => {
            const mockSnapshot = {
                id: 'snapshot-1',
                session_id: 'session-1',
                code: 'def solution(): pass',
            };

            mockSingleResponse = { data: mockSnapshot, error: null };

            const result = await TechnicalInterviewService.saveCodeSnapshot('session-1', 'def solution(): pass');

            expect(supabase.from).toHaveBeenCalledWith('technical_interview_code_snapshots');
            expect(result).toMatchObject({ code: 'def solution(): pass' });
        });
    });

    describe('getSession', () => {
        it('should fetch session by ID', async () => {
            const mockSession = { id: 'session-1', status: 'completed' };
            mockSingleResponse = { data: mockSession, error: null };

            const result = await TechnicalInterviewService.getSession('session-1');

            expect(result).toMatchObject({ id: 'session-1' });
        });
    });

    describe('getFeedback', () => {
        it('should fetch feedback for session', async () => {
            const mockFeedback = { id: 'feedback-1', session_id: 'session-1' };
            mockSingleResponse = { data: mockFeedback, error: null };

            const result = await TechnicalInterviewService.getFeedback('session-1');

            expect(result).toMatchObject({ session_id: 'session-1' });
        });

        it('should return null when no feedback found', async () => {
            mockSingleResponse = { data: null, error: { code: 'PGRST116' } };

            const result = await TechnicalInterviewService.getFeedback('session-1');

            expect(result).toBeNull();
        });
    });

    describe('getTestResults', () => {
        it('should fetch test results for session', async () => {
            const mockResults = [{ test_case_number: 1, passed: true }];
            mockSelectResponse = { data: mockResults, error: null };

            const result = await TechnicalInterviewService.getTestResults('session-1');

            expect(result).toHaveLength(1);
        });
    });

    describe('getUserSessions', () => {
        it('should fetch all sessions for user', async () => {
            const mockSessions = [
                { id: 'session-1', problem_id: 'two-sum' },
                { id: 'session-2', problem_id: 'three-sum' },
            ];
            mockSelectResponse = { data: mockSessions, error: null };

            const result = await TechnicalInterviewService.getUserSessions('user-id');

            expect(result).toHaveLength(2);
        });
    });
});
