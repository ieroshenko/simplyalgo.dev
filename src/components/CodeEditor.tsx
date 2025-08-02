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
import { UserAttemptsService } from '@/services/userAttempts';
import { useAuth } from '@/hooks/useAuth';

interface CodeEditorProps {
  initialCode: string;
  testCases: TestCase[];
  problemId: string;
  problemDifficulty?: 'Easy' | 'Medium' | 'Hard';
  onRun: (code: string) => void;
  onSubmit: (code: string) => void;
  onProblemSolved?: (difficulty: 'Easy' | 'Medium' | 'Hard') => void;
}

const CodeEditor = ({ initialCode, testCases, problemId, problemDifficulty, onRun, onSubmit, onProblemSolved }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();

  // Helper function to safely render values (handles objects, arrays, strings, etc.)
  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };
  
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
        testCases: testCases,
        problemId: problemId  // Pass problemId for dynamic Supabase fetching
      });
      
      setTestResults(response.results);
      
      const passedCount = response.results.filter(r => r.passed).length;
      const totalCount = response.results.length;
      
      if (passedCount === totalCount) {
        toast({
          title: "All tests passed! 🎉",
          description: `${passedCount}/${totalCount} test cases passed`,
        });
        
        // Mark problem as solved in database
        if (user?.id) {
          console.log('🎯 Marking problem as solved:', {
            userId: user.id,
            problemId,
            difficulty: problemDifficulty
          });
          
          await UserAttemptsService.markProblemSolved(user.id, problemId, code, response.results);
        }
        
        // Update user stats when problem is solved
        if (onProblemSolved && problemDifficulty) {
          console.log('📊 Updating stats for difficulty:', problemDifficulty);
          onProblemSolved(problemDifficulty);
        }
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
            padding: { top: 16, bottom: 16 },
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
      <div className="h-60 border-t border-border overflow-hidden flex-shrink-0">
        <div className="p-4 bg-secondary/30 h-full flex flex-col">
          <div className="text-sm font-medium text-foreground mb-3">Test Results</div>
          
          {testResults.length === 0 ? (
            <div className="font-mono text-sm text-muted-foreground">
              Click "Run" to test your code...
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    result.passed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {result.passed ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Test Case {index + 1}
                      </span>
                      <Badge 
                        className={`text-xs font-semibold px-3 py-1 ${
                          result.passed 
                            ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600' 
                            : 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600'
                        }`}
                      >
                        {result.passed ? '✅ PASSED' : '❌ FAILED'}
                      </Badge>
                    </div>
                    {result.time && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{result.time}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm font-mono bg-white/50 dark:bg-gray-800/50 p-3 rounded-md">
                    <div className="flex flex-wrap items-start">
                      <span className="font-semibold text-gray-600 dark:text-gray-300 min-w-[70px]">Input:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium ml-2 break-all">{renderValue(result.input)}</span>
                    </div>
                    <div className="flex flex-wrap items-start">
                      <span className="font-semibold text-gray-600 dark:text-gray-300 min-w-[70px]">Expected:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium ml-2 break-all">{renderValue(result.expected)}</span>
                    </div>
                    <div className="flex flex-wrap items-start">
                      <span className="font-semibold text-gray-600 dark:text-gray-300 min-w-[70px]">Actual:</span>
                      <span className={`font-medium ml-2 break-all ${
                        result.passed 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {renderValue(result.actual) || 'No output'}
                      </span>
                    </div>
                    {result.stderr && (
                      <div className="flex flex-wrap items-start">
                        <span className="font-semibold text-gray-600 dark:text-gray-300 min-w-[70px]">Error:</span>
                        <span className="text-red-700 dark:text-red-300 font-medium ml-2 break-all">{result.stderr}</span>
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