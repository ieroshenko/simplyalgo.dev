// Admin Dashboard Types

export interface UserAIRestriction {
  ai_coach_enabled: boolean;
  ai_chat_enabled: boolean;
  daily_limit_tokens: number;
  monthly_limit_tokens: number;
  cooldown_until: string | null;
  cooldown_reason: string | null;
}

export interface SubscriptionWithProfile {
  user_id: string;
  plan: string;
  status: string;
  user_profiles?: {
    email: string;
  };
}

export interface UserAIUsage {
  tokens_today: number;
  tokens_month: number;
  cost_today: number;
  cost_month: number;
}

export interface UserStats {
  id: string;
  email: string;
  created_at: string;
  is_premium: boolean;
  problems_solved: number;
  chat_messages: number;
  coaching_sessions: number;
  last_active: string | null;
  recent_problems: string[];
  ai_restriction?: UserAIRestriction;
  ai_usage?: UserAIUsage;
}

export interface OpenRouterUsage {
  credits_remaining: number;
  credits_total: number;
  credits_used: number;
}

export interface AdminOverviewStats {
  totalUsers: number;
  premiumUsers: number;
  activeToday: number;
  mrr: number;
}

export interface DialogUserInfo {
  id: string;
  email: string;
}
