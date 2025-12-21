/**
 * Hook for managing editor highlights during coaching
 */
import { useCallback, useRef } from "react";
import { CoachHighlightArea } from "@/types";
import { logger } from "@/utils/logger";
import type { UseCoachingProps } from "./types";

type EditorRef = UseCoachingProps['editorRef'];

export interface UseCoachingEditorResult {
    /** Apply or clear highlight decorations on the editor */
    applyHighlight: (highlightArea: CoachHighlightArea | null) => void;
    /** Get screen position for a given line number */
    getScreenPosition: (lineNumber: number) => { x: number; y: number };
    /** Ref holding current decoration IDs */
    highlightDecorationsRef: React.MutableRefObject<string[]>;
}

/**
 * Hook to manage editor highlighting and position calculation
 */
export const useCoachingEditor = (editorRef: EditorRef): UseCoachingEditorResult => {
    const highlightDecorationsRef = useRef<string[]>([]);

    /**
     * Apply highlight decoration to editor
     */
    const applyHighlight = useCallback((highlightArea: CoachHighlightArea | null) => {
        if (!editorRef.current) return;

        try {
            if (highlightArea) {
                const newDecorations = [{
                    range: {
                        startLineNumber: highlightArea.startLine,
                        startColumn: 1,
                        endLineNumber: highlightArea.startLine, // Only highlight single line
                        endColumn: 1000
                    },
                    options: {
                        className: 'coach-highlight-area',
                        isWholeLine: true
                    }
                }];

                highlightDecorationsRef.current = editorRef.current.deltaDecorations(
                    highlightDecorationsRef.current,
                    newDecorations
                );
            } else {
                // Clear highlights
                highlightDecorationsRef.current = editorRef.current.deltaDecorations(
                    highlightDecorationsRef.current,
                    []
                );
            }
        } catch (error) {
            logger.error("Error applying highlight", error, { component: "Coaching" });
        }
    }, [editorRef]);

    /**
     * Calculate screen position for a given line number
     */
    const getScreenPosition = useCallback((lineNumber: number): { x: number; y: number } => {
        try {
            if (!editorRef.current) {
                return { x: 100, y: 150 };
            }

            const position = { lineNumber, column: 1 };
            const screenPos = editorRef.current.getScrolledVisiblePosition?.(position);

            if (screenPos) {
                const belowY = (screenPos.top || 0) + (screenPos.height || 20) + 12;
                return {
                    x: Math.max(50, Math.min(window.innerWidth - 400, (screenPos.left || 0) + 50)),
                    y: Math.max(30, Math.min(window.innerHeight - 300, belowY))
                };
            }

            // Fallback positioning
            const estimatedY = 150 + (lineNumber * 20);
            return {
                x: Math.max(50, Math.min(window.innerWidth - 400, 100)),
                y: Math.max(30, Math.min(window.innerHeight - 300, estimatedY))
            };
        } catch (error) {
            logger.warn("Error calculating position", { component: "Coaching", error });
            return { x: 100, y: 150 };
        }
    }, [editorRef]);

    return {
        applyHighlight,
        getScreenPosition,
        highlightDecorationsRef,
    };
};
