import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sidebar from '@/components/Sidebar';
import ProblemTable from '@/components/ProblemTable';
import DataStructureVault from '@/components/DataStructureVault';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Target, Search, User, Trophy, Zap, TrendingUp, Code2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserStats } from '@/hooks/useUserStats';

const LeetCodeArena = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { problems, categories: dbCategories, loading: problemsLoading, refetch: refetchProblems } = useProblems(user?.id);
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(() => {
    // Load selected category from localStorage on initialization
    const saved = localStorage.getItem('selected-category');
    return saved || undefined;
  });
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', ...dbCategories.map(c => c.name)];

  // Function to handle category selection with persistence
  const handleCategorySelect = (category: string) => {
    const categoryValue = category === 'All' ? undefined : category;
    setSelectedCategory(categoryValue);
    
    // Persist to localStorage
    if (categoryValue) {
      localStorage.setItem('selected-category', categoryValue);
    } else {
      localStorage.removeItem('selected-category');
    }
  };

  // Validate saved category exists in available categories
  // Only run validation once categories are fully loaded (more than just "All")
  useEffect(() => {
    // Only validate if categories are fully loaded (not just ["All"])
    if (
      !problemsLoading &&
      categories.length > 1 &&
      selectedCategory &&
      !categories.includes(selectedCategory)
    ) {
      setSelectedCategory(undefined);
      localStorage.removeItem('selected-category');
    }
  }, [dbCategories, selectedCategory, problemsLoading]);

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
              Leetcode Arena 
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
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.totalSolved}</div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Problems Solved</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.streak}</div>
                <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Day Streak</div>
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
                    onClick={() => handleCategorySelect(category)}
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