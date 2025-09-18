import { supabase } from '@/integrations/supabase/client';
import { SurveyData } from '@/types/survey';

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
        console.error('Error fetching existing survey:', fetchError);
        return null;
      }

      const isCompleted = completedSteps.length === 18; // Total steps
      const now = new Date().toISOString();

      if (existing) {
        // Update existing survey response
        const { data, error } = await supabase
          .from('survey_responses')
          .update({
            survey_data: surveyData,
            completed_steps: completedSteps,
            completed_at: isCompleted ? now : null,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating survey:', error);
          return null;
        }

        return data;
      } else {
        // Create new survey response
        const { data, error } = await supabase
          .from('survey_responses')
          .insert({
            user_id: userId,
            survey_data: surveyData,
            completed_steps: completedSteps,
            completed_at: isCompleted ? now : null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating survey:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Unexpected error saving survey:', error);
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
        console.error('Error fetching survey:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching survey:', error);
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
        console.error('Error checking survey completion:', error);
        return false;
      }

      return data.completed_at !== null;
    } catch (error) {
      console.error('Unexpected error checking survey completion:', error);
      return false;
    }
  }
}
