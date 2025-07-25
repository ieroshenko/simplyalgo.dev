import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CodeEditor from '@/components/CodeEditor';
import AIChat from '@/components/AIChat';
import { ArrowLeft, Star, StarOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockProblems } from '@/data/mockData';
import { useState } from 'react';

const ProblemSolver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isStarred, setIsStarred] = useState(false);
  
  // Get problem by ID or default to first problem
  const problem = mockProblems.find(p => p.id === id) || mockProblems[0];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-success text-success-foreground';
      case 'Medium': return 'bg-accent text-accent-foreground';
      case 'Hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleRun = (code: string) => {
    console.log('Running code:', code);
  };

  const handleSubmit = (code: string) => {
    console.log('Submitting code:', code);
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

      {/* Main Content - 3 Column Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Problem Description */}
        <div className="w-1/3 border-r border-border overflow-hidden">
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
        </div>

        {/* Middle Panel - Code Editor */}
        <div className="w-1/3 border-r border-border">
          <CodeEditor
            initialCode={problem.functionSignature}
            onRun={handleRun}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Right Panel - AI Chat */}
        <div className="w-1/3">
          <AIChat problemId={problem.id} />
        </div>
      </div>
    </div>
  );
};

export default ProblemSolver;