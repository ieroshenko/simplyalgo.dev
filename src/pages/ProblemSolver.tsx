import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import CodeEditor from '@/components/CodeEditor';
import AIChat from '@/components/AIChat';
import { ArrowLeft, Star, StarOff, Copy, Check, X, Clock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserStats } from '@/hooks/useUserStats';
import { UserAttemptsService } from '@/services/userAttempts';
import { TestRunnerService } from '@/services/testRunner';
import { TestCase, TestResult } from '@/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Timer from '@/components/Timer';

const ProblemSolver = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { problems, toggleStar, loading, error, refetch } = useProblems(user?.id);
  const { updateStatsOnProblemSolved } = useUserStats(user?.id);
  const [activeTab, setActiveTab] = useState('question');
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
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
  }, [showLeftPanel, showBottomPanel, showRightPanel]);
  
  const problem = problems.find(p => p.id === problemId);
  
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
    await updateStatsOnProblemSolved(difficulty);
    refetch();
  };


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
              <div className="h-full flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
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

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="question" className="p-6 space-y-6 m-0 h-full overflow-y-auto">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Problem Description</h2>
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          <p>{problem.description}</p>
                        </div>
                      </div>

                      {problem.examples && problem.examples.length > 0 && (
                        <div>
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
                    </TabsContent>

                    <TabsContent value="solution" className="p-6 space-y-6 m-0 h-full overflow-y-auto">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">1. Brute Force</h2>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex space-x-2">
                              <Button variant="default" size="sm">Python</Button>
                              <Button variant="outline" size="sm">Java</Button>
                              <Button variant="outline" size="sm">C++</Button>
                            </div>
                            <Button variant="outline" size="sm">
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-sm bg-background p-4 rounded border overflow-x-auto">
                            <code>{`def twoSum(self, nums: List[int], target: int) -> List[int]:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`}</code>
                          </pre>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="font-semibold text-foreground mb-2">Time & Space Complexity</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Time complexity: O(n²)</li>
                            <li>• Space complexity: O(1)</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">2. Hash Map</h2>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex space-x-2">
                              <Button variant="default" size="sm">Python</Button>
                              <Button variant="outline" size="sm">Java</Button>
                              <Button variant="outline" size="sm">C++</Button>
                            </div>
                            <Button variant="outline" size="sm">
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-sm bg-background p-4 rounded border overflow-x-auto">
                            <code>{`def twoSum(self, nums: List[int], target: int) -> List[int]:
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []`}</code>
                          </pre>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="font-semibold text-foreground mb-2">Time & Space Complexity</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Time complexity: O(n)</li>
                            <li>• Space complexity: O(n)</li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="submissions" className="p-6 m-0 h-full overflow-y-auto">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Submissions</h2>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium" style={{color: '#388e3c'}}>Accepted</span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>Python</span>
                              <span>2 minutes ago</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium" style={{color: '#388e3c'}}>Accepted</span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>Python</span>
                              <span>5 minutes ago</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="p-6 m-0 h-full overflow-y-auto flex flex-col">
                      <div className="flex-1 flex flex-col">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
                        <div className="bg-muted/50 rounded-lg p-4 flex-1 min-h-[400px] flex">
                          <textarea
                            className="w-full h-full bg-transparent border-none outline-none resize-none text-sm flex-1"
                            placeholder="Start writing your notes in Markdown...

# Heading
**Bold text**
*Italic text*
`code`
- List item
[Link](url)"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-xs text-muted-foreground">
                            0 / 5000 characters • 0 words
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">Preview</Button>
                            <Button variant="outline" size="sm">Save</Button>
                            <Button variant="outline" size="sm">Clear</Button>
                          </div>
                        </div>
                      </div>
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
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={isRunning}
              />
            </ResizablePanel>
            {showBottomPanel && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={35} minSize={20}>
                  <div className="h-full bg-background border-t border-border p-4 flex flex-col">
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
                                  <Check className="w-5 h-5 text-green-700 dark:text-green-400" />
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
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default ProblemSolver;
