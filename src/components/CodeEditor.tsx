import { Button } from '@/components/ui/button';
import { Play, Upload, Save, CheckIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useEditorTheme, EditorTheme } from '@/hooks/useEditorTheme';
import EditorSettings from '@/components/EditorSettings';
import '@/styles/monaco-theme.css';

interface CodeEditorProps {
  initialCode: string;
  problemId: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
}

const CodeEditor = ({ initialCode, problemId, onCodeChange, onRun, onSubmit, isRunning }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [vimMode, setVimMode] = useState(() => {
    // Load vim mode preference from localStorage
    const saved = localStorage.getItem('editor-vim-mode');
    return saved === 'true';
  });
  const { currentTheme, setCurrentTheme, defineCustomThemes } = useEditorTheme();
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);

  const { saveCode, loadLatestCode, isSaving, lastSaved, hasUnsavedChanges } = useAutoSave(problemId, {
    debounceMs: 3000
  });

  // Load vim extension dynamically
  const loadVimMode = async () => {
    if (typeof window !== 'undefined' && editorRef.current) {
      try {
        // You'll need to install: npm install monaco-vim
        const { initVimMode } = await import('monaco-vim');
        vimModeRef.current = initVimMode(editorRef.current, document.getElementById('vim-statusbar'));
      } catch (error) {
        console.warn('Vim mode not available:', error);
      }
    }
  };

  const handleVimModeToggle = async (enabled: boolean) => {
    setVimMode(enabled);
    // Persist vim mode preference to localStorage
    localStorage.setItem('editor-vim-mode', enabled.toString());
    
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

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
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
              <div className="flex items-center">
                <Save className="w-3 h-3 mr-1 animate-pulse" />
                Saving...
              </div>
            )}
            {!isSaving && lastSaved && (
              <div className="flex items-center">
                <CheckIcon className="w-3 h-3 mr-1 text-success" />
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </div>
            )}
            {hasUnsavedChanges && !isSaving && (
              <div className="text-accent">Unsaved changes</div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <EditorSettings
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            vimMode={vimMode}
            onVimModeChange={handleVimModeToggle}
          />
          <Button variant="outline" size="sm" onClick={onRun} disabled={isRunning}>
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button size="sm" onClick={onSubmit}>
            <Upload className="w-4 h-4 mr-1" />
            Submit
          </Button>
        </div>
      </div>

      {/* Vim Status Bar */}
      {vimMode && (
        <div id="vim-statusbar" className="h-6 px-4 bg-secondary/50 border-b border-border text-xs flex items-center font-mono">
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
            
            // Define custom themes FIRST
            defineCustomThemes(monaco);
            
            // Then set the theme if it's a custom one
            if (currentTheme !== 'light' && currentTheme !== 'vs-dark') {
              monaco.editor.setTheme(currentTheme);
            }
            
            // Configure Python settings
            monaco.languages.setLanguageConfiguration('python', {
              indentationRules: {
                increaseIndentPattern: /^\s*(class|def|if|elif|else|for|while|with|try|except|finally|async def).*:$/,
                decreaseIndentPattern: /^\s*(elif|else|except|finally)\b.*$/
              }
            });

            // Load vim mode if enabled (after editor is fully mounted)
            if (vimMode) {
              setTimeout(() => loadVimMode(), 100);
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
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 4,
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            rulers: [],
            renderIndentGuides: false,
            renderWhitespace: 'none',
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
            autoIndent: 'advanced',
            formatOnPaste: false,
            formatOnType: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
