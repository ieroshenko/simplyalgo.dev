import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sidebar from '@/components/Sidebar';
import ProblemTable from '@/components/ProblemTable';
import DataStructureVault from '@/components/DataStructureVault';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Target, Search, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserStats } from '@/hooks/useUserStats';

const LeetCodeArena = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { problems, categories: dbCategories, loading: problemsLoading, refetch: refetchProblems } = useProblems(user?.id);
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

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

  const getUserAvatar = () => {
    // Try Google avatar from user metadata first
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    // Fallback to profile avatar
    if (profile.avatarUrl) {
      return profile.avatarUrl;
    }
    // Generate initials avatar as fallback
    const name = user.user_metadata?.full_name || profile.name || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return `https://ui-avatars.com/api/?name=${initials}&background=3b82f6&color=fff&size=80`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              LeetCode Arena 🥊
            </h1>
            <p className="text-muted-foreground mt-1">
              Master coding patterns and solve problems to sharpen your skills
            </p>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-3 px-4 py-2 hover:bg-secondary rounded-lg"
          >
            <img
              src={getUserAvatar()}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">
                {user.user_metadata?.full_name || profile.name || 'User'}
              </div>
              <div className="text-xs text-muted-foreground">
                View Profile
              </div>
            </div>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="problems" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="problems">Problems</TabsTrigger>
            <TabsTrigger value="data-structures">Data Structures</TabsTrigger>
          </TabsList>

          <TabsContent value="problems" className="space-y-6">
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

            {/* Search */}
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Problems Table */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedCategory ? `${selectedCategory} Problems` : 'All Problems'}
              </h2>
              <ProblemTable 
                problems={problems} 
                filteredCategory={selectedCategory}
                searchQuery={searchQuery}
              />
            </div>
          </TabsContent>

          <TabsContent value="data-structures">
            <DataStructureVault />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeetCodeArena;