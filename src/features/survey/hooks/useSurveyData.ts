import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { SurveyService } from '@/features/survey/services/surveyService';
import { SurveyData } from '@/types/survey';

// Cache configuration
const STALE_TIME = 10 * 60 * 1000; // 10 minutes - survey data rarely changes
const GC_TIME = 60 * 60 * 1000; // 60 minutes - keep in memory for long session

// Helper to get localStorage data
function getLocalStorageData(): { surveyData: SurveyData; completedSteps: Set<number> } {
  try {
    const savedData = localStorage.getItem('surveyData');
    const savedCompleted = localStorage.getItem('surveyCompletedSteps');

    return {
      surveyData: savedData ? JSON.parse(savedData) : {},
      completedSteps: savedCompleted ? new Set(JSON.parse(savedCompleted)) : new Set(),
    };
  } catch {
    return { surveyData: {}, completedSteps: new Set() };
  }
}

// Helper to save to localStorage
function saveToLocalStorage(surveyData: SurveyData, completedSteps: Set<number>) {
  localStorage.setItem('surveyData', JSON.stringify(surveyData));
  localStorage.setItem('surveyCompletedSteps', JSON.stringify(Array.from(completedSteps)));
}

// Fetch survey data from database (with localStorage fallback)
async function fetchSurveyData(userId: string | undefined): Promise<{
  surveyData: SurveyData;
  completedSteps: number[];
}> {
  // Always start with localStorage data
  const localData = getLocalStorageData();

  if (!userId) {
    return {
      surveyData: localData.surveyData,
      completedSteps: Array.from(localData.completedSteps),
    };
  }

  try {
    const dbSurvey = await SurveyService.getSurveyData(userId);

    if (dbSurvey) {
      // Use database data if available (it's more authoritative)
      const surveyData = dbSurvey.survey_data || {};
      const completedSteps = dbSurvey.completed_steps || [];

      // Sync to localStorage
      saveToLocalStorage(surveyData, new Set(completedSteps));

      return { surveyData, completedSteps };
    }
  } catch (dbError) {
    console.warn('Database not available, using localStorage data:', dbError);
  }

  return {
    surveyData: localData.surveyData,
    completedSteps: Array.from(localData.completedSteps),
  };
}

export const useSurveyData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for survey data - cached for 10 minutes
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['surveyData', user?.id],
    queryFn: () => fetchSurveyData(user?.id),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    // Use localStorage data as initial data for instant display
    initialData: () => {
      const local = getLocalStorageData();
      return {
        surveyData: local.surveyData,
        completedSteps: Array.from(local.completedSteps),
      };
    },
  });

  const surveyData = useMemo(() => data?.surveyData ?? {}, [data?.surveyData]);
  const completedSteps = useMemo(
    () => new Set(data?.completedSteps ?? []),
    [data?.completedSteps]
  );

  // Mutation to save survey data
  const saveMutation = useMutation({
    mutationFn: async ({
      newSurveyData,
      newCompletedSteps,
    }: {
      newSurveyData: SurveyData;
      newCompletedSteps: Set<number>;
    }) => {
      // Always save to localStorage first
      saveToLocalStorage(newSurveyData, newCompletedSteps);

      // Save to database if user is available
      if (user) {
        const savePromise = SurveyService.saveSurveyData(
          user.id,
          newSurveyData,
          Array.from(newCompletedSteps)
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Save timeout')), 5000)
        );

        await Promise.race([savePromise, timeoutPromise]);
      }

      return {
        surveyData: newSurveyData,
        completedSteps: Array.from(newCompletedSteps),
      };
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(['surveyData', user?.id], newData);
    },
    onError: (error) => {
      console.warn('Database save error:', error);
      // Data is still in localStorage, so we continue
    },
  });

  // Update survey data - with optimistic update
  const updateSurveyData = useCallback(
    async (step: number, answer: string, markCompleted: boolean = false) => {
      const newSurveyData = {
        ...surveyData,
        [step]: answer,
      };

      const newCompletedSteps = new Set(completedSteps);
      if (markCompleted) {
        newCompletedSteps.add(step);
      }

      // Optimistic update: immediately update the cache so navigation works
      queryClient.setQueryData(['surveyData', user?.id], {
        surveyData: newSurveyData,
        completedSteps: Array.from(newCompletedSteps),
      });

      // Save to localStorage immediately
      saveToLocalStorage(newSurveyData, newCompletedSteps);

      // Then trigger the async database save
      saveMutation.mutate({ newSurveyData, newCompletedSteps });
    },
    [surveyData, completedSteps, saveMutation, queryClient, user?.id]
  );

  // Load data function (for manual refresh)
  const loadSurveyData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['surveyData', user?.id] });
  }, [queryClient, user?.id]);

  // Save to localStorage (immediate)
  const saveToLocalStorageCallback = useCallback(
    (newSurveyData: SurveyData, newCompletedSteps: Set<number>) => {
      saveToLocalStorage(newSurveyData, newCompletedSteps);
    },
    []
  );

  // Save to database
  const saveToDatabase = useCallback(async () => {
    if (!user) {
      console.warn('No user available for database save');
      return;
    }

    const localData = getLocalStorageData();
    saveMutation.mutate({
      newSurveyData: localData.surveyData,
      newCompletedSteps: localData.completedSteps,
    });
  }, [user, saveMutation]);

  // Save survey data
  const saveSurveyData = useCallback(
    async (newSurveyData: SurveyData, newCompletedSteps: Set<number>) => {
      saveMutation.mutate({ newSurveyData, newCompletedSteps });
    },
    [saveMutation]
  );

  return {
    surveyData,
    completedSteps,
    isLoading,
    isSaving: saveMutation.isPending,
    updateSurveyData,
    loadSurveyData,
    saveToLocalStorage: saveToLocalStorageCallback,
    saveToDatabase,
    saveSurveyData,
  };
};
