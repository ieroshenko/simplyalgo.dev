import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from "@/integrations/supabase/types";
import { SurveyData } from '@/types/survey';
import { logger } from '@/utils/logger';

// Proper type definition for survey response from database
type SurveyResponseRow = Database['public']['Tables']['survey_responses']['Row'];

export interface SurveyResponse {
  id: string;
  user_id: string;
  survey_data: SurveyData;
  completed_steps: number[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SurveyService {
  /**
   * Transform database row to SurveyResponse interface
   */
  private static transformSurveyData(row: SurveyResponseRow): SurveyResponse {
    return {
      id: row.id,
      user_id: row.user_id,
      survey_data: row.survey_data as SurveyData, // Safe cast since we control the data structure
      completed_steps: row.completed_steps || [],
      completed_at: row.completed_at,
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
    };
  }

  /**
   * Save survey data to the database
   */
  static async saveSurveyData(
    userId: string,
    surveyData: SurveyData,
    completedSteps: number[]
  ): Promise<SurveyResponse | null> {
    try {
      // First, try to get existing survey response
      const { data: existing, error: fetchError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('[SurveyService] Error fetching existing survey', { userId, error: fetchError });
        return null;
      }

      const isCompleted = completedSteps.length === 18; // Total steps
      const now = new Date().toISOString();

      if (existing) {
        // Update existing survey response
        const { data, error } = await supabase
          .from('survey_responses')
          .update({
            survey_data: surveyData as Json, // Cast to Json type
            completed_steps: completedSteps,
            completed_at: isCompleted ? now : null,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          logger.error('[SurveyService] Error updating survey', { userId, surveyId: existing.id, error });
          return null;
        }

        return this.transformSurveyData(data as SurveyResponseRow);
      } else {
        // Create new survey response
        const { data, error } = await supabase
          .from('survey_responses')
          .insert({
            user_id: userId,
            survey_data: surveyData as Json, // Cast to Json type
            completed_steps: completedSteps,
            completed_at: isCompleted ? now : null,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (error) {
          logger.error('[SurveyService] Error creating survey', { userId, error });
          return null;
        }

        return this.transformSurveyData(data as SurveyResponseRow);
      }
    } catch (error) {
      logger.error('[SurveyService] Unexpected error saving survey', { userId, error });
      return null;
    }
  }

  /**
   * Get survey data for a user
   */
  static async getSurveyData(userId: string): Promise<SurveyResponse | null> {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No survey found
          return null;
        }
        logger.error('[SurveyService] Error fetching survey', { userId, error });
        return null;
      }

      return data as SurveyResponse;
    } catch (error) {
      logger.error('[SurveyService] Unexpected error fetching survey', { userId, error });
      return null;
    }
  }

  /**
   * Check if user has completed the survey
   */
  static async isSurveyCompleted(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('completed_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No survey found
        }
        logger.error('[SurveyService] Error checking survey completion', { userId, error });
        return false;
      }

      return data.completed_at !== null;
    } catch (error) {
      logger.error('[SurveyService] Unexpected error checking survey completion', { userId, error });
      return false;
    }
  }
}
