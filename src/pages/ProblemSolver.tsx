import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import CodeEditor from '@/components/CodeEditor';
import AIChat from '@/components/AIChat';
import { ArrowLeft, Star, StarOff, Copy } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { UserAttemptsService } from '@/services/userAttempts';
import { useState } from 'react';
import { toast } from 'sonner';

const ProblemSolver = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { problems, toggleStar, loading, error } = useProblems(user?.id);
  const [activeTab, setActiveTab] = useState('question');
  
  console.log('🔍 ProblemSolver render:', {
    problemId,
    userId: user?.id,
    problemsCount: problems.length,
    loading,
    error
  });
  
  const problem = problems.find(p => p.id === problemId);
  console.log('🎯 Found problem:', problem ? problem.title : 'NOT FOUND');
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!problem) {
    console.log('❌ Problem not found. Available problems:', problems.map(p => ({ id: p.id, title: p.title })));
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

  const handleRun = async (code: string) => {
    if (!user?.id) return;
    
    try {
      await UserAttemptsService.saveDraft(user.id, problem.id, code);
      toast.success('Code saved and executed');
    } catch (error) {
      toast.error('Failed to save code');
    }
  };

  const handleSubmit = async (code: string) => {
    if (!user?.id) return;
    
    try {
      await UserAttemptsService.saveSubmission(user.id, problem.id, code, 'accepted');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
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

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-81px)]">
        {/* Left Panel - Problem Description */}
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

              <div className="flex-1 overflow-auto">
                <TabsContent value="question" className="p-6 space-y-6 m-0">
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

                <TabsContent value="solution" className="p-6 space-y-6 m-0">
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

                <TabsContent value="submissions" className="p-6 m-0">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Submissions</h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-success">Accepted</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Python</span>
                          <span>2 minutes ago</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-success">Accepted</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Python</span>
                          <span>5 minutes ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="p-6 m-0">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
                    <div className="bg-muted/50 rounded-lg p-4 min-h-[300px]">
                      <textarea
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
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

        {/* Middle Panel - Code Editor */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <CodeEditor
            initialCode={problem.functionSignature}
            testCases={problem.testCases}
            problemId={problem.id}
            onRun={handleRun}
            onSubmit={handleSubmit}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Right Panel - AI Chat */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <AIChat 
            problemId={problem.id}
            problemDescription={problem.description}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default ProblemSolver;
