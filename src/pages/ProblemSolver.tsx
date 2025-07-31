import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import CodeEditor from '@/components/CodeEditor';
import AIChat from '@/components/AIChat';
import { ArrowLeft, Star, StarOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { UserAttemptsService } from '@/services/userAttempts';
import { useState } from 'react';
import { toast } from 'sonner';

const ProblemSolver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { problems } = useProblems(user?.id);
  const [isStarred, setIsStarred] = useState(false);
  
  // Get problem by ID or default to first problem
  const problem = problems.find(p => p.id === id) || problems[0];

  // Redirect if not authenticated
  if (!user) {
    navigate('/');
    return null;
  }

  // Show loading if no problems loaded yet
  if (!problems.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading problem...</p>
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
      await UserAttemptsService.submitCode(user.id, problem.id, code);
      toast.success('Code submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit code');
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
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
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
            onClick={() => setIsStarred(!isStarred)}
          >
            {isStarred ? (
              <Star className="w-4 h-4 text-accent fill-current" />
            ) : (
              <StarOff className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content - Resizable 3 Column Layout */}
      <div className="h-[calc(100vh-73px)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Problem Description */}
          <ResizablePanel defaultSize={33} minSize={20} maxSize={50}>
            <Card className="h-full rounded-none border-none">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-3">Problem Description</h2>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground leading-relaxed whitespace-pre-line">
                        {problem.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-semibold text-foreground mb-3">Examples</h3>
                    <div className="space-y-4">
                      {problem.examples.map((example, index) => (
                        <div key={index} className="bg-secondary p-4 rounded-lg">
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-foreground">Input: </span>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {example.input}
                              </code>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">Output: </span>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {example.output}
                              </code>
                            </div>
                            {example.explanation && (
                              <div>
                                <span className="text-sm font-medium text-foreground">Explanation: </span>
                                <span className="text-sm text-muted-foreground">
                                  {example.explanation}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-semibold text-foreground mb-3">Constraints</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>1 ≤ nums.length ≤ 10⁴</li>
                      <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
                      <li>-10⁹ ≤ target ≤ 10⁹</li>
                      <li>Only one valid answer exists.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle Panel - Code Editor */}
          <ResizablePanel defaultSize={34} minSize={25} maxSize={60}>
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
          <ResizablePanel defaultSize={33} minSize={20} maxSize={50}>
            <AIChat problemId={problem.id} problemDescription={problem.description} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default ProblemSolver;