import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock TechnicalInterviewService
vi.mock('@/features/technical-interview/services/technicalInterviewService', () => ({
    TechnicalInterviewService: {
        createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
        addTranscript: vi.fn().mockResolvedValue({}),
        saveCodeSnapshot: vi.fn().mockResolvedValue({}),
        saveTestResults: vi.fn().mockResolvedValue({}),
        saveFeedback: vi.fn().mockResolvedValue({}),
        endSession: vi.fn().mockResolvedValue({}),
    },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'user-123' },
    })),
}));

import { useTechnicalInterview } from '@/features/technical-interview/hooks/useTechnicalInterview';

describe('useTechnicalInterview', () => {
    const defaultProps = {
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers that sum to target',
        problemId: 'two-sum',
        testCases: [{ input: '[2,7,11,15]', expected: '[0,1]' }],
        voice: 'alloy',
        onConnectionStatusChange: vi.fn(),
        onTranscript: vi.fn(),
        onTimeUp: vi.fn(),
        onFeedbackReceived: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should return null audio analyser initially', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current.audioAnalyser).toBeNull();
        });

        it('should return initial time remaining', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            // 30 minutes = 1800 seconds
            expect(result.current.timeRemaining).toBe(1800);
        });

        it('should return no error initially', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current.error).toBeNull();
        });
    });

    describe('Interview Controls', () => {
        it('should provide startInterview function', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current.startInterview).toBeDefined();
            expect(typeof result.current.startInterview).toBe('function');
        });

        it('should provide stopInterview function', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current.stopInterview).toBeDefined();
            expect(typeof result.current.stopInterview).toBe('function');
        });

        it('should provide sendCodeUpdate function', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current.sendCodeUpdate).toBeDefined();
            expect(typeof result.current.sendCodeUpdate).toBe('function');
        });

        it('should provide requestEvaluation function', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current.requestEvaluation).toBeDefined();
            expect(typeof result.current.requestEvaluation).toBe('function');
        });
    });

    describe('Return Type', () => {
        it('should return all expected properties', () => {
            const { result } = renderHook(() => useTechnicalInterview(defaultProps));

            expect(result.current).toHaveProperty('startInterview');
            expect(result.current).toHaveProperty('stopInterview');
            expect(result.current).toHaveProperty('sendCodeUpdate');
            expect(result.current).toHaveProperty('requestEvaluation');
            expect(result.current).toHaveProperty('audioAnalyser');
            expect(result.current).toHaveProperty('timeRemaining');
            expect(result.current).toHaveProperty('error');
        });
    });
});
