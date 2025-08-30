import { Button } from "@/components/ui/button";
import {
  Play,
  Upload,
  Save,
  CheckIcon,
  Zap,
  Send,
  FileCheck,
  GraduationCap,
  Brain,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEditorTheme, EditorTheme } from "@/hooks/useEditorTheme";
import EditorSettings from "@/components/EditorSettings";
import { toast } from "sonner";
import "@/styles/monaco-theme.css";
import "@/styles/code-highlight.css";

interface CodeEditorProps {
  initialCode: string;
  problemId: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  editorRef?: React.MutableRefObject<any>;
  // Coach Mode props
  onStartCoaching?: () => void;
  onStopCoaching?: () => void;
  isCoachModeActive?: boolean;
  isCoachingLoading?: boolean;
}

const CodeEditor = ({
  initialCode,
  problemId,
  onCodeChange,
  onRun,
  onSubmit,
  isRunning,
  editorRef: externalEditorRef,
  onStartCoaching,
  onStopCoaching,
  isCoachModeActive = false,
  isCoachingLoading = false,
}: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [vimMode, setVimMode] = useState(() => {
    // Load vim mode preference from localStorage
    const saved = localStorage.getItem("editor-vim-mode");
    return saved === "true";
  });
  const { currentTheme, selectedTheme, setCurrentTheme, defineCustomThemes } =
    useEditorTheme();
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);

  const { saveCode, loadLatestCode, isSaving, lastSaved, hasUnsavedChanges } =
    useAutoSave(problemId, {
      debounceMs: 3000,
    });

  // Load vim extension dynamically
  // Add a ref for the status bar element
  const vimStatusbarRef = useRef<HTMLDivElement>(null);

  const loadVimMode = async () => {
    if (typeof window !== "undefined" && editorRef.current) {
      try {
        const { initVimMode } = await import("monaco-vim");
        if (vimStatusbarRef.current) {
          // Dispose existing vim mode if it exists
          if (vimModeRef.current) {
            vimModeRef.current.dispose();
          }
          vimModeRef.current = initVimMode(
            editorRef.current,
            vimStatusbarRef.current,
          );
          console.log("Vim mode initialized successfully");
        }
      } catch (error) {
        console.warn("Vim mode not available:", error);
        toast.error("Failed to load Vim mode");
        setVimMode(false);
        localStorage.setItem("editor-vim-mode", "false");
      }
    }
  };

  const handleVimModeToggle = async (enabled: boolean) => {
    setVimMode(enabled);
    // Persist vim mode preference to localStorage
    localStorage.setItem("editor-vim-mode", enabled.toString());

    if (enabled) {
      await loadVimMode();
    } else if (vimModeRef.current) {
      vimModeRef.current.dispose();
      vimModeRef.current = null;
    }
  };

  // Load previous code on component mount - ONLY ONCE
  useEffect(() => {
    const loadCode = async () => {
      // Wait for user to be available before trying to load saved code
      const savedCode = await loadLatestCode();
      if (savedCode && savedCode.trim() !== initialCode.trim()) {
        setCode(savedCode);
        onCodeChange(savedCode);
      } else {
        setCode(initialCode);
      }
    };

    // Only try to load saved code if we have a user
    if (loadLatestCode) {
      loadCode();
    } else {
      // If no user context yet, just use initial code
      setCode(initialCode);
    }
  }, [problemId, loadLatestCode]); // Add loadLatestCode as dependency

  // Handle theme changes after editor is mounted
  useEffect(() => {
    if (editorRef.current && currentTheme) {
      // Apply theme change to existing editor
      editorRef.current.updateOptions({ theme: currentTheme });
    }
  }, [currentTheme]);

  // Cleanup vim mode on unmount
  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    };
  }, []);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onCodeChange(newCode);
    // Re-enable auto-save with proper debouncing
    saveCode(newCode);
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-0">
      {/* Editor Header */}
      <div className="flex items-center justify-between h-12 px-6 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-foreground">Python</span>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {/* Save status */}
            {isSaving && (
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                <Save className="w-3 h-3 mr-1 animate-pulse" />
                <span className="text-xs font-medium">Saving...</span>
              </div>
            )}
            {!isSaving && lastSaved && (
              <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                <FileCheck className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              </div>
            )}
            {hasUnsavedChanges && !isSaving && (
              <div className="text-accent">Unsaved changes</div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <EditorSettings
            selectedTheme={selectedTheme}
            onThemeChange={setCurrentTheme}
            vimMode={vimMode}
            onVimModeChange={handleVimModeToggle}
          />
          
          {/* Coach Mode Button */}
          {onStartCoaching && onStopCoaching && (
            <Button
              variant={isCoachModeActive ? "default" : "outline"}
              size="sm"
              onClick={isCoachModeActive ? onStopCoaching : onStartCoaching}
              disabled={isCoachingLoading}
              className={isCoachModeActive 
                ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg"
                : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
              }
            >
              {isCoachingLoading ? (
                <>
                  <div className="w-4 h-4 mr-1 border border-current/30 border-t-current rounded-full animate-spin" />
                  Starting...
                </>
              ) : isCoachModeActive ? (
                <>
                  <Brain className="w-4 h-4 mr-1" />
                  Stop Coach
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 mr-1" />
                  Coach Mode
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRun}
            disabled={isRunning}
            className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          >
            <Zap className="w-4 h-4 mr-1" />
            {isRunning ? "Running..." : "Submit"}
          </Button>
          {/* <Button 
            size="sm" 
            onClick={onSubmit}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
          >
            <Send className="w-4 h-4 mr-1" />
            Submit
          </Button> */}
        </div>
      </div>

      {/* Vim Status Bar */}
      {vimMode && (
        <div
          ref={vimStatusbarRef}
          className="h-6 px-4 bg-secondary/50 border-b border-border text-xs flex items-center font-mono"
        >
          -- INSERT --
        </div>
      )}

      {/* Code Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={handleCodeChange}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            if (externalEditorRef) {
              externalEditorRef.current = editor;
            }

            // Define custom themes FIRST
            defineCustomThemes(monaco);

            // Then set the theme if it's a custom one
            if (currentTheme !== "light" && currentTheme !== "vs-dark") {
              monaco.editor.setTheme(currentTheme);
            }

            // Configure Python settings
            monaco.languages.setLanguageConfiguration("python", {
              indentationRules: {
                increaseIndentPattern:
                  /^\s*(class|def|if|elif|else|for|while|with|try|except|finally|async def).*:$/,
                decreaseIndentPattern: /^\s*(elif|else|except|finally)\b.*$/,
              },
            });

            // Load vim mode if enabled (after editor is fully mounted)
            if (vimMode) {
              // Give editor more time to fully initialize
              setTimeout(() => loadVimMode(), 500);
            }
          }}
          theme={currentTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            lineHeight: 1.5,
            padding: { top: 16, bottom: 16, left: 12, right: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "on",
            lineNumbers: "on",
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 4,
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            rulers: [],
            renderIndentGuides: false,
            renderWhitespace: "none",
            guides: {
              bracketPairs: false,
              bracketPairsHorizontal: false,
              highlightActiveBracketPair: false,
              indentation: false,
              highlightActiveIndentation: false,
            },
            bracketPairColorization: {
              enabled: false,
            },
            showUnused: false,
            occurrencesHighlight: false,
            selectionHighlight: false,
            // Basic editing functionality - keep these minimal
            autoIndent: "advanced",
            formatOnPaste: false,
            formatOnType: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
