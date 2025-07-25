import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Circle, 
  Star, 
  StarOff, 
  Play,
  Code,
  List,
  Database,
  GitBranch,
  BarChart3,
  Layers
} from 'lucide-react';
import { Problem } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ProblemTableProps {
  problems: Problem[];
  filteredCategory?: string;
}

const ProblemTable = ({ problems, filteredCategory }: ProblemTableProps) => {
  const navigate = useNavigate();

  const categoryIcons = {
    'Array': Code,
    'Linked List': List,
    'Stack': Database,
    'Tree': GitBranch,
    'Graph': BarChart3,
    'Dynamic Programming': Layers
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-success text-success-foreground';
      case 'Medium': return 'bg-accent text-accent-foreground';
      case 'Hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'solved': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'attempted': return <Circle className="w-4 h-4 text-accent" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredProblems = filteredCategory 
    ? problems.filter(p => p.category === filteredCategory)
    : problems;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Star</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Problem</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Difficulty</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProblems.map((problem) => {
              const CategoryIcon = categoryIcons[problem.category as keyof typeof categoryIcons];
              
              return (
                <tr key={problem.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    {getStatusIcon(problem.status)}
                  </td>
                  <td className="px-4 py-3">
                    <button className="hover:scale-110 transition-transform">
                      {problem.isStarred ? (
                        <Star className="w-4 h-4 text-accent fill-current" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{problem.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {CategoryIcon && <CategoryIcon className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm text-foreground">{problem.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getDifficultyColor(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/problem/${problem.id}`)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ProblemTable;