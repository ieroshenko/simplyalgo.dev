/**
 * Tests for useCoachingState hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoachingState } from '../useCoachingState';

// Mock OverlayPositionManager
vi.mock('@/services/overlayPositionManager', () => ({
    OverlayPositionManager: vi.fn().mockImplementation(() => ({
        getPositionWithFallback: vi.fn().mockReturnValue({ x: 100, y: 200 }),
    })),
}));

describe('useCoachingState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useCoachingState(undefined));

        expect(result.current.coachingState.isCoachModeActive).toBe(false);
        expect(result.current.coachingState.session).toBeNull();
        expect(result.current.coachingState.showInputOverlay).toBe(false);
        expect(result.current.coachingState.feedback.show).toBe(false);
    });

    describe('cancelInput', () => {
        it('should hide input overlay', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            // First show the overlay
            act(() => {
                result.current.setCoachingState(prev => ({
                    ...prev,
                    showInputOverlay: true,
                    inputPosition: { x: 100, y: 100 },
                }));
            });

            expect(result.current.coachingState.showInputOverlay).toBe(true);

            // Then cancel
            act(() => {
                result.current.cancelInput();
            });

            expect(result.current.coachingState.showInputOverlay).toBe(false);
            expect(result.current.coachingState.inputPosition).toBeNull();
        });
    });

    describe('closeFeedback', () => {
        it('should hide feedback', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            // First show feedback
            act(() => {
                result.current.setCoachingState(prev => ({
                    ...prev,
                    feedback: { show: true, type: 'success', message: 'Test', showConfetti: false },
                }));
            });

            expect(result.current.coachingState.feedback.show).toBe(true);

            // Then close
            act(() => {
                result.current.closeFeedback();
            });

            expect(result.current.coachingState.feedback.show).toBe(false);
        });
    });

    describe('getElapsedTime', () => {
        it('should return 0 when no session started', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            expect(result.current.getElapsedTime()).toBe(0);
        });

        it('should return elapsed seconds after start', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            // Set start time to 5 seconds ago
            act(() => {
                result.current.startTimeRef.current = new Date(Date.now() - 5000);
            });

            const elapsed = result.current.getElapsedTime();
            expect(elapsed).toBeGreaterThanOrEqual(4);
            expect(elapsed).toBeLessThanOrEqual(6);
        });
    });

    describe('setValidating', () => {
        it('should set validating and waiting states', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            act(() => {
                result.current.setValidating(true);
            });

            expect(result.current.coachingState.isValidating).toBe(true);
            expect(result.current.coachingState.isWaitingForResponse).toBe(true);

            act(() => {
                result.current.setValidating(false);
            });

            expect(result.current.coachingState.isValidating).toBe(false);
            expect(result.current.coachingState.isWaitingForResponse).toBe(false);
        });
    });

    describe('setFeedback', () => {
        it('should update feedback state', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            act(() => {
                result.current.setFeedback({
                    show: true,
                    type: 'error',
                    message: 'Something went wrong',
                    showConfetti: false,
                });
            });

            expect(result.current.coachingState.feedback.show).toBe(true);
            expect(result.current.coachingState.feedback.type).toBe('error');
            expect(result.current.coachingState.feedback.message).toBe('Something went wrong');
        });
    });

    describe('markSessionCompleted', () => {
        it('should mark session as completed', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            // First set up a session
            act(() => {
                result.current.setCoachingState(prev => ({
                    ...prev,
                    session: {
                        id: 'test-session',
                        currentStepNumber: 1,
                        isCompleted: false,
                        currentQuestion: 'Test question',
                        currentHint: 'Test hint',
                        highlightArea: null,
                    } as any,
                }));
            });

            // Then complete it
            act(() => {
                result.current.markSessionCompleted(true);
            });

            expect(result.current.coachingState.session?.isCompleted).toBe(true);
            expect(result.current.coachingState.session?.currentQuestion).toBe('');
            expect(result.current.coachingState.isOptimizable).toBe(true);
        });
    });

    describe('resetCoachingState', () => {
        it('should reset all state to initial values', () => {
            const mockApplyHighlight = vi.fn();
            const { result } = renderHook(() => useCoachingState(undefined));

            // First modify state
            act(() => {
                result.current.setCoachingState(prev => ({
                    ...prev,
                    isCoachModeActive: true,
                    showInputOverlay: true,
                    session: { id: 'test' } as any,
                }));
                result.current.startTimeRef.current = new Date();
            });

            // Then reset
            act(() => {
                result.current.resetCoachingState(mockApplyHighlight);
            });

            expect(result.current.coachingState.isCoachModeActive).toBe(false);
            expect(result.current.coachingState.showInputOverlay).toBe(false);
            expect(result.current.coachingState.session).toBeNull();
            expect(result.current.startTimeRef.current).toBeNull();
            expect(mockApplyHighlight).toHaveBeenCalledWith(null);
        });
    });

    describe('contextState', () => {
        it('should initialize with empty context', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            expect(result.current.contextState.responseId).toBeNull();
            expect(result.current.contextState.contextInitialized).toBe(false);
            expect(result.current.contextState.lastCodeSnapshot).toBe('');
        });

        it('should update context state', () => {
            const { result } = renderHook(() => useCoachingState(undefined));

            act(() => {
                result.current.setContextState({
                    responseId: 'response-123',
                    contextInitialized: true,
                    lastCodeSnapshot: 'def solution(): pass',
                });
            });

            expect(result.current.contextState.responseId).toBe('response-123');
            expect(result.current.contextState.contextInitialized).toBe(true);
        });
    });
});
