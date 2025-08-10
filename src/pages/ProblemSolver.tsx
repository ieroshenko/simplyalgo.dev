import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import CodeEditor from '@/components/CodeEditor';
import AIChat from '@/components/AIChat';
import Notes from '@/components/Notes';
import { ArrowLeft, Star, StarOff, Copy, Check, X, Clock, Calendar } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import safeStableStringify from 'safe-stable-stringify';
import { useTheme } from '@/hooks/useTheme';
import { pythonSolutions, Solution } from '@/data/pythonSolutions';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserStats } from '@/hooks/useUserStats';
import { useSubmissions } from '@/hooks/useSubmissions';
import { UserAttemptsService } from '@/services/userAttempts';
import { TestRunnerService } from '@/services/testRunner';
import { TestCase, TestResult, CodeSnippet } from '@/types';
import { useState, useEffect, useRef, useMemo } from 'react';
import { insertCodeSnippet } from '@/utils/codeInsertion';
import Timer from '@/components/Timer';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

const ProblemSolver = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { problems, toggleStar, loading, error, refetch } = useProblems(user?.id);
  const { updateStatsOnProblemSolved } = useUserStats(user?.id);
  const { submissions, loading: submissionsLoading, refetch: refetchSubmissions } = useSubmissions(user?.id, problemId);
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('question');
  
  
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const codeEditorRef = useRef<{
    getValue: () => string;
    setValue: (value: string) => void;
    getPosition: () => any;
    setPosition: (position: any) => void;
    focus: () => void;
    deltaDecorations: (oldDecorations: string[], newDecorations: any[]) => string[];
  } | null>(null);
  
  // Panel visibility state
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    const saved = localStorage.getItem('showLeftPanel');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showBottomPanel, setShowBottomPanel] = useState(() => {
    const saved = localStorage.getItem('showBottomPanel');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showRightPanel, setShowRightPanel] = useState(() => {
    const saved = localStorage.getItem('showRightPanel');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Panel toggle functions
  const toggleLeftPanel = () => {
    const newValue = !showLeftPanel;
    setShowLeftPanel(newValue);
    localStorage.setItem('showLeftPanel', JSON.stringify(newValue));
  };

  // Compact JSON formatter for single-line array/object display with circular reference protection
  const toCompactJson = (value: any): string => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { 
          const parsed = JSON.parse(trimmed);
          const result = safeStableStringify(parsed);
          return result;
        } catch { 
          return trimmed; 
        }
      }
      return JSON.stringify(value);
    }
    try {
      const result = safeStableStringify(value);
      return result;
    } catch {
      try { 
        return JSON.stringify(value); 
      } catch { 
        return String(value); 
      }
    }
  };

  const toggleBottomPanel = () => {
    const newValue = !showBottomPanel;
    setShowBottomPanel(newValue);
    localStorage.setItem('showBottomPanel', JSON.stringify(newValue));
  };

  const toggleRightPanel = () => {
    const newValue = !showRightPanel;
    setShowRightPanel(newValue);
    localStorage.setItem('showRightPanel', JSON.stringify(newValue));
  };

  // Keyboard shortcuts - moved to top with other hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Ctrl is pressed and prevent default browser behavior
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            toggleLeftPanel();
            break;
          case 'j':
            e.preventDefault();
            toggleBottomPanel();
            break;
          case 'l':
            e.preventDefault();
            toggleRightPanel();
            break;
          default:
            break;
        }
      }
    };

    // Add global event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleLeftPanel, toggleBottomPanel, toggleRightPanel]);
  
  const problem = problems.find(p => p.id === problemId);

  // Deduplicate submissions by code content, keeping the most recent for each unique solution
  const uniqueSubmissions = useMemo(() => {
    const sorted = [...(submissions || [])].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const byCode = new Map<string, NonNullable<typeof submissions>[number]>();
    for (const s of sorted) {
      const key = s.code.trim();
      if (!byCode.has(key)) byCode.set(key, s);
    }
    return Array.from(byCode.values());
  }, [submissions]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!problem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Problem not found</h1>
          <Button onClick={() => navigate('/leetcode')}>Back to Problems</Button>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-success text-success-foreground';
      case 'Medium': return 'bg-accent text-accent-foreground';
      case 'Hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleInsertCodeSnippet = async (snippet: CodeSnippet) => {
    console.log('🔧 Inserting code snippet:', snippet);
    
    if (!codeEditorRef.current) {
      console.error('❌ Code editor ref is not available');
      toast.error('Code editor not ready');
      return;
    }

    try {
      const editor = codeEditorRef.current;
      const currentCode = editor.getValue(); // Get live code from Monaco
      const position = editor.getPosition();
      
      const cursorPosition = {
        line: position?.lineNumber ? position.lineNumber - 1 : 0,
        column: position?.column || 0
      };
      
      console.log('📍 Current state:', {
        cursorPosition,
        currentCodeLength: currentCode.length,
        snippetType: snippet.insertionHint?.type
      });

      // Try backend GPT-assisted insertion first
      let newCodeFromBackend: string | null = null;
      let insertedAtLine: number | undefined;
      try {
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            action: 'insert_snippet',
            code: currentCode,
            snippet,
            cursorPosition,
            problemDescription: problem.description,
            // Minimal message/context to satisfy backend shape
            message: '[snippet insertion request]',
            conversationHistory: []
          }
        });
        if (error) throw error;
        if (data && typeof data.newCode === 'string') {
          newCodeFromBackend = data.newCode;
          insertedAtLine = typeof data.insertedAtLine === 'number' ? data.insertedAtLine : undefined;
          console.log('🧠 Backend insertion result:', { insertedAtLine });
        }
      } catch (e) {
        console.warn('Backend insert_snippet failed, falling back to local:', e);
      }

      // Fallback to local insertion if backend failed or did not change code
      const result = newCodeFromBackend
        ? {
            newCode: newCodeFromBackend,
            newCursorPosition: {
              line: typeof insertedAtLine === 'number' && insertedAtLine >= 0
                ? insertedAtLine + (snippet.code.split('\n').length - 1)
                : cursorPosition.line,
              column: 0
            }
          }
        : insertCodeSnippet(currentCode, snippet, cursorPosition);
      console.log('✨ Insertion result:', result);
      
      // Use Monaco's setValue to update the editor directly
      editor.setValue(result.newCode);
      
      // Update our React state to stay in sync
      setCode(result.newCode);
      
      // Set cursor position after a brief delay
      setTimeout(() => {
        const newPosition = {
          lineNumber: result.newCursorPosition.line + 1,
          column: result.newCursorPosition.column + 1
        };
        
        editor.setPosition(newPosition);
        editor.focus();
        
        // Add temporary highlight
        const decorations = editor.deltaDecorations([], [{
          range: new (window as any).monaco.Range(
            Math.max(1, result.newCursorPosition.line - snippet.code.split('\n').length + 2),
            1,
            result.newCursorPosition.line + 1,
            result.newCursorPosition.column + 1
          ),
          options: {
            className: 'inserted-code-highlight'
          }
        }]);
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
          editor.deltaDecorations(decorations, []);
        }, 2000);
        
        console.log('✅ Code insertion completed with highlighting');
      }, 50);

      toast.success('Code snippet inserted successfully!');
    } catch (error) {
      console.error('❌ Failed to insert code snippet:', error);
      toast.error('Failed to insert code snippet');
    }
  };

  const handleRun = async () => {
    if (!user?.id) return;
    setIsRunning(true);
    setTestResults([]);

    try {
      await UserAttemptsService.saveDraft(user.id, problem.id, code);
      const response = await TestRunnerService.runCode({
        language: 'python',
        code: code,
        testCases: problem.testCases,
        problemId: problem.id
      });
      setTestResults(response.results);

      const passedCount = response.results.filter(r => r.passed).length;
      const totalCount = response.results.length;

      if (passedCount === totalCount) {
        toast.success('All tests passed! 🎉');
        await UserAttemptsService.markProblemSolved(user.id, problem.id, code, response.results);
        await handleProblemSolved(problem.difficulty as 'Easy' | 'Medium' | 'Hard');
        // Refetch submissions to show the new accepted solution
        await refetchSubmissions();
      } else {
        toast.error(`${passedCount}/${totalCount} test cases passed`);
      }
    } catch (error) {
      toast.error('Failed to run code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    
    try {
      await UserAttemptsService.submitCode(user.id, problem.id, code);
      toast.success('Solution submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit solution');
    }
  };

  const handleToggleStar = async () => {
    if (!user?.id) return;
    
    try {
      await toggleStar(problem.id);
      toast.success(problem.isStarred ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleProblemSolved = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    if (!problemId) return;
    await updateStatsOnProblemSolved(difficulty, problemId);
    refetch();
  };


  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    // Handle arrays and objects directly for pretty printing
    if (Array.isArray(value)) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    
    if (typeof value === 'string') {
      // Try to pretty-print if it's JSON-like
      const trimmed = value.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))){
        try { 
          const parsed = JSON.parse(trimmed);
          return JSON.stringify(parsed, null, 2); 
        } catch { 
          return value; 
        }
      }
      return value;
    }
    
    return String(value);
  };

  // Human-friendly formatter (not strict JSON):
  // - Strings are shown without quotes
  // - Arrays render as [ a, b ] or multi-line for nested arrays
  // - Objects render as { key: value }
  const toHumanReadable = (value: any, indent = 0): string => {
    const pad = (n: number) => ' '.repeat(n);

    // If value is a JSON-like string, parse then format recursively
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const looksJson =
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed === 'null' || trimmed === 'true' || trimmed === 'false');
      if (looksJson) {
        try {
          const parsed = JSON.parse(trimmed);
          return toHumanReadable(parsed, indent);
        } catch {
          // fall through to scalar formatting
        }
      }
    }

    const needsQuotes = (s: string): boolean => {
      return s === '' || /[\s,[\]{}:]/.test(s);
    };

    const formatScalar = (v: any): string => {
      if (v === null || v === undefined) return 'null';
      const t = typeof v;
      if (t === 'number' || t === 'boolean') return String(v);
      if (t === 'string') return needsQuotes(v) ? `"${v}"` : v;
      return String(v);
    };

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      const complex = value.some((el) => Array.isArray(el) || (el && typeof el === 'object'));
      if (complex) {
        const inner = value
          .map((el) => `${pad(indent + 2)}${toHumanReadable(el, indent + 2)}`)
          .join(',\n');
        return `[\n${inner}\n${pad(indent)}]`;
      }
      const inner = value.map((el) => formatScalar(el)).join(', ');
      return `[ ${inner} ]`;
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      if (keys.length === 0) return '{}';
      const lines = keys.map((k) => `${pad(indent + 2)}${k}: ${toHumanReadable((value as any)[k], indent + 2)}`);
      return `{\n${lines.join('\n')}\n${pad(indent)}}`;
    }

    return formatScalar(value);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/leetcode')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-foreground">{problem.title}</h1>
              <Badge className={getDifficultyColor(problem.difficulty)}>
                {problem.difficulty}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {problem.category}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Timer />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleStar}
              className="text-muted-foreground hover:text-foreground"
            >
              {problem.isStarred ? (
                <Star className="w-4 h-4 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left Panel - Problem Description */}
        {showLeftPanel && (
          <>
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full min-h-0 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                  <div className="border-b border-border">
                    <TabsList className="grid w-full grid-cols-4 bg-transparent h-12 px-6">
                      <TabsTrigger value="question" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                        Question
                      </TabsTrigger>
                      <TabsTrigger value="solution" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                        Solution
                      </TabsTrigger>
                      <TabsTrigger value="submissions" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                        Submissions
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                        Notes
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <TabsContent value="question" className="flex-1 min-h-0 p-0 m-0">
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Problem Description</h2>
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          <p>{problem.description}</p>
                        </div>
                        </div>

                        {problem.examples && problem.examples.length > 0 && (
                          <div className="p-6 pt-0">
                            <h3 className="text-md font-semibold text-foreground mb-3">Examples</h3>
                            <div className="space-y-4">
                              {problem.examples.map((example, index) => (
                                <div key={index} className="bg-muted/50 p-4 rounded-lg">
                                  <div className="space-y-2 font-mono text-sm">
                                    <div>
                                      <span className="font-semibold">Input:</span> {example.input}
                                    </div>
                                    <div>
                                      <span className="font-semibold">Output:</span> {example.output}
                                    </div>
                                    {example.explanation && (
                                      <div>
                                        <span className="font-semibold">Explanation:</span> {example.explanation}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="solution" className="flex-1 min-h-0 p-0 m-0 overflow-y-auto">
                        <div className="p-6 space-y-6">
                          {problemId && pythonSolutions[problemId] ? (
                            <div className="space-y-6">
                              {pythonSolutions[problemId].map((solution: Solution, index: number) => (
                                <div key={index}>
                                  <h2 className="text-lg font-semibold text-foreground mb-4">
                                    {index + 1}. {solution.title}
                                  </h2>
                                  <div className="bg-muted rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex space-x-2">
                                        <Button variant="default" size="sm">Python</Button>
                                      </div>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(solution.code);
                                          toast.success('Code copied to clipboard!');
                                        }}
                                      >
                                        <Copy className="w-4 h-4 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                    
                                    <div className="bg-muted/30 rounded-lg overflow-hidden">
                                      <SyntaxHighlighter
                                        language="python"
                                        style={isDark ? vscDarkPlus : vs}
                                        customStyle={{
                                          margin: 0,
                                          padding: '16px',
                                          backgroundColor: 'transparent',
                                          fontSize: '16px',
                                          lineHeight: '1.5'
                                        }}
                                        showLineNumbers={true}
                                        wrapLines={true}
                                      >
                                        {solution.code}
                                      </SyntaxHighlighter>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 space-y-3">
                                    <div>
                                      <h3 className="font-semibold text-foreground mb-2">Explanation</h3>
                                      <p className="text-sm text-muted-foreground">{solution.explanation}</p>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-foreground mb-2">Time & Space Complexity</h3>
                                      <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>• Time complexity: {solution.complexity.time}</li>
                                        <li>• Space complexity: {solution.complexity.space}</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-muted-foreground mb-2">No solutions available</div>
                              <div className="text-sm text-muted-foreground">
                                Solutions for this problem haven't been added yet.
                              </div>
                            </div>
                          )}
                        </div>
                    </TabsContent>

                    <TabsContent value="submissions" className="flex-1 min-h-0 p-0 m-0">
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Submissions</h2>
                        {submissionsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : uniqueSubmissions.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-muted-foreground mb-2">No accepted submissions yet</div>
                            <div className="text-sm text-muted-foreground">
                              Solve this problem to see your submissions here!
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {uniqueSubmissions.map((submission, index) => (
                              <div key={submission.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400">
                                      Accepted
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      Solution #{uniqueSubmissions.length - index}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span>{new Date(submission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                                
                                {/* Full code with syntax highlighting */}
                                <div className="bg-muted/30 rounded-lg overflow-hidden mb-4">
                                  <div className="flex items-center justify-between px-4 py-2 bg-muted/70 border-b border-border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Python Solution
                                    </span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(submission.code);
                                        toast.success('Code copied to clipboard!');
                                      }}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <SyntaxHighlighter
                                      language="python"
                                      style={isDark ? vscDarkPlus : vs}
                                      customStyle={{
                                        margin: 0,
                                        padding: '16px',
                                        backgroundColor: 'transparent',
                                        fontSize: '14px',
                                        lineHeight: '1.5'
                                      }}
                                      showLineNumbers={true}
                                      wrapLines={true}
                                    >
                                      {submission.code}
                                    </SyntaxHighlighter>
                                  </div>
                                </div>

                                {/* Test results summary */}
                                {submission.test_results && Array.isArray(submission.test_results) && (
                                  <div className="flex items-center space-x-3 text-sm">
                                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                                      <Check className="w-3 h-3" />
                                      <span className="font-medium">
                                        {submission.test_results.filter(r => r.passed).length}/{submission.test_results.length} test cases passed
                                      </span>
                                    </div>
                                    {submission.test_results.some(r => r.time) && (
                                      <div className="flex items-center space-x-1 text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>Runtime: {submission.test_results.find(r => r.time)?.time || 'N/A'}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="notes" className="flex-1 min-h-0 p-0 m-0">
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="p-6 h-full flex flex-col">
                        <Notes problemId={problem.id} />
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Middle Panel - Code Editor & Test Results */}
        <ResizablePanel 
          defaultSize={showLeftPanel && showRightPanel ? 40 : showLeftPanel || showRightPanel ? 60 : 100} 
          minSize={30}
        >
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={showBottomPanel ? 65 : 100} minSize={40}>
              <CodeEditor
                initialCode={problem.functionSignature}
                problemId={problem.id}
                onCodeChange={handleCodeChange}
                editorRef={codeEditorRef}
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={isRunning}
              />
            </ResizablePanel>
            {showBottomPanel && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={35} minSize={20}>
                  <div className="h-full bg-background border-t border-border flex flex-col">
                    {testResults.length === 0 ? (
                      <div className="p-4">
                        <div className="text-sm font-medium text-foreground mb-3">Test Results</div>
                        <div className="font-mono text-sm text-muted-foreground">
                          Click "Run" to test your code...
                        </div>
                      </div>
                    ) : (
                      <Tabs defaultValue="0" className="flex flex-col h-full">
                        <div className="px-4 pt-4 pb-2">
                          <div className="text-sm font-medium text-foreground mb-3">Test Results</div>
                          <TabsList className="grid h-10 bg-muted p-1 text-muted-foreground" style={{ gridTemplateColumns: `repeat(${testResults.length}, minmax(0, 1fr))` }}>
                            {testResults.map((result, index) => (
                              <TabsTrigger 
                                key={index}
                                value={index.toString()}
                                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium transition-all ${
                                  result.passed
                                    ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-800 dark:data-[state=active]:bg-green-900/20 dark:data-[state=active]:text-green-400'
                                    : 'data-[state=active]:bg-red-100 data-[state=active]:text-red-800 dark:data-[state=active]:bg-red-900/20 dark:data-[state=active]:text-red-400'
                                }`}
                              >
                                {result.passed ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                <span>Case {index + 1}</span>
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </div>
                        
                        <div className="flex-1 overflow-hidden px-4 pb-4">
                          {testResults.map((result, index) => (
                            <TabsContent 
                              key={index}
                              value={index.toString()}
                              className="h-full overflow-y-auto mt-0"
                            >
                              <div className={`p-4 rounded-lg border-2 h-full ${
                                result.passed 
                                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                              }`}>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    {result.passed ? (
                                      <Check className="w-5 h-5 text-green-700 dark:text-green-400" />
                                    ) : (
                                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    )}
                                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                      <Clock className="w-4 h-4" />
                                      <span>{result.time}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Input:</div>
                                    <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">
{result.input}
                                    </pre>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Expected Output:</div>
                                      <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">{toCompactJson(result.expected)}</pre>
                                    </div>
                                    
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Your Output:</div>
                                      <pre className={`text-sm font-mono whitespace-pre overflow-x-auto ${
                                        result.passed 
                                          ? 'text-green-700 dark:text-green-300' 
                                          : 'text-red-700 dark:text-red-300'
                                      }`}>
                                        {toCompactJson(result.actual) || 'No output'}
                                      </pre>
                                    </div>
                                  </div>
                                  
                                  {result.stderr && (
                                    <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
                                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Error:</div>
                                      <pre className="text-sm font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">{result.stderr}</pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TabsContent>
                          ))}
                        </div>
                      </Tabs>
                    )}
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>
        
        {/* Right Panel - AI Chat */}
        {showRightPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={25}
              minSize={20}
              onResize={(size) => {
                localStorage.setItem('ai-chat-width', String(size));
              }}
            >
              <AIChat 
                problemId={problem.id}
                problemDescription={problem.description}
                onInsertCodeSnippet={handleInsertCodeSnippet}
                problemTestCases={problem.testCases}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default ProblemSolver;
