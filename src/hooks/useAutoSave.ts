import { useState, useEffect, useCallback } from 'react';
import { UserAttemptsService } from '@/services/userAttempts';
import { useAuth } from '@/hooks/useAuth';

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
}

export const useAutoSave = (
  problemId: string,
  options: UseAutoSaveOptions = {}
) => {
  const { user } = useAuth();
  const { debounceMs = 2000, onSaveSuccess, onSaveError } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveCode = useCallback(async (code: string) => {
    if (!user?.id || !problemId) {
      console.log('Cannot save - missing user ID or problem ID:', { userId: user?.id, problemId });
      return;
    }

    console.log('Starting save process for:', { userId: user.id, problemId, codeLength: code.length });
    setIsSaving(true);
    setHasUnsavedChanges(false);

    try {
      const result = await UserAttemptsService.saveDraft(user.id, problemId, code);
      console.log('Save successful:', result);
      setLastSaved(new Date());
      onSaveSuccess?.();
    } catch (error) {
      console.error('Auto-save failed:', error);
      setHasUnsavedChanges(true);
      onSaveError?.('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, problemId, onSaveSuccess, onSaveError]);

  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (code: string) => {
        // Don't try to save if user is not available yet
        if (!user?.id) {
          console.log('Skipping save - user not loaded yet');
          return;
        }
        setHasUnsavedChanges(true);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => saveCode(code), debounceMs);
      };
    })(),
    [saveCode, debounceMs, user?.id]
  );

  const loadLatestCode = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !problemId) {
      console.log('Cannot load - missing user ID or problem ID:', { userId: user?.id, problemId });
      return null;
    }

    try {
      console.log('Loading latest code for:', { userId: user.id, problemId });
      const attempt = await UserAttemptsService.getLatestAttempt(user.id, problemId);
      console.log('Loaded attempt:', attempt);
      return attempt?.code || null;
    } catch (error) {
      console.error('Failed to load latest code:', error);
      return null;
    }
  }, [user?.id, problemId]);

  return {
    saveCode: debouncedSave,
    loadLatestCode,
    isSaving,
    lastSaved,
    hasUnsavedChanges
  };
};