import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@/shared/services/notificationService";
import { logger } from "@/utils/logger";
import type {
  UserStats,
  OpenRouterUsage,
  AdminOverviewStats,
  SubscriptionWithProfile,
} from "../types/admin.types";

interface UseAdminDashboardReturn {
  users: UserStats[];
  loading: boolean;
  openRouterStats: OpenRouterUsage | null;
  overviewStats: AdminOverviewStats;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredUsers: UserStats[];
  refresh: () => Promise<void>;
  refetchUserStats: () => Promise<void>;
  refetchOverviewStats: () => Promise<void>;
}

export function useAdminDashboard(): UseAdminDashboardReturn {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openRouterStats, setOpenRouterStats] = useState<OpenRouterUsage | null>(null);
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStats>({
    totalUsers: 0,
    premiumUsers: 0,
    activeToday: 0,
    mrr: 0,
  });

  const fetchUserStats = useCallback(async () => {
    // Fetch user profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch subscriptions
    const { data: subscriptionsData } = await supabase
      .from("user_subscriptions")
      .select("user_id, status");

    // Create a map of premium users
    const premiumUserIds = new Set(
      (subscriptionsData || [])
        .filter((s) => s.status === "active" || s.status === "trialing")
        .map((s) => s.user_id)
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: usageRows } = await supabase
      .from("user_ai_usage")
      .select("user_id, tokens_total, estimated_cost, created_at")
      .gte("created_at", monthStart.toISOString());

    const usageByUserId = new Map<
      string,
      { tokensToday: number; tokensMonth: number; costToday: number; costMonth: number }
    >();

    for (const row of usageRows || []) {
      const userId = row.user_id;
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      const tokens = row.tokens_total ?? 0;
      const cost = row.estimated_cost ?? 0;

      const existing = usageByUserId.get(userId) || {
        tokensToday: 0,
        tokensMonth: 0,
        costToday: 0,
        costMonth: 0,
      };

      existing.tokensMonth += tokens;
      existing.costMonth += cost;

      if (createdAt && createdAt >= todayStart) {
        existing.tokensToday += tokens;
        existing.costToday += cost;
      }

      usageByUserId.set(userId, existing);
    }

    // Pre-fetch last activity dates from all activity sources (more efficient than per-user queries)
    const [
      { data: chatActivity },
      { data: coachingActivity },
      { data: problemActivity },
      { data: behavioralActivity },
      { data: technicalActivity },
      { data: systemDesignActivity },
      { data: flashcardActivity },
    ] = await Promise.all([
      supabase.from("ai_chat_sessions").select("user_id, updated_at"),
      supabase.from("coaching_sessions").select("user_id, updated_at"),
      supabase.from("user_problem_attempts").select("user_id, updated_at"),
      supabase.from("behavioral_interview_sessions").select("user_id, started_at"),
      supabase.from("technical_interview_sessions").select("user_id, started_at"),
      supabase.from("system_design_sessions").select("user_id, updated_at"),
      supabase.from("flashcard_reviews").select("deck_id, reviewed_at"),
    ]);

    // Get flashcard deck owners for mapping reviews to users
    const deckIds = [...new Set((flashcardActivity || []).map((r) => r.deck_id))];
    const { data: deckOwners } = deckIds.length > 0
      ? await supabase.from("flashcard_decks").select("id, user_id").in("id", deckIds)
      : { data: [] };

    const deckToUserMap = new Map((deckOwners || []).map((d) => [d.id, d.user_id]));

    // Build a map of user_id -> most recent activity date
    const lastActivityByUser = new Map<string, Date>();

    const updateLastActivity = (userId: string | null, dateStr: string | null) => {
      if (!userId || !dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      const existing = lastActivityByUser.get(userId);
      if (!existing || date > existing) {
        lastActivityByUser.set(userId, date);
      }
    };

    // Process all activity sources
    (chatActivity || []).forEach((row) => updateLastActivity(row.user_id, row.updated_at));
    (coachingActivity || []).forEach((row) => updateLastActivity(row.user_id, row.updated_at));
    (problemActivity || []).forEach((row) => updateLastActivity(row.user_id, row.updated_at));
    (behavioralActivity || []).forEach((row) => updateLastActivity(row.user_id, row.started_at));
    (technicalActivity || []).forEach((row) => updateLastActivity(row.user_id, row.started_at));
    (systemDesignActivity || []).forEach((row) => updateLastActivity(row.user_id, row.updated_at));
    (flashcardActivity || []).forEach((row) => {
      const userId = deckToUserMap.get(row.deck_id);
      updateLastActivity(userId || null, row.reviewed_at);
    });

    // For each user, fetch their stats
    const userStatsPromises = (profilesData || []).map(async (profile) => {
      const userId = profile.user_id;

      // Get user_statistics for this user
      const { data: statsData } = await supabase
        .from("user_statistics")
        .select("total_solved, last_activity_date")
        .eq("user_id", userId)
        .single();

      // Get passed problems count (distinct problems only)
      const { data: passedProblems } = await supabase
        .from("user_problem_attempts")
        .select("problem_id")
        .eq("user_id", userId)
        .eq("status", "passed");

      const uniquePassedProblems = new Set(
        (passedProblems || []).map((p) => p.problem_id)
      );
      const passedCount = uniquePassedProblems.size;

      // Get recent problems
      const { data: recentProblems } = await supabase
        .from("user_problem_attempts")
        .select("problem_id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5);

      // Get AI chat session count
      const { count: chatCount } = await supabase
        .from("ai_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get coaching session count
      const { count: coachingCount } = await supabase
        .from("coaching_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get AI restrictions
      const { data: aiRestriction } = await supabase
        .from("user_ai_restrictions")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get AI usage (today and this month)
      const aggregatedUsage = usageByUserId.get(userId);
      const aiUsage = {
        tokens_today: aggregatedUsage?.tokensToday ?? 0,
        tokens_month: aggregatedUsage?.tokensMonth ?? 0,
        cost_today: aggregatedUsage?.costToday ?? 0,
        cost_month: aggregatedUsage?.costMonth ?? 0,
      };

      const solvedCount = statsData?.total_solved || passedCount || 0;

      // Get last active from pre-computed map (tracks all activities, not just problem solving)
      const lastActiveDate = lastActivityByUser.get(userId);
      const lastActive = lastActiveDate ? lastActiveDate.toISOString() : null;

      return {
        id: userId,
        email: profile.email || profile.name || "No email",
        created_at: profile.created_at,
        is_premium: premiumUserIds.has(userId),
        problems_solved: solvedCount,
        chat_messages: chatCount || 0,
        coaching_sessions: coachingCount || 0,
        last_active: lastActive,
        recent_problems: (recentProblems || []).map((p) => p.problem_id),
        ai_restriction: aiRestriction
          ? {
              ai_coach_enabled: aiRestriction.ai_coach_enabled ?? true,
              ai_chat_enabled: aiRestriction.ai_chat_enabled ?? true,
              daily_limit_tokens: aiRestriction.daily_limit_tokens ?? 100000,
              monthly_limit_tokens: aiRestriction.monthly_limit_tokens ?? 2000000,
              cooldown_until: aiRestriction.cooldown_until,
              cooldown_reason: aiRestriction.cooldown_reason,
            }
          : undefined,
        ai_usage: aiUsage,
      };
    });

    const stats = await Promise.all(userStatsPromises);
    setUsers(stats);
  }, []);

  const fetchOpenRouterUsage = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-usage`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch OpenRouter usage: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        logger.warn("[AdminDashboard] OpenRouter usage error", { error: data.error });
      }

      setOpenRouterStats({
        credits_remaining: data.credits_remaining || 0,
        credits_total: data.credits_total || 0,
        credits_used: data.credits_used || 0,
      });
    } catch (error) {
      logger.error("[AdminDashboard] Error fetching OpenRouter usage", { error });
      setOpenRouterStats({
        credits_remaining: 0,
        credits_total: 0,
        credits_used: 0,
      });
    }
  }, []);

  const fetchOverviewStats = useCallback(async () => {
    // Get total users from user_profiles
    const { count: totalCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    // Get premium users from subscriptions
    const { count: premiumCount } = await supabase
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "trialing"]);

    // Get active users by checking actual activity from multiple tables
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // Get users with activity today from various sources
    const [
      { data: chatUsers },
      { data: coachingUsers },
      { data: attemptsUsers },
      { data: behavioralUsers },
      { data: technicalUsers },
      { data: systemDesignUsers },
    ] = await Promise.all([
      supabase.from("ai_chat_sessions").select("user_id").gte("created_at", todayStart),
      supabase.from("coaching_sessions").select("user_id").gte("created_at", todayStart),
      supabase.from("user_problem_attempts").select("user_id").gte("created_at", todayStart),
      supabase.from("behavioral_interview_sessions").select("user_id").gte("created_at", todayStart),
      supabase.from("technical_interview_sessions").select("user_id").gte("created_at", todayStart),
      supabase.from("system_design_sessions").select("user_id").gte("created_at", todayStart),
    ]);

    // Combine all user IDs and get unique count
    const allUserIds = new Set([
      ...(chatUsers?.map((u) => u.user_id) || []),
      ...(coachingUsers?.map((u) => u.user_id) || []),
      ...(attemptsUsers?.map((u) => u.user_id) || []),
      ...(behavioralUsers?.map((u) => u.user_id) || []),
      ...(technicalUsers?.map((u) => u.user_id) || []),
      ...(systemDesignUsers?.map((u) => u.user_id) || []),
    ]);

    const activeCount = allUserIds.size;

    // Calculate MRR (Monthly Recurring Revenue) excluding admin users
    const adminEmails = ["tazigrigolia@gmail.com", "ivaneroshenko@gmail.com"];

    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select(
        `
        user_id,
        plan,
        status,
        user_profiles!inner(email)
      `
      )
      .in("status", ["active", "trialing"]);

    let totalMrr = 0;
    const monthlyPrice = 9.99;
    const yearlyPrice = 99.99;

    (subscriptions || []).forEach((sub) => {
      const userEmail = (
        sub as unknown as { user_profiles?: { email?: string | null } }
      ).user_profiles?.email;

      // Skip admin users
      if (adminEmails.includes(userEmail)) {
        return;
      }

      if (sub.plan === "monthly") {
        totalMrr += monthlyPrice;
      } else if (sub.plan === "yearly") {
        totalMrr += yearlyPrice / 12;
      }
    });

    setOverviewStats({
      totalUsers: totalCount || 0,
      premiumUsers: premiumCount || 0,
      activeToday: activeCount || 0,
      mrr: totalMrr,
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUserStats(), fetchOpenRouterUsage(), fetchOverviewStats()]);
    } catch (error) {
      logger.error("[AdminDashboard] Error fetching dashboard data", { error });
      notifications.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [fetchUserStats, fetchOpenRouterUsage, fetchOverviewStats]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    users,
    loading,
    openRouterStats,
    overviewStats,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    refresh: fetchDashboardData,
    refetchUserStats: fetchUserStats,
    refetchOverviewStats: fetchOverviewStats,
  };
}
