import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Save, FileCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { debounce } from "lodash";
import {
  NotesData,
  SupabaseQueryResult,
} from "@/types/supabase-common";

interface NotesProps {
  problemId: string;
}

export interface NotesHandle {
  loadNotes: () => Promise<void>;
}

interface CachedNotes {
  content: string;
  lastSaved: string;
  timestamp: number;
  version: number;
}

const Notes = forwardRef<NotesHandle, NotesProps>(({ problemId }, ref) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Start as false since we load from cache first
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);
  const { user } = useAuth();

  // Cache management functions
  const getCacheKey = useCallback(() => {
    return `notes_${user?.id}_${problemId}`;
  }, [user?.id, problemId]);

  const loadFromCache = useCallback((): CachedNotes | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn("Failed to load notes from cache:", error);
      return null;
    }
  }, [getCacheKey]);

  const saveToCache = useCallback((notes: CachedNotes) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(notes));
    } catch (error) {
      console.warn("Failed to save notes to cache:", error);
    }
  }, [getCacheKey]);

  const loadNotes = useCallback(async () => {
    if (!user || !problemId) return;

    // 1. Load from cache immediately for instant display
    const cached = loadFromCache();
    if (cached) {
      setContent(cached.content);
      setLastSaved(new Date(cached.lastSaved));
      setHasUnsavedChanges(false);
      console.log("📝 Loaded notes from cache");
    }

    // 2. Check if we need to sync from server
    const shouldSync = !cached || 
      (Date.now() - cached.timestamp > 5 * 60 * 1000) || // 5 minutes old
      cached.version === 0; // First time or corrupted cache

    if (!shouldSync) {
      console.log("📝 Using cached notes, skipping server sync");
      return;
    }

    // 3. Background sync from Supabase
    setIsBackgroundSync(true);
    if (!cached) {
      setIsLoading(true); // Only show loading if no cache
    }

    try {
      const { data, error } = (await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("problem_id", problemId)
        .maybeSingle()) as SupabaseQueryResult<NotesData>;

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const serverLastSaved = new Date(data.updated_at || data.created_at);
        const cachedLastSaved = cached ? new Date(cached.lastSaved) : null;

        // Only update if server version is newer
        if (!cachedLastSaved || serverLastSaved > cachedLastSaved) {
          const newContent = data.content || "";
          setContent(newContent);
          setLastSaved(serverLastSaved);
          setHasUnsavedChanges(false);

          // Update cache with server data
          saveToCache({
            content: newContent,
            lastSaved: serverLastSaved.toISOString(),
            timestamp: Date.now(),
            version: (cached?.version || 0) + 1
          });

          console.log("📝 Synced newer notes from server");
        } else {
          console.log("📝 Cache is up-to-date, no sync needed");
        }
      } else if (!cached) {
        // No server data and no cache - initialize empty
        const emptyNotes = {
          content: "",
          lastSaved: new Date().toISOString(),
          timestamp: Date.now(),
          version: 1
        };
        saveToCache(emptyNotes);
        console.log("📝 No notes found, initialized empty");
      }
    } catch (error) {
      console.error("Error syncing notes:", error);
      if (!cached) {
        toast.error("Failed to load notes");
      } else {
        console.log("📝 Using cached notes due to sync error");
      }
    } finally {
      setIsLoading(false);
      setIsBackgroundSync(false);
    }
  }, [user, problemId, loadFromCache, saveToCache]);

  const characterCount = content.length;
  const wordCount =
    content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const maxCharacters = 5000;


  useImperativeHandle(ref, () => ({
    loadNotes,
  }));

  const saveNotes = useCallback(
    async (noteContent: string) => {
      if (!user || !problemId) return;

      // Update cache immediately for instant feedback
      const now = new Date();
      const cached = loadFromCache();
      saveToCache({
        content: noteContent,
        lastSaved: now.toISOString(),
        timestamp: Date.now(),
        version: (cached?.version || 0) + 1
      });

      setIsSaving(true);
      try {
        const { error } = (await supabase.from("notes").upsert(
          {
            user_id: user.id,
            problem_id: problemId,
            content: noteContent,
            updated_at: now.toISOString(),
          },
          {
            onConflict: "user_id, problem_id",
          },
        )) as Pick<SupabaseQueryResult<unknown>, "error">;

        if (error) throw error;

        setLastSaved(now);
        setHasUnsavedChanges(false);
        console.log("Notes saved successfully");
      } catch (error) {
        console.error("Error saving notes:", error);
        toast.error("Failed to save notes");
        
        // Revert optimistic update on error
        const revertedCache = loadFromCache();
        if (revertedCache && revertedCache.content !== noteContent) {
          setContent(revertedCache.content);
          setLastSaved(new Date(revertedCache.lastSaved));
        }
      } finally {
        setIsSaving(false);
      }
    },
    [user, problemId, loadFromCache, saveToCache],
  );

  const debouncedSave = useCallback(
    debounce((noteContent: string) => {
      if (noteContent.trim() !== "") {
        saveNotes(noteContent);
      }
    }, 2000),
    [saveNotes],
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxCharacters) {
      setContent(newContent);
      setHasUnsavedChanges(true);
      
      // Update local cache immediately for persistence across tab switches
      const cached = loadFromCache();
      saveToCache({
        content: newContent,
        lastSaved: cached?.lastSaved || new Date().toISOString(),
        timestamp: Date.now(),
        version: (cached?.version || 0) + 1
      });
      
      debouncedSave(newContent);
    }
  };

  const handleSave = async () => {
    await saveNotes(content);
    toast.success("Notes saved!");
  };

  const handleClear = async () => {
    if (content.trim() === "") return;

    if (
      window.confirm(
        "Are you sure you want to clear all notes? This action cannot be undone.",
      )
    ) {
      setContent("");
      setHasUnsavedChanges(true);
      await saveNotes("");
      toast.success("Notes cleared");
    }
  };

  // Initialize notes on mount or when user/problemId changes
  useEffect(() => {
    loadNotes();
  }, [user?.id, problemId]); // Don't depend on loadNotes to avoid unnecessary re-runs

  useEffect(() => {
    return () => {
      debouncedSave.flush();
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>

      <div className="bg-muted/50 rounded-lg p-4 flex-1 overflow-auto min-h-[200px]">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm placeholder-muted-foreground min-h-[160px]"
          placeholder="Start writing your notes..."
        />
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-4">
          <div className="text-xs text-muted-foreground">
            {characterCount} / {maxCharacters} characters • {wordCount} words
          </div>

          {isSaving && (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <Save className="w-3 h-3 mr-1 animate-pulse" />
              <span className="text-xs font-medium">Saving...</span>
            </div>
          )}
          {!isSaving && lastSaved && !hasUnsavedChanges && (
            <div className="flex items-center text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-3 h-3 mr-1" />
              <span className="text-xs font-medium">
                Saved {lastSaved.toLocaleTimeString()}
                {isBackgroundSync && " • Syncing..."}
              </span>
            </div>
          )}
          {hasUnsavedChanges && !isSaving && (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Unsaved changes
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={content.trim() === ""}
            className="text-xs hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/20"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
});

export default Notes;
