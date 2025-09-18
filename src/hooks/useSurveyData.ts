import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { SurveyService } from '@/services/surveyService';
import { SurveyData } from '@/types/survey';

export const useSurveyData = () => {
  const { user } = useAuth();
  const [surveyData, setSurveyData] = useState<SurveyData>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load survey data from database and localStorage
  const loadSurveyData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Always load from localStorage first (fastest)
      const savedData = localStorage.getItem('surveyData');
      const savedCompleted = localStorage.getItem('surveyCompletedSteps');
      
      if (savedData) {
        setSurveyData(JSON.parse(savedData));
      }
      
      if (savedCompleted) {
        setCompletedSteps(new Set(JSON.parse(savedCompleted)));
      }
      
      // If user is logged in, try to load from database as well
      if (user) {
        try {
          const dbSurvey = await SurveyService.getSurveyData(user.id);
          
          if (dbSurvey) {
            // Use database data if available (it's more authoritative)
            setSurveyData(dbSurvey.survey_data || {});
            setCompletedSteps(new Set(dbSurvey.completed_steps || []));
            // update localStorage
            saveToLocalStorage(dbSurvey.survey_data || {}, new Set(dbSurvey.completed_steps || []));
          }
        } catch (dbError) {
          console.warn('Database not available, using localStorage data:', dbError);
          // Continue with localStorage data
        }
      }
      
    } catch (error) {
      console.error('Error loading survey data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save to localStorage only (immediate)
  const saveToLocalStorage = useCallback((
    newSurveyData: SurveyData,
    newCompletedSteps: Set<number>
  ) => {
    localStorage.setItem('surveyData', JSON.stringify(newSurveyData));
    localStorage.setItem('surveyCompletedSteps', JSON.stringify(Array.from(newCompletedSteps)));
  }, []);

  // Save to database only (async) - reads from localStorage
  const saveToDatabase = useCallback(async () => {
    if (!user) {
      console.warn('No user available for database save');
      return;
    }

    try {
      // Read data from localStorage
      const savedData = localStorage.getItem('surveyData');
      const savedCompleted = localStorage.getItem('surveyCompletedSteps');
      
      if (!savedData || !savedCompleted) {
        console.warn('No survey data found in localStorage');
        return;
      }

      const surveyData: SurveyData = JSON.parse(savedData);
      const completedSteps = new Set(JSON.parse(savedCompleted) as number[]);

      setIsSaving(true);
      
      // Add timeout to prevent infinite saving state
      const savePromise = SurveyService.saveSurveyData(
        user.id,
        surveyData,
        Array.from(completedSteps)
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout')), 5000)
      );
      
      const result = await Promise.race([savePromise, timeoutPromise]);
      
      if (!result) {
        console.warn('Database save failed');
        throw new Error('Database save failed');
      }
      
      return result;
      
    } catch (error) {
      console.warn('Database save error:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Save survey data to both database and localStorage
  const saveSurveyData = useCallback(async (
    newSurveyData: SurveyData,
    newCompletedSteps: Set<number>
  ) => {
    // Always save to localStorage first for immediate persistence
    saveToLocalStorage(newSurveyData, newCompletedSteps);
    
    // if (!user) {
    //   // If no user, just use localStorage
    //   return;
    // }

    // try {
    //   await saveToDatabase();
    // } catch (error) {
    //   console.warn('Database not available, using localStorage only:', error);
    //   // Don't throw error, just log it and continue with localStorage
    // }
  }, [user, saveToLocalStorage, saveToDatabase]);

  // Update survey data
  const updateSurveyData = useCallback(async (
    step: number,
    answer: string,
    markCompleted: boolean = false
  ) => {
    const newSurveyData = {
      ...surveyData,
      [step]: answer
    };
    
    const newCompletedSteps = new Set(completedSteps);
    if (markCompleted) {
      newCompletedSteps.add(step);
    }
    
    setSurveyData(newSurveyData);
    setCompletedSteps(newCompletedSteps);
    
    // Save to database and localStorage
    await saveSurveyData(newSurveyData, newCompletedSteps);
  }, [surveyData, completedSteps, saveSurveyData]);

  // Load data on mount
  useEffect(() => {
    loadSurveyData();
  }, [loadSurveyData]);

  return {
    surveyData,
    completedSteps,
    isLoading,
    isSaving,
    updateSurveyData,
    loadSurveyData,
    saveToLocalStorage,
    saveToDatabase,
    saveSurveyData,
  };
};
