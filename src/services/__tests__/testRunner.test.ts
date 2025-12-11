import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase with proper hoisting
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
        },
        functions: {
            invoke: vi.fn(),
        },
    },
}));

import { TestRunnerService, RunCodePayload } from '../testRunner';
import { supabase } from '@/integrations/supabase/client';

describe('TestRunnerService', () => {
    const mockGetSession = vi.mocked(supabase.auth.getSession);
    const mockInvoke = vi.mocked(supabase.functions.invoke);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('runCode', () => {
        const mockPayload: RunCodePayload = {
            language: 'python',
            code: 'def solution(x): return x * 2',
            testCases: [
                { input: '5', expected: '10' },
                { input: '3', expected: '6' },
            ],
        };

        const mockSession = {
            access_token: 'test-token',
        };

        it('should call supabase edge function with correct payload', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: mockSession as any },
                error: null,
            });

            mockInvoke.mockResolvedValue({
                data: {
                    results: [
                        { passed: true, input: '5', expected: '10', actual: '10', stdout: '', stderr: '' },
                        { passed: true, input: '3', expected: '6', actual: '6', stdout: '', stderr: '' },
                    ],
                },
                error: null,
            });

            const result = await TestRunnerService.runCode(mockPayload);

            expect(mockInvoke).toHaveBeenCalledWith('code-executor-api', {
                body: {
                    language: 'python',
                    code: 'def solution(x): return x * 2',
                    testCases: mockPayload.testCases,
                },
                headers: {
                    Authorization: 'Bearer test-token',
                },
            });

            expect(result.results).toHaveLength(2);
            expect(result.results[0].passed).toBe(true);
        });

        it('should use problemId when provided instead of testCases', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: mockSession as any },
                error: null,
            });

            mockInvoke.mockResolvedValue({
                data: {
                    results: [{ passed: true, input: '5', expected: '10', actual: '10', stdout: '', stderr: '' }],
                },
                error: null,
            });

            const payloadWithProblemId: RunCodePayload = {
                ...mockPayload,
                problemId: 'two-sum',
            };

            await TestRunnerService.runCode(payloadWithProblemId);

            expect(mockInvoke).toHaveBeenCalledWith('code-executor-api', {
                body: {
                    language: 'python',
                    code: 'def solution(x): return x * 2',
                    problemId: 'two-sum',
                },
                headers: expect.any(Object),
            });
        });

        it('should handle missing session gracefully', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: null },
                error: null,
            });

            mockInvoke.mockResolvedValue({
                data: {
                    results: [{ passed: true, input: '5', expected: '10', actual: '10', stdout: '', stderr: '' }],
                },
                error: null,
            });

            await TestRunnerService.runCode(mockPayload);

            expect(mockInvoke).toHaveBeenCalledWith('code-executor-api', {
                body: expect.any(Object),
                headers: {
                    Authorization: '',
                },
            });
        });

        it('should return error results when API returns error', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: mockSession as any },
                error: null,
            });

            mockInvoke.mockResolvedValue({
                data: null,
                error: { message: 'Server error' } as any,
            });

            const result = await TestRunnerService.runCode(mockPayload);

            expect(result.results).toHaveLength(2);
            expect(result.results[0].passed).toBe(false);
            expect(result.results[0].stderr).toContain('API Error');
        });

        it('should return error results when response is invalid', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: mockSession as any },
                error: null,
            });

            mockInvoke.mockResolvedValue({
                data: { invalid: 'response' },
                error: null,
            });

            const result = await TestRunnerService.runCode(mockPayload);

            expect(result.results).toHaveLength(2);
            expect(result.results[0].passed).toBe(false);
            expect(result.results[0].stderr).toContain('Invalid response');
        });

        it('should return error results when function throws', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: mockSession as any },
                error: null,
            });

            mockInvoke.mockRejectedValue(new Error('Network error'));

            const result = await TestRunnerService.runCode(mockPayload);

            expect(result.results).toHaveLength(2);
            expect(result.results[0].passed).toBe(false);
            expect(result.results[0].stderr).toContain('Network error');
        });

        it('should return proper structure for each test case result', async () => {
            mockGetSession.mockResolvedValue({
                data: { session: mockSession as any },
                error: null,
            });

            const mockResults = [
                { passed: true, input: '5', expected: '10', actual: '10', stdout: 'output1', stderr: '', time: '5ms' },
                { passed: false, input: '3', expected: '6', actual: '5', stdout: 'output2', stderr: 'error', time: '3ms' },
            ];

            mockInvoke.mockResolvedValue({
                data: { results: mockResults },
                error: null,
            });

            const result = await TestRunnerService.runCode(mockPayload);

            expect(result.results[0]).toMatchObject({
                passed: true,
                input: '5',
                expected: '10',
                actual: '10',
            });

            expect(result.results[1]).toMatchObject({
                passed: false,
                input: '3',
                expected: '6',
                actual: '5',
            });
        });
    });
});
