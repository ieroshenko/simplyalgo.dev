import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Upload, Settings, Check, X, Clock, Save, CheckIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { TestRunnerService } from '@/services/testRunner';
import { TestCase, TestResult } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';

interface CodeEditorProps {
  initialCode: string;
  testCases: TestCase[];
  problemId: string;
  onRun: (code: string) => void;
  onSubmit: (code: string) => void;
}

const CodeEditor = ({ initialCode, testCases, problemId, onRun, onSubmit }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { saveCode, loadLatestCode, isSaving, lastSaved, hasUnsavedChanges } = useAutoSave(problemId);

  // Load previous code on component mount
  useEffect(() => {
    const loadCode = async () => {
      const savedCode = await loadLatestCode();
      if (savedCode) {
        setCode(savedCode);
      }
    };
    loadCode();
  }, [loadLatestCode]);
  const { toast } = useToast();

  const handleRun = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const response = await TestRunnerService.runCode({
        language: 'python',
        code: code,
        testCases: testCases
      });
      
      setTestResults(response.results);
      
      const passedCount = response.results.filter(r => r.passed).length;
      const totalCount = response.results.length;
      
      if (passedCount === totalCount) {
        toast({
          title: "All tests passed! 🎉",
          description: `${passedCount}/${totalCount} test cases passed`,
        });
      } else {
        toast({
          title: "Some tests failed",
          description: `${passedCount}/${totalCount} test cases passed`,
          variant: "destructive",
        });
      }
      
      onRun(code);
    } catch (error) {
      toast({
        title: "Error running code",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    saveCode(newCode);
  };

  const handleSubmit = () => {
    onSubmit(code);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/50 flex-shrink-0">
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
            onClick={handleRun}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button 
            size="sm"
            onClick={handleSubmit}
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
            padding: { top: 16, bottom: 16, left: 8, right: 8 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 4,
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Test Results */}
      <div className="flex-shrink-0 max-h-80 border-t border-border overflow-hidden">
        <div className="p-4 bg-secondary/30">
          <div className="text-sm font-medium text-foreground mb-3">Test Results</div>
          
          {testResults.length === 0 ? (
            <div className="font-mono text-sm text-muted-foreground">
              Click "Run" to test your code...
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed 
                      ? 'bg-success/10 border-success/20' 
                      : 'bg-destructive/10 border-destructive/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {result.passed ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium">
                        Test Case {index + 1}
                      </span>
                      <Badge variant={result.passed ? "default" : "destructive"} className="text-xs">
                        {result.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>
                    {result.time && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{result.time}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground">Input: </span>
                      <span className="text-foreground">{result.input}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected: </span>
                      <span className="text-foreground">{result.expected}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual: </span>
                      <span className={result.passed ? 'text-success' : 'text-orange-500'}>
                        {result.actual || 'No output'}
                      </span>
                    </div>
                    {result.stderr && (
                      <div>
                        <span className="text-muted-foreground">Error: </span>
                        <span className="text-destructive">{result.stderr}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;