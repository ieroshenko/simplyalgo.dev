import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

export interface AIAccessStatus {
    // Feature access
    canUseAICoach: boolean;
    canUseAIChat: boolean;
    canUseSystemDesign: boolean;

    // Limits
    dailyLimitTokens: number;
    monthlyLimitTokens: number;

    // Cooldown
    isOnCooldown: boolean;
    cooldownUntil: Date | null;
    cooldownReason: string | null;

    // Usage (approximate, may be slightly stale)
    tokensUsedToday: number;
    tokensUsedMonth: number;

    // Computed
    dailyLimitReached: boolean;
    monthlyLimitReached: boolean;

    // Status
    loading: boolean;
    error: Error | null;
}

interface RestrictionData {
    ai_coach_enabled: boolean;
    ai_chat_enabled: boolean;
    daily_limit_tokens: number;
    monthly_limit_tokens: number;
    cooldown_until: string | null;
    cooldown_reason: string | null;
}

const DEFAULT_STATUS: AIAccessStatus = {
    canUseAICoach: true,
    canUseAIChat: true,
    canUseSystemDesign: true,
    dailyLimitTokens: 100000,
    monthlyLimitTokens: 2000000,
    isOnCooldown: false,
    cooldownUntil: null,
    cooldownReason: null,
    tokensUsedToday: 0,
    tokensUsedMonth: 0,
    dailyLimitReached: false,
    monthlyLimitReached: false,
    loading: true,
    error: null,
};

const CACHE_KEY = 'simplyalgo_ai_access_status';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedStatus {
    status: AIAccessStatus;
    timestamp: number;
}

function loadFromCache(): AIAccessStatus | null {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { status, timestamp }: CachedStatus = JSON.parse(cached);

        // Check if cache is still valid
        if (Date.now() - timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        // Restore Date objects
        if (status.cooldownUntil) {
            status.cooldownUntil = new Date(status.cooldownUntil);
        }

        return { ...status, loading: false };
    } catch {
        return null;
    }
}

function saveToCache(status: AIAccessStatus): void {
    try {
        const cached: CachedStatus = {
            status,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
        // Ignore cache errors
    }
}

/**
 * Hook to get the current user's AI access status.
 * 
 * This fetches the user's AI restrictions and usage from the database
 * and caches them for 5 minutes. It automatically refreshes:
 * - On mount
 * - Every 5 minutes
 * - When the tab becomes visible
 * 
 * Usage:
 * ```tsx
 * const { canUseAICoach, isOnCooldown, dailyLimitReached, loading } = useAIAccessStatus();
 * 
 * if (!canUseAICoach || isOnCooldown || dailyLimitReached) {
 *   return <AccessDeniedMessage />;
 * }
 * ```
 */
export function useAIAccessStatus(): AIAccessStatus & { refresh: () => Promise<void> } {
    const { session } = useAuth();
    const userId = session?.user?.id;

    const [status, setStatus] = useState<AIAccessStatus>(() => {
        // Try to load from cache first for instant UI
        const cached = loadFromCache();
        return cached || DEFAULT_STATUS;
    });

    const fetchStatus = useCallback(async () => {
        if (!userId) {
            setStatus({ ...DEFAULT_STATUS, loading: false });
            return;
        }

        try {
            // Fetch restrictions
            const { data: restriction, error: restrictionError } = await supabase
                .from('user_ai_restrictions')
                .select('*')
                .eq('user_id', userId)
                .single();

            // If no record exists, use defaults (access allowed)
            if (restrictionError?.code === 'PGRST116' || !restriction) {
                const defaultStatus: AIAccessStatus = {
                    ...DEFAULT_STATUS,
                    loading: false,
                };
                setStatus(defaultStatus);
                saveToCache(defaultStatus);
                return;
            }

            if (restrictionError) {
                throw restrictionError;
            }

            const typedRestriction = restriction as RestrictionData;

            // Check cooldown
            const cooldownUntil = typedRestriction.cooldown_until
                ? new Date(typedRestriction.cooldown_until)
                : null;
            const isOnCooldown = cooldownUntil ? cooldownUntil > new Date() : false;

            // For now, we don't fetch actual usage (would add latency)
            // Instead, we just check if access is enabled
            // Usage tracking is done async after successful AI calls
            const tokensUsedToday = 0; // Placeholder - could fetch from user_ai_usage if needed
            const tokensUsedMonth = 0;

            const newStatus: AIAccessStatus = {
                canUseAICoach: typedRestriction.ai_coach_enabled !== false,
                canUseAIChat: typedRestriction.ai_chat_enabled !== false,
                canUseSystemDesign: typedRestriction.ai_chat_enabled !== false, // Uses same setting
                dailyLimitTokens: typedRestriction.daily_limit_tokens || 100000,
                monthlyLimitTokens: typedRestriction.monthly_limit_tokens || 2000000,
                isOnCooldown,
                cooldownUntil,
                cooldownReason: typedRestriction.cooldown_reason,
                tokensUsedToday,
                tokensUsedMonth,
                dailyLimitReached: tokensUsedToday >= (typedRestriction.daily_limit_tokens || 100000),
                monthlyLimitReached: tokensUsedMonth >= (typedRestriction.monthly_limit_tokens || 2000000),
                loading: false,
                error: null,
            };

            setStatus(newStatus);
            saveToCache(newStatus);
            logger.debug('[useAIAccessStatus] Status fetched', { userId, isOnCooldown, canUseAICoach: newStatus.canUseAICoach });

        } catch (error) {
            logger.error('[useAIAccessStatus] Error fetching status', { error, userId });
            setStatus(prev => ({
                ...prev,
                loading: false,
                error: error as Error,
            }));
        }
    }, [userId]);

    // Fetch on mount and when userId changes
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(fetchStatus, CACHE_DURATION_MS);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Refresh when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchStatus]);

    return { ...status, refresh: fetchStatus };
}

/**
 * Helper function to get a user-friendly denial message
 */
export function getAccessDeniedMessage(status: AIAccessStatus): string {
    if (status.isOnCooldown && status.cooldownUntil) {
        const timeLeft = Math.ceil((status.cooldownUntil.getTime() - Date.now()) / 1000 / 60);
        const reason = status.cooldownReason ? `: ${status.cooldownReason}` : '';
        if (timeLeft > 60) {
            const hours = Math.ceil(timeLeft / 60);
            return `AI access is paused for ${hours} hour${hours > 1 ? 's' : ''}${reason}`;
        }
        return `AI access is paused for ${timeLeft} minute${timeLeft > 1 ? 's' : ''}${reason}`;
    }

    if (status.dailyLimitReached) {
        return 'Daily AI usage limit reached. Resets at midnight.';
    }

    if (status.monthlyLimitReached) {
        return 'Monthly AI usage limit reached. Resets at the start of next month.';
    }

    return 'AI access is currently unavailable.';
}

/**
 * Check if the user can use a specific AI feature
 */
export function canUseFeature(status: AIAccessStatus, feature: 'ai_coach' | 'ai_chat' | 'system_design'): boolean {
    if (status.loading) return false;
    if (status.isOnCooldown) return false;
    if (status.dailyLimitReached || status.monthlyLimitReached) return false;

    switch (feature) {
        case 'ai_coach':
            return status.canUseAICoach;
        case 'ai_chat':
            return status.canUseAIChat;
        case 'system_design':
            return status.canUseSystemDesign;
        default:
            return false;
    }
}
