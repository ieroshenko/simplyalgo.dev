import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { getAccessDeniedMessage, canUseFeature, AIAccessStatus } from '../useAIAccessStatus';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
    },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        session: { user: { id: 'test-user-id' } },
    }),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

describe('useAIAccessStatus helpers', () => {
    describe('getAccessDeniedMessage', () => {
        it('should return cooldown message when on cooldown', () => {
            const status: AIAccessStatus = {
                canUseAICoach: true,
                canUseAIChat: true,
                canUseSystemDesign: true,
                dailyLimitTokens: 100000,
                monthlyLimitTokens: 2000000,
                isOnCooldown: true,
                cooldownUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
                cooldownReason: 'Rate limit exceeded',
                tokensUsedToday: 0,
                tokensUsedMonth: 0,
                dailyLimitReached: false,
                monthlyLimitReached: false,
                loading: false,
                error: null,
            };

            const message = getAccessDeniedMessage(status);
            expect(message).toContain('paused for');
            expect(message).toContain('Rate limit exceeded');
        });

        it('should return daily limit message when daily limit reached', () => {
            const status: AIAccessStatus = {
                canUseAICoach: true,
                canUseAIChat: true,
                canUseSystemDesign: true,
                dailyLimitTokens: 100000,
                monthlyLimitTokens: 2000000,
                isOnCooldown: false,
                cooldownUntil: null,
                cooldownReason: null,
                tokensUsedToday: 100000,
                tokensUsedMonth: 100000,
                dailyLimitReached: true,
                monthlyLimitReached: false,
                loading: false,
                error: null,
            };

            const message = getAccessDeniedMessage(status);
            expect(message).toContain('Daily');
            expect(message).toContain('midnight');
        });

        it('should return monthly limit message when monthly limit reached', () => {
            const status: AIAccessStatus = {
                canUseAICoach: true,
                canUseAIChat: true,
                canUseSystemDesign: true,
                dailyLimitTokens: 100000,
                monthlyLimitTokens: 2000000,
                isOnCooldown: false,
                cooldownUntil: null,
                cooldownReason: null,
                tokensUsedToday: 50000,
                tokensUsedMonth: 2000000,
                dailyLimitReached: false,
                monthlyLimitReached: true,
                loading: false,
                error: null,
            };

            const message = getAccessDeniedMessage(status);
            expect(message).toContain('Monthly');
        });
    });

    describe('canUseFeature', () => {
        const baseStatus: AIAccessStatus = {
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
            loading: false,
            error: null,
        };

        it('should return true when access is allowed', () => {
            expect(canUseFeature(baseStatus, 'ai_coach')).toBe(true);
            expect(canUseFeature(baseStatus, 'ai_chat')).toBe(true);
            expect(canUseFeature(baseStatus, 'system_design')).toBe(true);
        });

        it('should return false when loading', () => {
            const status = { ...baseStatus, loading: true };
            expect(canUseFeature(status, 'ai_coach')).toBe(false);
        });

        it('should return false when on cooldown', () => {
            const status = { ...baseStatus, isOnCooldown: true };
            expect(canUseFeature(status, 'ai_coach')).toBe(false);
        });

        it('should return false when daily limit reached', () => {
            const status = { ...baseStatus, dailyLimitReached: true };
            expect(canUseFeature(status, 'ai_coach')).toBe(false);
        });

        it('should return false when AI Coach is disabled', () => {
            const status = { ...baseStatus, canUseAICoach: false };
            expect(canUseFeature(status, 'ai_coach')).toBe(false);
            expect(canUseFeature(status, 'ai_chat')).toBe(true); // Other features still work
        });

        it('should return false when AI Chat is disabled', () => {
            const status = { ...baseStatus, canUseAIChat: false };
            expect(canUseFeature(status, 'ai_chat')).toBe(false);
            expect(canUseFeature(status, 'ai_coach')).toBe(true); // Other features still work
        });
    });
});
