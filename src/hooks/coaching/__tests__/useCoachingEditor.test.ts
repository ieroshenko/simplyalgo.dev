/**
 * Tests for useCoachingEditor hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoachingEditor } from '../useCoachingEditor';

describe('useCoachingEditor', () => {
    const createMockEditorRef = () => ({
        current: {
            getValue: vi.fn(() => 'def solution(): pass'),
            setValue: vi.fn(),
            deltaDecorations: vi.fn((oldIds: string[], newDecs: unknown[]) =>
                newDecs.length > 0 ? ['decoration-1'] : []
            ),
            getScrollTop: vi.fn(() => 0),
            getVisibleRanges: vi.fn(() => []),
            getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
            getDomNode: vi.fn(() => null),
            getScrolledVisiblePosition: vi.fn((pos: { lineNumber: number }) => ({
                left: 100,
                top: 50 + pos.lineNumber * 20,
                height: 20,
            })),
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('applyHighlight', () => {
        it('should apply highlight decoration', () => {
            const editorRef = createMockEditorRef();
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            act(() => {
                result.current.applyHighlight({ startLine: 5, endLine: 10 });
            });

            expect(editorRef.current.deltaDecorations).toHaveBeenCalledWith(
                [],
                expect.arrayContaining([
                    expect.objectContaining({
                        range: expect.objectContaining({
                            startLineNumber: 5,
                        }),
                        options: expect.objectContaining({
                            className: 'coach-highlight-area',
                            isWholeLine: true,
                        }),
                    }),
                ])
            );
        });

        it('should clear highlights when called with null', () => {
            const editorRef = createMockEditorRef();
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            // First apply a highlight
            act(() => {
                result.current.applyHighlight({ startLine: 5, endLine: 10 });
            });

            // Then clear it
            act(() => {
                result.current.applyHighlight(null);
            });

            // Second call should clear decorations
            expect(editorRef.current.deltaDecorations).toHaveBeenLastCalledWith(
                ['decoration-1'],
                []
            );
        });

        it('should handle null editor ref gracefully', () => {
            const editorRef = { current: null };
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            // Should not throw
            expect(() => {
                act(() => {
                    result.current.applyHighlight({ startLine: 1, endLine: 1 });
                });
            }).not.toThrow();
        });
    });

    describe('getScreenPosition', () => {
        it('should return calculated position from editor', () => {
            const editorRef = createMockEditorRef();
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            const position = result.current.getScreenPosition(5);

            expect(position.x).toBeGreaterThan(0);
            expect(position.y).toBeGreaterThan(0);
        });

        it('should return fallback position when editor unavailable', () => {
            const editorRef = { current: null };
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            const position = result.current.getScreenPosition(1);

            expect(position).toEqual({ x: 100, y: 150 });
        });

        it('should clamp position to viewport bounds', () => {
            const editorRef = createMockEditorRef();
            editorRef.current.getScrolledVisiblePosition = vi.fn(() => ({
                left: -100,
                top: -50,
                height: 20,
            }));
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            const position = result.current.getScreenPosition(1);

            expect(position.x).toBeGreaterThanOrEqual(50);
            expect(position.y).toBeGreaterThanOrEqual(30);
        });
    });

    describe('highlightDecorationsRef', () => {
        it('should track decoration IDs', () => {
            const editorRef = createMockEditorRef();
            const { result } = renderHook(() => useCoachingEditor(editorRef as any));

            expect(result.current.highlightDecorationsRef.current).toEqual([]);

            act(() => {
                result.current.applyHighlight({ startLine: 1, endLine: 1 });
            });

            expect(result.current.highlightDecorationsRef.current).toEqual(['decoration-1']);
        });
    });
});
