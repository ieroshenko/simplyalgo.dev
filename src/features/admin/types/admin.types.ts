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

export interface AnalyticsBreakdownItem {
  label: string;
  value: number;
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  tokens: number;
  cost: number;
  sessions: number;
  activeUsers: number;
}

export interface AnalyticsTimelinePoint {
  date: string;
  count: number;
}

export type AnalyticsResolution = "day" | "month" | "year";

export interface AdminAnalyticsStats {
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    newUsers30d: number;
    retention7d: number;
    retention30d: number;
  };
  aiUsage: {
    tokens30d: number;
    cost30d: number;
    sessions30d: number;
    avgMessagesPerSession: number;
    featureBreakdown: AnalyticsBreakdownItem[];
    modelBreakdown: AnalyticsBreakdownItem[];
    dailySeries: AnalyticsTimeSeriesPoint[];
  };
  problems: {
    attempts30d: number;
    passRate30d: number;
    uniqueProblems30d: number;
    avgAttemptsPerProblem: number;
    topProblems: AnalyticsBreakdownItem[];
  };
  streaks: {
    averageCurrentStreak: number;
    maxStreak: number;
    atRiskUsers: number;
  };
  flashcards: {
    decksTotal: number;
    reviews30d: number;
    dueNow: number;
    avgMastery: number;
  };
  behavioral: {
    sessionsStarted30d: number;
    sessionsCompleted30d: number;
    avgScore30d: number;
  };
  mockInterviews: {
    sessionsStarted30d: number;
    sessionsCompleted30d: number;
    avgScore30d: number;
  };
  content: {
    questionsAdded30d: number;
    solutionsAdded30d: number;
    storiesAdded30d: number;
    storyReuseRate30d: number;
  };
  feedback: {
    newFeedback30d: number;
    openCount: number;
    resolvedCount: number;
  };
  subscriptions: {
    active: number;
    trialing: number;
    cancelled: number;
    pastDue: number;
    new30d: number;
    churned30d: number;
    userJoinDates: string[];
    subscriptionJoinDates: string[];
    cancellationsDates: string[];
    userJoinTimeline: AnalyticsTimelinePoint[];
    cancellationsTimeline: AnalyticsTimelinePoint[];
  };
}

export interface DialogUserInfo {
  id: string;
  email: string;
}
