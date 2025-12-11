import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock response
let mockSingleResponse = { data: null, error: null };

// Mock supabase with proper hoisting
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn(() => Promise.resolve(mockSingleResponse)),
        })),
    },
}));

import { FeedbackService, FeedbackSubmission } from '../feedbackService';
import { supabase } from '@/integrations/supabase/client';

describe('FeedbackService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress expected console.error logs from error handling tests
        vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSingleResponse = { data: null, error: null };
    });

    describe('submitFeedback', () => {
        const mockFeedback: FeedbackSubmission = {
            category: 'general',
            content: 'Great app!',
            user_id: 'user-123',
        };

        it('should submit feedback successfully', async () => {
            mockSingleResponse = {
                data: { id: 'feedback-1', ...mockFeedback },
                error: null,
            };

            const result = await FeedbackService.submitFeedback(mockFeedback);

            expect(supabase.from).toHaveBeenCalledWith('feedback');
            expect(result).toEqual({ success: true });
        });

        it('should handle bug category', async () => {
            mockSingleResponse = { data: { id: '1' }, error: null };

            const bugFeedback: FeedbackSubmission = {
                category: 'bug',
                content: 'Found a bug',
                user_id: 'user-123',
            };

            const result = await FeedbackService.submitFeedback(bugFeedback);

            expect(result.success).toBe(true);
        });

        it('should handle feature category', async () => {
            mockSingleResponse = { data: { id: '1' }, error: null };

            const featureFeedback: FeedbackSubmission = {
                category: 'feature',
                content: 'Add dark mode',
                user_id: 'user-123',
            };

            const result = await FeedbackService.submitFeedback(featureFeedback);

            expect(result.success).toBe(true);
        });

        it('should handle ui category', async () => {
            mockSingleResponse = { data: { id: '1' }, error: null };

            const uiFeedback: FeedbackSubmission = {
                category: 'ui',
                content: 'UI looks great',
                user_id: 'user-123',
            };

            const result = await FeedbackService.submitFeedback(uiFeedback);

            expect(result.success).toBe(true);
        });

        it('should handle performance category', async () => {
            mockSingleResponse = { data: { id: '1' }, error: null };

            const perfFeedback: FeedbackSubmission = {
                category: 'performance',
                content: 'App is slow',
                user_id: 'user-123',
            };

            const result = await FeedbackService.submitFeedback(perfFeedback);

            expect(result.success).toBe(true);
        });

        it('should return error when submission fails', async () => {
            mockSingleResponse = {
                data: null,
                error: { message: 'Database error' },
            };

            const result = await FeedbackService.submitFeedback(mockFeedback);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });
});
