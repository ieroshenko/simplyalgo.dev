import { useState, useEffect, useCallback, useRef } from "react";
import { UserAttemptsService } from "@/services/userAttempts";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
}

export const useAutoSave = (
  problemId: string,
  options: UseAutoSaveOptions = {},
) => {
  const { user } = useAuth();
  const { debounceMs = 2000, onSaveSuccess, onSaveError } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const saveCode = useCallback(
    async (code: string) => {
      if (!user?.id || !problemId) {
        return;
      }

      setIsSaving(true);
      setHasUnsavedChanges(false);

      try {
        const result = await UserAttemptsService.saveDraft(
          user.id,
          problemId,
          code,
        );
        setLastSaved(new Date());
        onSaveSuccess?.();
      } catch (error) {
        logger.error("[useAutoSave] Auto-save failed:", error);
        setHasUnsavedChanges(true);
        onSaveError?.("Failed to save changes");
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, problemId, onSaveSuccess, onSaveError],
  );

  const debouncedSave = useCallback(
    (code: string) => {
      // Don't try to save if user is not available yet
      if (!user?.id) {
        return;
      }
      setHasUnsavedChanges(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => saveCode(code), debounceMs);
    },
    [saveCode, debounceMs, user?.id],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const loadLatestCode = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !problemId) {
      return null;
    }

    try {
      const attempt = await UserAttemptsService.getLatestAttempt(
        user.id,
        problemId,
      );
      return attempt?.code || null;
    } catch (error) {
      logger.error("[useAutoSave] Failed to load latest code:", error);
      return null;
    }
  }, [user?.id, problemId]);

  return {
    saveCode: debouncedSave,
    loadLatestCode,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
  };
};
