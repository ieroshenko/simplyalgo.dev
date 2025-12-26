import { useEffect, useRef, useCallback } from 'react';
import {
    startFeatureTimer,
    stopFeatureTimer,
    trackFeatureEngagement,
    Features,
    type FeatureName
} from '@/services/analytics';

/**
 * React hook for automatically tracking time spent on a feature
 * Automatically starts timer on mount and stops on unmount
 * 
 * @example
 * // Basic usage - track time on AI Chat
 * useFeatureTracking(Features.AI_CHAT);
 * 
 * @example
 * // With metadata
 * useFeatureTracking(Features.PROBLEM_SOLVER, { 
 *   problemId: 'two-sum',
 *   difficulty: 'easy' 
 * });
 * 
 * @example
 * // Track engagement manually
 * const { trackEngagement } = useFeatureTracking(Features.CODE_EDITOR);
 * // Later, when user does something meaningful:
 * trackEngagement({ interactionCount: 5, depth: 'deep' });
 */
export function useFeatureTracking(
    feature: FeatureName,
    metadata?: Record<string, unknown>,
    options?: {
        /** If false, won't automatically start/stop timer */
        autoTrack?: boolean;
        /** Called when feature timer starts */
        onStart?: () => void;
        /** Called when feature timer stops, includes duration */
        onStop?: (durationMs: number | null) => void;
    }
) {
    const { autoTrack = true, onStart, onStop } = options || {};
    const startTimeRef = useRef<number | null>(null);
    const interactionCountRef = useRef(0);

    // Start tracking
    const startTracking = useCallback(() => {
        startFeatureTimer(feature, metadata);
        startTimeRef.current = Date.now();
        onStart?.();
    }, [feature, metadata, onStart]);

    // Stop tracking
    const stopTracking = useCallback(() => {
        const duration = stopFeatureTimer(feature);
        onStop?.(duration);
        startTimeRef.current = null;
        interactionCountRef.current = 0;
        return duration;
    }, [feature, onStop]);

    // Track a user interaction (click, input, etc.)
    const trackInteraction = useCallback(() => {
        interactionCountRef.current += 1;
    }, []);

    // Track engagement with custom metrics
    const trackEngagement = useCallback((metrics: {
        interactionCount?: number;
        completionPercent?: number;
        depth?: 'shallow' | 'medium' | 'deep';
        [key: string]: unknown;
    }) => {
        trackFeatureEngagement(feature, {
            ...metrics,
            // Include auto-tracked interactions if not provided
            interactionCount: metrics.interactionCount ?? interactionCountRef.current,
            ...metadata,
        });
    }, [feature, metadata]);

    // Auto-track on mount/unmount
    useEffect(() => {
        if (autoTrack) {
            startTracking();
            return () => {
                stopTracking();
            };
        }
    }, [autoTrack, startTracking, stopTracking]);

    return {
        startTracking,
        stopTracking,
        trackInteraction,
        trackEngagement,
        isTracking: startTimeRef.current !== null,
    };
}

// Re-export Features for convenience
export { Features };
export type { FeatureName };

/**
 * Simple hook variant that just tracks time, no extra features
 * 
 * @example
 * useTrackFeatureTime(Features.FLASHCARDS);
 */
export function useTrackFeatureTime(feature: FeatureName, metadata?: Record<string, unknown>) {
    useEffect(() => {
        startFeatureTimer(feature, metadata);
        return () => {
            stopFeatureTimer(feature);
        };
    }, [feature, metadata]);
}
