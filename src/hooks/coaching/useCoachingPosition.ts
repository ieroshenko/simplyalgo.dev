/**
 * Hook for managing overlay positioning during coaching
 */
import { useCallback, useMemo } from "react";
import { logger } from "@/utils/logger";
import { OverlayPositionManager } from "@/services/overlayPositionManager";
import type { UseCoachingProps, ScreenPosition } from "./types";
import { getFallbackPosition } from "./coachingUtils";

type EditorRef = UseCoachingProps['editorRef'];

export interface UseCoachingPositionResult {
    /** Position manager instance */
    positionManager: OverlayPositionManager | undefined;
    /** Calculate position below the last code line */
    getPositionBelowLastLine: () => ScreenPosition;
    /** Handle position changes for persistence */
    handlePositionChange: (position: ScreenPosition) => void;
}

/**
 * Hook to manage overlay positioning using OverlayPositionManager
 */
export const useCoachingPosition = (
    problemId: string,
    editorRef: EditorRef
): UseCoachingPositionResult => {
    // Initialize position manager for centralized overlay positioning
    const positionManager = useMemo(() => {
        if (problemId) {
            return new OverlayPositionManager(problemId);
        }
        return undefined;
    }, [problemId]);

    /**
     * Calculate position for overlay below the last line of code
     */
    const getPositionBelowLastLine = useCallback((): ScreenPosition => {
        try {
            if (!editorRef.current || !positionManager) {
                return getFallbackPosition();
            }

            // Get editor bounds
            const editorNode = editorRef.current.getDomNode?.();
            const editorRect = editorNode?.getBoundingClientRect();

            if (!editorRect) {
                // Use fallback positioning when editor bounds unavailable
                const fallbackPosition = positionManager.getPositionWithFallback();
                return { x: fallbackPosition.x, y: fallbackPosition.y };
            }

            const editorBounds = {
                left: editorRect.left,
                top: editorRect.top,
                right: editorRect.right,
                bottom: editorRect.bottom,
                width: editorRect.width,
                height: editorRect.height,
            };

            // Get the last line number for positioning
            const code = editorRef.current.getValue();
            const totalLines = Math.max(1, (code || "").split('\n').length);

            // Use OverlayPositionManager for smart positioning
            const position = positionManager.getPositionWithFallback(editorBounds, totalLines);
            return { x: position.x, y: position.y };
        } catch (error) {
            logger.warn("Error calculating position using OverlayPositionManager", { component: "Coaching", error });
            return getFallbackPosition();
        }
    }, [editorRef, positionManager]);

    /**
     * Handle position changes for persistence
     */
    const handlePositionChange = useCallback((position: ScreenPosition) => {
        if (!positionManager) return;

        try {
            // Get editor bounds for validation
            const editorNode = editorRef.current?.getDomNode?.();
            const editorRect = editorNode?.getBoundingClientRect();

            if (editorRect) {
                const editorBounds = {
                    left: editorRect.left,
                    top: editorRect.top,
                    right: editorRect.right,
                    bottom: editorRect.bottom,
                    width: editorRect.width,
                    height: editorRect.height,
                };

                const overlayPosition = {
                    x: position.x,
                    y: position.y,
                    timestamp: Date.now(),
                    screenSize: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                    },
                };

                // Validate and save position
                const validatedPosition = positionManager.validatePosition(overlayPosition, editorBounds);
                positionManager.savePosition(validatedPosition);
            }
        } catch (error) {
            logger.warn("Failed to save position", { component: "Coaching", error });
        }
    }, [positionManager, editorRef]);

    return {
        positionManager,
        getPositionBelowLastLine,
        handlePositionChange,
    };
};
