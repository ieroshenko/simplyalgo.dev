import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Home, 
  TrendingUp, 
  Brain, 
  Shuffle,
  Code,
  List,
  Database,
  GitBranch,
  BarChart3,
  Layers
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockCategories } from '@/data/mockData';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: TrendingUp, label: 'Progress', path: '/progress' },
    { icon: Brain, label: 'AI Tutor', path: '/tutor' }
  ];

  const categoryIcons = {
    'Array': Code,
    'Linked List': List,
    'Stack': Database,
    'Tree': GitBranch,
    'Graph': BarChart3,
    'Dynamic Programming': Layers
  };

  return (
    <div className="w-64 bg-background border-r border-border h-full flex flex-col">
      {/* Navigation */}
      <div className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Button
              key={item.path}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary text-foreground'
              }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="w-4 h-4 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </div>

      {/* Category Progress */}
      <div className="px-4 pb-4 flex-1">
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Category Progress</h3>
          <div className="space-y-3">
            {mockCategories.map((category) => {
              const IconComponent = categoryIcons[category.name as keyof typeof categoryIcons];
              const percentage = (category.solved / category.total) * 100;
              
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {IconComponent && <IconComponent className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm text-foreground">{category.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {category.solved}/{category.total}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Random Problem Button */}
        <Button 
          className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => navigate('/problem/random')}
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Random Problem
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;