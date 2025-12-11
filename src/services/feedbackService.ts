import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export interface FeedbackSubmission {
  category: 'general' | 'bug' | 'feature' | 'ui' | 'performance';
  content: string;
  user_id: string;
}

export class FeedbackService {
  static async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          ...feedback,
          user_id: feedback.user_id,
        })
        .select()
        .single();

      if (error) {
        logger.error('[FeedbackService] Error submitting feedback', { userId: feedback.user_id, category: feedback.category, error });
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('[FeedbackService] Unexpected error submitting feedback', { userId: feedback.user_id, error });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}