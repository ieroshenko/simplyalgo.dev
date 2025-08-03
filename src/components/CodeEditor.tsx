import { Button } from '@/components/ui/button';
import { Play, Upload, Save, CheckIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAutoSave } from '@/hooks/useAutoSave';
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
  const { saveCode, loadLatestCode, isSaving, lastSaved, hasUnsavedChanges } = useAutoSave(problemId);

  // Load previous code on component mount
  useEffect(() => {
    const loadCode = async () => {
      const savedCode = await loadLatestCode();
      if (savedCode) {
        setCode(savedCode);
        onCodeChange(savedCode);
      }
    };
    loadCode();
  }, [loadLatestCode, onCodeChange]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange(newCode);
    saveCode(newCode);
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-0">
      {/* Editor Header */}
      <div className="flex items-center justify-between h-12 px-6 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-foreground">Python</span>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRun}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button 
            size="sm"
            onClick={onSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Upload className="w-4 h-4 mr-1" />
            Submit
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={handleCodeChange}
          onMount={(editor, monaco) => {
            // Configure Python-specific settings
            monaco.languages.setLanguageConfiguration('python', {
              indentationRules: {
                increaseIndentPattern: /^\s*(class|def|if|elif|else|for|while|with|try|except|finally|async def).*:$/,
                decreaseIndentPattern: /^\s*(elif|else|except|finally)\b.*$/
              }
            });

            editor.updateOptions({
              autoIndent: 'full',
              formatOnPaste: true,
              formatOnType: true,
            });
          }}
          theme="light"
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
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;