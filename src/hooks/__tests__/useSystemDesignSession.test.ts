import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock supabase responses
vi.mock('@/integrations/supabase/client', () => {
    const createChainableMock = () => {
        const mock: any = {};
        mock.select = vi.fn(() => mock);
        mock.insert = vi.fn(() => mock);
        mock.update = vi.fn(() => mock);
        mock.delete = vi.fn(() => mock);
        mock.eq = vi.fn(() => mock);
        mock.order = vi.fn(() => mock);
        mock.limit = vi.fn(() => mock);
        mock.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mock.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return mock;
    };

    return {
        supabase: {
            from: vi.fn(() => createChainableMock()),
            functions: {
                invoke: vi.fn().mockResolvedValue({ data: { response: 'AI response' }, error: null }),
            },
        },
    };
});

import { useSystemDesignSession } from '../useSystemDesignSession';

describe('useSystemDesignSession', () => {
    const defaultProps = {
        problemId: 'sd_url_shortener',
        userId: 'user-123',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should return null session initially', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.session).toBeNull();
        });

        it('should return initial board state', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.boardState).toBeDefined();
        });

        it('should return empty messages initially', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.messages).toEqual([]);
        });

        it('should return loading state initially', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            // Hook uses 'loading' not 'isLoading'
            expect(result.current.loading).toBe(true);
        });
    });

    describe('Board State Management', () => {
        it('should provide updateBoard function', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            // Hook uses 'updateBoard' not 'updateBoardState'
            expect(result.current.updateBoard).toBeDefined();
            expect(typeof result.current.updateBoard).toBe('function');
        });
    });

    describe('Messaging', () => {
        it('should provide sendMessage function', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.sendMessage).toBeDefined();
            expect(typeof result.current.sendMessage).toBe('function');
        });

        it('should provide clearConversation function', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.clearConversation).toBeDefined();
            expect(typeof result.current.clearConversation).toBe('function');
        });

        it('should track typing state with isTyping', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(typeof result.current.isTyping).toBe('boolean');
            expect(result.current.isTyping).toBe(false);
        });
    });

    describe('Evaluation', () => {
        it('should provide evaluateDesign function', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.evaluateDesign).toBeDefined();
            expect(typeof result.current.evaluateDesign).toBe('function');
        });

        it('should track evaluation loading state', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(typeof result.current.isEvaluating).toBe('boolean');
        });

        it('should have evaluation property', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current).toHaveProperty('evaluation');
        });

        it('should have completeness property', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current).toHaveProperty('completeness');
        });
    });

    describe('Draft Management', () => {
        it('should provide saveDraft function', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.saveDraft).toBeDefined();
            expect(typeof result.current.saveDraft).toBe('function');
        });

        it('should provide restoreDraft function', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current.restoreDraft).toBeDefined();
            expect(typeof result.current.restoreDraft).toBe('function');
        });

        it('should track hasDraft state', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(typeof result.current.hasDraft).toBe('boolean');
            expect(result.current.hasDraft).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should have error property', () => {
            const { result } = renderHook(() => useSystemDesignSession(defaultProps));

            expect(result.current).toHaveProperty('error');
            expect(result.current.error).toBeNull();
        });
    });
});
