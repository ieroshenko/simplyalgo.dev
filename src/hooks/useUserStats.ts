import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  totalSolved: number;
  streak: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  maxStreak: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

export const useUserStats = (userId?: string) => {
  const [stats, setStats] = useState<UserStats>({
    totalSolved: 0,
    streak: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    maxStreak: 0
  });
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Guest',
    email: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserStats();
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchUserStats = async () => {
    if (!userId) return;

    try {
      const { data: statsData, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (statsData) {
        // Validate streak before setting stats
        const validatedStreak = validateCurrentStreak(statsData);
        
        setStats({
          totalSolved: statsData.total_solved || 0,
          streak: validatedStreak,
          easySolved: statsData.easy_solved || 0,
          mediumSolved: statsData.medium_solved || 0,
          hardSolved: statsData.hard_solved || 0,
          maxStreak: statsData.max_streak || 0
        });

        // Update database if streak was broken
        if (validatedStreak !== (statsData.current_streak || 0)) {
          await updateStreakInDatabase(validatedStreak);
        }
      }
    } catch (err: any) {
      console.error('Error fetching user stats:', err.message);
    }
  };

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (profileData) {
        setProfile({
          name: profileData.name || 'User',
          email: profileData.email || '',
          avatarUrl: profileData.avatar_url
        });
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatsOnProblemSolved = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    if (!userId) {
      console.error('❌ Cannot update stats: No user ID');
      return;
    }

    console.log('📊 Starting stats update for difficulty:', difficulty);
    console.log('🔍 User ID:', userId);

    try {
      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      console.log('📈 Current stats from DB:', currentStats);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const lastActivityDate = currentStats?.last_activity_date?.split('T')[0];
      const currentStreak = currentStats?.current_streak || 0;
      
      console.log('📅 Today:', today);
      console.log('📅 Last activity:', lastActivityDate);
      console.log('🔥 Current streak:', currentStreak);
      
      // Calculate new streak
      let newStreak = 1;
      if (lastActivityDate) {
        const lastDate = new Date(lastActivityDate);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Same day, keep current streak
          newStreak = currentStreak;
        } else if (diffDays === 1) {
          // Consecutive day, increment streak
          newStreak = currentStreak + 1;
        }
        // If diffDays > 1, streak resets to 1 (already set above)
      }

      // Calculate new totals
      const newEasySolved = (currentStats?.easy_solved || 0) + (difficulty === 'Easy' ? 1 : 0);
      const newMediumSolved = (currentStats?.medium_solved || 0) + (difficulty === 'Medium' ? 1 : 0);
      const newHardSolved = (currentStats?.hard_solved || 0) + (difficulty === 'Hard' ? 1 : 0);
      const newTotalSolved = newEasySolved + newMediumSolved + newHardSolved;
      const newMaxStreak = Math.max(currentStats?.max_streak || 0, newStreak);

      console.log('🎯 New stats to save:', {
        newTotalSolved,
        newEasySolved,
        newMediumSolved,
        newHardSolved,
        newStreak,
        newMaxStreak
      });

      // Update or insert stats
      const { error: upsertError } = await supabase
        .from('user_statistics')
        .upsert({
          id: currentStats?.id, // Include existing ID if updating
          user_id: userId,
          total_solved: newTotalSolved,
          easy_solved: newEasySolved,
          medium_solved: newMediumSolved,
          hard_solved: newHardSolved,
          current_streak: newStreak,
          max_streak: newMaxStreak,
          last_activity_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id' // Use user_id as the conflict resolution key
        });

      if (upsertError) {
        console.error('🚨 Upsert error details:', upsertError);
        throw upsertError;
      }

      console.log('✅ Stats successfully saved to database');

      // Update local state
      setStats({
        totalSolved: newTotalSolved,
        streak: newStreak,
        easySolved: newEasySolved,
        mediumSolved: newMediumSolved,
        hardSolved: newHardSolved,
        maxStreak: newMaxStreak
      });

      console.log('🎊 Local state updated successfully!');

    } catch (err) {
      console.error('❌ Error updating user stats:', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const validateCurrentStreak = (statsData: any): number => {
    const today = new Date().toISOString().split('T')[0];
    const lastActivityDate = statsData?.last_activity_date?.split('T')[0];
    const currentStreak = statsData?.current_streak || 0;

    if (!lastActivityDate) return 0;

    const lastDate = new Date(lastActivityDate);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Streak is broken if more than 1 day gap
    if (diffDays > 1) {
      return 0;
    }

    return currentStreak;
  };

  const updateStreakInDatabase = async (newStreak: number) => {
    if (!userId) return;

    try {
      await supabase
        .from('user_statistics')
        .update({
          current_streak: newStreak,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating streak in database:', error);
    }
  };

  return {
    stats,
    profile,
    loading,
    updateStatsOnProblemSolved
  };
};
