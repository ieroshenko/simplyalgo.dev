import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Sidebar from '@/components/Sidebar';
import ProblemTable from '@/components/ProblemTable';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Target, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserStats } from '@/hooks/useUserStats';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { problems, categories: dbCategories, loading: problemsLoading } = useProblems(user?.id);
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const categories = ['All', ...dbCategories.map(c => c.name)];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || problemsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Good morning, {profile.name}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Ready to tackle some coding challenges today?
            </p>
          </div>
          
          <div className="bg-profile-header px-4 py-2 rounded-lg">
            <div className="text-sm text-profile-header-foreground">
              🔥 {stats.streak} day streak
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.totalSolved}</div>
                <div className="text-sm text-muted-foreground">Problems Solved</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.streak}</div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.aiSessions}</div>
                <div className="text-sm text-muted-foreground">AI Sessions</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Category Filters */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Filter by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category || (category === 'All' && !selectedCategory) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category === 'All' ? undefined : category)}
                className={
                  selectedCategory === category || (category === 'All' && !selectedCategory)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Problems Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {selectedCategory ? `${selectedCategory} Problems` : 'All Problems'}
          </h2>
          <ProblemTable problems={problems} filteredCategory={selectedCategory} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;