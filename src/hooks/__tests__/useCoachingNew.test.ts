import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock = {} as Record<string, unknown>;
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
            functions: {
                invoke: vi.fn().mockResolvedValue({
                    data: { response: 'AI response', hint: 'Test hint' },
                    error: null
                }),
            },
        },
    };
});

// Mock OverlayPositionManager
vi.mock('@/services/overlayPositionManager', () => ({
    OverlayPositionManager: vi.fn().mockImplementation(() => ({
        initialize: vi.fn(),
        calculatePosition: vi.fn().mockReturnValue({ x: 100, y: 200 }),
        getEditorBounds: vi.fn().mockReturnValue({ left: 0, top: 0, width: 800, height: 600 }),
        getBestPreset: vi.fn().mockReturnValue('right'),
        getPositionWithFallback: vi.fn().mockReturnValue({ x: 100, y: 150 }),
        validatePosition: vi.fn((pos: any) => pos),
        savePosition: vi.fn(),
        cleanup: vi.fn(),
    })),
}));

import { useCoachingNew } from '../useCoachingNew';

describe('useCoachingNew', () => {
    const mockEditorRef = {
        current: {
            getValue: vi.fn(() => 'def solution(): pass'),
            setValue: vi.fn(),
            getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
            getModel: vi.fn(() => ({
                getLineContent: vi.fn(() => 'def solution(): pass'),
            })),
            deltaDecorations: vi.fn(() => []),
            getScrollTop: vi.fn(() => 0),
            getVisibleRanges: vi.fn(() => []),
            getDomNode: vi.fn(() => null),
            getScrolledVisiblePosition: vi.fn(() => null),
        },
    };

    const defaultProps = {
        problemId: 'two-sum',
        userId: 'user-123',
        problemDescription: 'Find two numbers that sum to target',
        editorRef: mockEditorRef as any,
        onCodeInsert: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should return initial coaching state', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.coachingState).toBeDefined();
            expect(result.current.coachingState.isCoachModeActive).toBe(false);
            expect(result.current.coachingState.session).toBeNull();
        });

        it('should return coach mode as inactive initially', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.coachingState.isCoachModeActive).toBe(false);
        });

        it('should have initial feedback state', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.coachingState.feedback).toBeDefined();
            expect(result.current.coachingState.feedback.show).toBe(false);
        });
    });

    describe('Coaching Controls', () => {
        // Fixed: actual function names from hook return
        it('should provide startCoaching function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.startCoaching).toBeDefined();
            expect(typeof result.current.startCoaching).toBe('function');
        });

        it('should provide stopCoaching function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.stopCoaching).toBeDefined();
            expect(typeof result.current.stopCoaching).toBe('function');
        });

        it('should provide submitResponse function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.submitResponse).toBeDefined();
            expect(typeof result.current.submitResponse).toBe('function');
        });

        it('should provide submitCoachingCode function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.submitCoachingCode).toBeDefined();
            expect(typeof result.current.submitCoachingCode).toBe('function');
        });
    });

    describe('Actions', () => {
        it('should provide cancelInput function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.cancelInput).toBeDefined();
            expect(typeof result.current.cancelInput).toBe('function');
        });

        it('should provide closeFeedback function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.closeFeedback).toBeDefined();
            expect(typeof result.current.closeFeedback).toBe('function');
        });

        it('should provide skipStep function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.skipStep).toBeDefined();
            expect(typeof result.current.skipStep).toBe('function');
        });

        it('should provide startOptimization function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.startOptimization).toBeDefined();
            expect(typeof result.current.startOptimization).toBe('function');
        });

        it('should provide handlePositionChange function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.handlePositionChange).toBeDefined();
            expect(typeof result.current.handlePositionChange).toBe('function');
        });

        it('should provide getElapsedTime function', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.getElapsedTime).toBeDefined();
            expect(typeof result.current.getElapsedTime).toBe('function');
        });
    });

    describe('State Properties', () => {
        it('should track waiting for response state', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(typeof result.current.coachingState.isWaitingForResponse).toBe('boolean');
        });

        it('should track input overlay visibility', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(result.current.coachingState.showInputOverlay).toBe(false);
        });

        it('should track validating state', () => {
            const { result } = renderHook(() => useCoachingNew(defaultProps));

            expect(typeof result.current.coachingState.isValidating).toBe('boolean');
        });
    });
});
