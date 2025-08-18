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

const Notes = forwardRef<NotesHandle, NotesProps>(({ problemId }, ref) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user } = useAuth();

  const characterCount = content.length;
  const wordCount =
    content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const maxCharacters = 5000;

  const loadNotes = useCallback(async () => {
    if (!user || !problemId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = (await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("problem_id", problemId)
        .single()) as SupabaseQueryResult<NotesData>;

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setContent(data.content || "");
        setLastSaved(new Date(data.updated_at));
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [user, problemId]);

  useImperativeHandle(ref, () => ({
    loadNotes,
  }));

  const saveNotes = useCallback(
    async (noteContent: string) => {
      if (!user || !problemId) return;

      setIsSaving(true);
      try {
        const { error } = (await supabase.from("notes").upsert(
          {
            user_id: user.id,
            problem_id: problemId,
            content: noteContent,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id, problem_id",
          },
        )) as Pick<SupabaseQueryResult<unknown>, "error">;

        if (error) throw error;

        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log("Notes saved successfully");
      } catch (error) {
        console.error("Error saving notes:", error);
        toast.error("Failed to save notes");
      } finally {
        setIsSaving(false);
      }
    },
    [user, problemId],
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

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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

      <div className="bg-muted/50 rounded-lg p-4 flex-1 min-h-[400px] flex">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm flex-1 placeholder-muted-foreground"
          placeholder="Start writing your notes...

# Heading
**Bold text**
*Italic text*
`code`
- List item
[Link](url)"
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
