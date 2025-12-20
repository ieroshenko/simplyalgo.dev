import type { User } from '@supabase/supabase-js';

export type MinimalProfile = { name?: string; email?: string; avatarUrl?: string | null };

export const getUserName = (user?: User | null, profile?: MinimalProfile): string => {
  return (
    user?.user_metadata?.full_name ||
    profile?.name ||
    'User'
  );
};

export const getUserInitials = (name: string): string => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
  return initials || 'U';
};

export const getUserAvatarUrl = (
  user?: User | null,
  profile?: MinimalProfile,
  size: number = 80,
): string => {
  // Prefer provider (e.g., Google) avatar URL when available
  if (user?.user_metadata?.avatar_url) {
    return user.user_metadata.avatar_url as string;
  }
  // Then profile-stored URL
  if (profile?.avatarUrl) {
    return profile.avatarUrl as string;
  }
  // Fallback to generated initials avatar
  const name = getUserName(user, profile);
  const initials = encodeURIComponent(getUserInitials(name));
  return `https://ui-avatars.com/api/?name=${initials}&background=3b82f6&color=fff&size=${size}`;
};

