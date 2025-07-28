import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Code, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';
import dataStructures from '@/data/dataStructures.json';

type Language = 'python' | 'javascript';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface DataStructure {
  slug: string;
  name: string;
  difficulty: Difficulty;
  complexity: string;
  description: string;
  operations: Record<string, string>;
  code: {
    python: string;
    javascript: string;
  };
  useCases: string[];
  relatedProblems: string[];
}

const DataStructureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');

  const structure = dataStructures.find(ds => ds.slug === slug) as DataStructure | undefined;

  if (!structure) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Data Structure Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested data structure could not be found.</p>
          <Button onClick={() => navigate('/leetcode')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to LeetCode Arena
          </Button>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-primary text-primary-foreground';
      case 'Medium': return 'bg-accent text-accent-foreground';
      case 'Hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/leetcode')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{structure.name}</h1>
            <Badge className={getDifficultyColor(structure.difficulty as Difficulty)}>
              {structure.difficulty}
            </Badge>
          </div>
        </div>

        {/* Overview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{structure.description}</p>
            
            {/* Time Complexity Table */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Time Complexities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(structure.operations).map(([operation, complexity]) => (
                  <div key={operation} className="bg-muted p-3 rounded-lg">
                    <div className="font-medium text-sm text-foreground">{operation}</div>
                    <div className="text-lg font-bold text-primary">{complexity}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Implementation
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={selectedLanguage === 'python' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage('python')}
                >
                  Python
                </Button>
                <Button
                  variant={selectedLanguage === 'javascript' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage('javascript')}
                >
                  JavaScript
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="400px"
                language={selectedLanguage}
                value={structure.code[selectedLanguage]}
                theme="light"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Use Cases & Related Problems */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Use Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Real-World Use Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {structure.useCases.map((useCase, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-muted-foreground">{useCase}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Related Problems */}
          <Card>
            <CardHeader>
              <CardTitle>Related LeetCode Problems</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {structure.relatedProblems.map((problem, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      // This would navigate to the specific problem if we had the mapping
                      console.log(`Navigate to problem: ${problem}`);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {problem}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataStructureDetail;