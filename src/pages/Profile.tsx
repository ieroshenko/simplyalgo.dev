import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Clock, Trophy, Calendar } from 'lucide-react';
import { useEffect } from 'react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
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
    return `https://ui-avatars.com/api/?name=${initials}&background=3b82f6&color=fff&size=200`;
  };

  const getUserName = () => {
    return user.user_metadata?.full_name || profile.name || 'User';
  };

  const getUserEmail = () => {
    return user.email || profile.email || '';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/arena')}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Header Card */}
        <Card className="p-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img
                src={getUserAvatar()}
                alt={getUserName()}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">{getUserName()}</h2>
              <p className="text-muted-foreground mb-4">{getUserEmail()}</p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stats.totalSolved}</div>
                <div className="text-sm text-muted-foreground">Total Solved</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stats.streak}</div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stats.maxStreak}</div>
                <div className="text-sm text-muted-foreground">Best Streak</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.totalSolved > 0 ? Math.round((stats.totalSolved / 100) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Problem Breakdown */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-6">Problems Solved by Difficulty</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl font-bold text-green-700">{stats.easySolved}</div>
              </div>
              <div className="text-sm font-medium text-green-700">Easy</div>
              <div className="text-xs text-muted-foreground mt-1">Problems Solved</div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl font-bold text-yellow-700">{stats.mediumSolved}</div>
              </div>
              <div className="text-sm font-medium text-yellow-700">Medium</div>
              <div className="text-xs text-muted-foreground mt-1">Problems Solved</div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl font-bold text-red-700">{stats.hardSolved}</div>
              </div>
              <div className="text-sm font-medium text-red-700">Hard</div>
              <div className="text-xs text-muted-foreground mt-1">Problems Solved</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;