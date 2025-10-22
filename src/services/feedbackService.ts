import { supabase } from "@/integrations/supabase/client";

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
        console.error('Error submitting feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error submitting feedback:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}