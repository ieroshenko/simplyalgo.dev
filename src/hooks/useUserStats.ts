import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  totalSolved: number;
  streak: number;
  aiSessions: number;
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
    aiSessions: 0,
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
        setStats({
          totalSolved: statsData.total_solved || 0,
          streak: statsData.current_streak || 0,
          aiSessions: statsData.ai_sessions || 0,
          easySolved: statsData.easy_solved || 0,
          mediumSolved: statsData.medium_solved || 0,
          hardSolved: statsData.hard_solved || 0,
          maxStreak: statsData.max_streak || 0
        });
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

  return {
    stats,
    profile,
    loading
  };
};