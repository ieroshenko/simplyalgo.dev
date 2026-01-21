import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAsyncOperation } from "@/shared/hooks/useAsyncOperation";
import { logger } from "@/utils/logger";
import type {
  AdminAnalyticsStats,
  AnalyticsBreakdownItem,
  AnalyticsTimeSeriesPoint,
  AnalyticsTimelinePoint,
} from "../types/admin.types";

interface AiUsageRow {
  user_id: string | null;
  session_id: string | null;
  tokens_total: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  estimated_cost: number | null;
  model: string | null;
  feature: string | null;
  created_at: string;
}

interface SessionRow {
  user_id: string | null;
  created_at: string;
}

interface AttemptRow {
  problem_id: string | null;
  status: string | null;
}

interface StreakRow {
  current_streak: number | null;
  max_streak: number | null;
  last_activity_date: string | null;
}

interface PracticeSessionRow {
  completed_at: string | null;
  average_score: number | null;
}

interface InterviewSessionRow {
  status?: string | null;
  passed?: boolean | null;
  overall_score?: number | null;
}

interface FeedbackRow {
  status: string | null;
  created_at: string;
}

interface SubscriptionRow {
  status: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ANALYTICS: AdminAnalyticsStats = {
  engagement: {
    dau: 0,
    wau: 0,
    mau: 0,
    newUsers30d: 0,
    retention7d: 0,
    retention30d: 0,
  },
  aiUsage: {
    tokens30d: 0,
    cost30d: 0,
    sessions30d: 0,
    avgMessagesPerSession: 0,
    featureBreakdown: [],
    modelBreakdown: [],
    dailySeries: [],
  },
  problems: {
    attempts30d: 0,
    passRate30d: 0,
    uniqueProblems30d: 0,
    avgAttemptsPerProblem: 0,
    topProblems: [],
  },
  streaks: {
    averageCurrentStreak: 0,
    maxStreak: 0,
    atRiskUsers: 0,
  },
  flashcards: {
    decksTotal: 0,
    reviews30d: 0,
    dueNow: 0,
    avgMastery: 0,
  },
  behavioral: {
    sessionsStarted30d: 0,
    sessionsCompleted30d: 0,
    avgScore30d: 0,
  },
  mockInterviews: {
    sessionsStarted30d: 0,
    sessionsCompleted30d: 0,
    avgScore30d: 0,
  },
  content: {
    questionsAdded30d: 0,
    solutionsAdded30d: 0,
    storiesAdded30d: 0,
    storyReuseRate30d: 0,
  },
  feedback: {
    newFeedback30d: 0,
    openCount: 0,
    resolvedCount: 0,
  },
  subscriptions: {
    active: 0,
    trialing: 0,
    cancelled: 0,
    pastDue: 0,
    new30d: 0,
    churned30d: 0,
    userJoinDates: [],
    subscriptionJoinDates: [],
    cancellationsDates: [],
    userJoinTimeline: [],
    cancellationsTimeline: [],
  },
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, offset: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + offset);
  return copy;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const buildSeries = (days: number): AnalyticsTimeSeriesPoint[] => {
  const today = startOfDay(new Date());
  const series: AnalyticsTimeSeriesPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    series.push({
      date: toDateKey(date),
      tokens: 0,
      cost: 0,
      sessions: 0,
      activeUsers: 0,
    });
  }

  return series;
};

const mapToBreakdown = (map: Map<string, number>, limit = 6): AnalyticsBreakdownItem[] => {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
};

const getResolutionKey = (date: Date, resolution: "day" | "month" | "year") => {
  if (resolution === "year") {
    return `${date.getFullYear()}`;
  }
  if (resolution === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return toDateKey(date);
};

const aggregateTimeline = (
  dates: string[],
  resolution: "day" | "month" | "year"
): AnalyticsTimelinePoint[] => {
  const counts = new Map<string, number>();
  dates.forEach((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const key = getResolutionKey(date, resolution);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
};

export const useAdminAnalytics = () => {
  const { data, loading, execute } = useAsyncOperation<AdminAnalyticsStats>({
    initialData: DEFAULT_ANALYTICS,
  });

  const fetchAnalytics = useCallback(async (): Promise<AdminAnalyticsStats> => {
    const now = new Date();
    const start1d = startOfDay(now).toISOString();
    const start7d = startOfDay(addDays(now, -7)).toISOString();
    const start30d = startOfDay(addDays(now, -30)).toISOString();

    const activitySources = [
      { table: "ai_chat_sessions", dateColumn: "created_at" },
      { table: "coaching_sessions", dateColumn: "started_at" },
      { table: "user_problem_attempts", dateColumn: "created_at" },
      { table: "practice_sessions", dateColumn: "started_at" },
      { table: "behavioral_interview_sessions", dateColumn: "started_at" },
    ];

    const fetchActiveUsers = async (since: string) => {
      const results = await Promise.all(
        activitySources.map((source) =>
          supabase.from(source.table).select("user_id").gte(source.dateColumn, since)
        )
      );

      const ids = new Set<string>();
      results.forEach(({ data: rows, error }) => {
        if (error) throw error;
        (rows || []).forEach((row) => {
          if (row.user_id) ids.add(row.user_id);
        });
      });

      return ids;
    };

    const [active1d, active7d, active30d] = await Promise.all([
      fetchActiveUsers(start1d),
      fetchActiveUsers(start7d),
      fetchActiveUsers(start30d),
    ]);

    const { data: newUsersData, error: newUsersError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .gte("created_at", start30d);

    if (newUsersError) throw newUsersError;

    const newUserIds = new Set((newUsersData || []).map((user) => user.user_id));
    const retained7d = Array.from(newUserIds).filter((id) => active7d.has(id)).length;
    const retained30d = Array.from(newUserIds).filter((id) => active30d.has(id)).length;

    const [
      aiUsageResult,
      aiChatSessionsResult,
      aiChatMessagesResult,
      attemptsResult,
      streaksResult,
      decksCountResult,
      decksDueResult,
      deckMasteryResult,
      reviewsCountResult,
      practiceSessionsResult,
      mockSessionsResult,
      mockScoresResult,
      behavioralQuestionsResult,
      problemSolutionsResult,
      storiesResult,
      practiceAnswersResult,
      feedbackResult,
      userProfilesResult,
      subscriptionsResult,
    ] = await Promise.all([
      supabase
        .from("user_ai_usage")
        .select(
          "user_id, session_id, tokens_total, tokens_input, tokens_output, estimated_cost, model, feature, created_at"
        )
        .gte("created_at", start30d),
      supabase
        .from("ai_chat_sessions")
        .select("id, created_at", { count: "exact" })
        .gte("created_at", start30d),
      supabase
        .from("ai_chat_messages")
        .select("id", { count: "exact" })
        .gte("created_at", start30d),
      supabase
        .from("user_problem_attempts")
        .select("problem_id, status")
        .gte("created_at", start30d),
      supabase
        .from("user_statistics")
        .select("current_streak, max_streak, last_activity_date"),
      supabase.from("flashcard_decks").select("id", { count: "exact", head: true }),
      supabase
        .from("flashcard_decks")
        .select("id", { count: "exact", head: true })
        .lte("next_review_date", toDateKey(now)),
      supabase.from("flashcard_decks").select("mastery_level"),
      supabase
        .from("flashcard_reviews")
        .select("id", { count: "exact", head: true })
        .gte("reviewed_at", start30d),
      supabase
        .from("practice_sessions")
        .select("completed_at, average_score")
        .gte("started_at", start30d),
      supabase
        .from("mock_interviews")
        .select("completed_at")
        .gte("started_at", start30d),
      supabase
        .from("mock_interview_answers")
        .select("overall_score")
        .gte("created_at", start30d),
      supabase
        .from("behavioral_questions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start30d),
      supabase
        .from("problem_solutions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start30d),
      supabase
        .from("user_stories")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start30d),
      supabase
        .from("practice_answers")
        .select("id, story_id")
        .gte("created_at", start30d),
      supabase.from("feedback").select("status, created_at"),
      supabase.from("user_profiles").select("created_at"),
      supabase.from("user_subscriptions").select("status, created_at, updated_at"),
    ]);

    if (aiUsageResult.error) throw aiUsageResult.error;
    if (aiChatSessionsResult.error) throw aiChatSessionsResult.error;
    if (aiChatMessagesResult.error) throw aiChatMessagesResult.error;
    if (attemptsResult.error) throw attemptsResult.error;
    if (streaksResult.error) throw streaksResult.error;
    if (decksCountResult.error) throw decksCountResult.error;
    if (decksDueResult.error) throw decksDueResult.error;
    if (deckMasteryResult.error) throw deckMasteryResult.error;
    if (reviewsCountResult.error) throw reviewsCountResult.error;
    if (practiceSessionsResult.error) throw practiceSessionsResult.error;
    if (mockSessionsResult.error) throw mockSessionsResult.error;
    if (mockScoresResult.error) throw mockScoresResult.error;
    if (behavioralQuestionsResult.error) throw behavioralQuestionsResult.error;
    if (problemSolutionsResult.error) throw problemSolutionsResult.error;
    if (storiesResult.error) throw storiesResult.error;
    if (practiceAnswersResult.error) throw practiceAnswersResult.error;
    if (feedbackResult.error) throw feedbackResult.error;
    if (userProfilesResult.error) throw userProfilesResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;

    const aiUsageRows = (aiUsageResult.data || []) as AiUsageRow[];
    const aiChatSessions = (aiChatSessionsResult.data || []) as SessionRow[];
    const aiChatMessagesCount = aiChatMessagesResult.count || 0;

    const tokens30d = aiUsageRows.reduce(
      (sum, row) => sum + (row.tokens_total || 0),
      0
    );
    const cost30d = aiUsageRows.reduce(
      (sum, row) => sum + (row.estimated_cost || 0),
      0
    );

    const sessionIdSet = new Set<string>();
    const featureMap = new Map<string, number>();
    const modelMap = new Map<string, number>();

    const dailySeries = buildSeries(30);
    const dailyMap = new Map<string, AnalyticsTimeSeriesPoint>();
    const dailyUserMap = new Map<string, Set<string>>();
    const dailySessionMap = new Map<string, Set<string>>();
    dailySeries.forEach((point) => {
      dailyMap.set(point.date, point);
    });

    aiUsageRows.forEach((row) => {
      if (row.session_id) sessionIdSet.add(row.session_id);
      const feature = row.feature || "unknown";
      const model = row.model || "unknown";
      featureMap.set(feature, (featureMap.get(feature) || 0) + (row.tokens_total || 0));
      modelMap.set(model, (modelMap.get(model) || 0) + (row.tokens_total || 0));

      const dateKey = row.created_at.slice(0, 10);
      const point = dailyMap.get(dateKey);
      if (point) {
        point.tokens += row.tokens_total || 0;
        point.cost += row.estimated_cost || 0;
        if (row.session_id) {
          const sessionSet = dailySessionMap.get(dateKey) || new Set<string>();
          sessionSet.add(row.session_id);
          dailySessionMap.set(dateKey, sessionSet);
        }
        if (row.user_id) {
          const userSet = dailyUserMap.get(dateKey) || new Set<string>();
          userSet.add(row.user_id);
          dailyUserMap.set(dateKey, userSet);
        }
      }
    });

    dailySeries.forEach((point) => {
      point.sessions = dailySessionMap.get(point.date)?.size || 0;
      point.activeUsers = dailyUserMap.get(point.date)?.size || 0;
    });

    const aiSessions30d = sessionIdSet.size || aiChatSessionsResult.count || 0;
    const avgMessagesPerSession =
      aiSessions30d > 0 ? aiChatMessagesCount / aiSessions30d : 0;

    const attemptsRows = (attemptsResult.data || []) as AttemptRow[];
    const attempts30d = attemptsRows.length;
    const passedAttempts = attemptsRows.filter((row) => row.status === "passed").length;
    const uniqueProblems = new Set(
      attemptsRows.map((row) => row.problem_id).filter(Boolean) as string[]
    );
    const problemMap = new Map<string, number>();
    attemptsRows.forEach((row) => {
      if (!row.problem_id) return;
      problemMap.set(row.problem_id, (problemMap.get(row.problem_id) || 0) + 1);
    });

    const streakRows = (streaksResult.data || []) as StreakRow[];
    const currentStreaks = streakRows.map((row) => row.current_streak || 0);
    const maxStreak = Math.max(0, ...streakRows.map((row) => row.max_streak || 0));
    const atRiskCutoff = startOfDay(addDays(now, -3));
    const atRiskUsers = streakRows.filter((row) => {
      if (!row.last_activity_date) return false;
      return (
        (row.current_streak || 0) > 0 &&
        new Date(row.last_activity_date) < atRiskCutoff
      );
    }).length;

    const masteryRows = deckMasteryResult.data || [];
    const masteryValues = masteryRows
      .map((row) => row.mastery_level)
      .filter((value): value is number => typeof value === "number");

    const practiceSessions = (practiceSessionsResult.data || []) as PracticeSessionRow[];
    const practiceCompletedScores = practiceSessions
      .map((session) => session.average_score)
      .filter((score): score is number => typeof score === "number");

    const mockSessions = (mockSessionsResult.data || []) as PracticeSessionRow[];
    const mockScores = (mockScoresResult.data || [])
      .map((row) => row.overall_score)
      .filter((score): score is number => typeof score === "number");

    const practiceAnswers = practiceAnswersResult.data || [];
    const totalPracticeAnswers = practiceAnswers.length;
    const practiceWithStory = practiceAnswers.filter((row) => row.story_id).length;

    const feedbackRows = (feedbackResult.data || []) as FeedbackRow[];
    const feedbackRecent = feedbackRows.filter(
      (row) => row.created_at >= start30d
    );

    const subscriptionRows = (subscriptionsResult.data || []) as SubscriptionRow[];
    const newSubscriptions30d = subscriptionRows.filter(
      (row) => row.created_at >= start30d
    ).length;
    const churned30d = subscriptionRows.filter(
      (row) => row.status === "cancelled" && row.updated_at >= start30d
    ).length;
    const userJoinDates = (userProfilesResult.data || []).map(
      (row) => row.created_at
    );
    const subscriptionJoinDates = subscriptionRows.map((row) => row.created_at);
    const cancellationsDates = subscriptionRows
      .filter((row) => row.status === "cancelled")
      .map((row) => row.updated_at);

    return {
      engagement: {
        dau: active1d.size,
        wau: active7d.size,
        mau: active30d.size,
        newUsers30d: newUserIds.size,
        retention7d: newUserIds.size > 0 ? retained7d / newUserIds.size : 0,
        retention30d: newUserIds.size > 0 ? retained30d / newUserIds.size : 0,
      },
      aiUsage: {
        tokens30d,
        cost30d,
        sessions30d: aiSessions30d,
        avgMessagesPerSession,
        featureBreakdown: mapToBreakdown(featureMap),
        modelBreakdown: mapToBreakdown(modelMap),
        dailySeries,
      },
      problems: {
        attempts30d,
        passRate30d: attempts30d > 0 ? passedAttempts / attempts30d : 0,
        uniqueProblems30d: uniqueProblems.size,
        avgAttemptsPerProblem:
          uniqueProblems.size > 0 ? attempts30d / uniqueProblems.size : 0,
        topProblems: mapToBreakdown(problemMap),
      },
      streaks: {
        averageCurrentStreak: average(currentStreaks),
        maxStreak,
        atRiskUsers,
      },
      flashcards: {
        decksTotal: decksCountResult.count || 0,
        reviews30d: reviewsCountResult.count || 0,
        dueNow: decksDueResult.count || 0,
        avgMastery: average(masteryValues),
      },
      behavioral: {
        sessionsStarted30d: practiceSessions.length,
        sessionsCompleted30d: practiceSessions.filter((row) => row.completed_at).length,
        avgScore30d: average(practiceCompletedScores),
      },
      mockInterviews: {
        sessionsStarted30d: mockSessions.length,
        sessionsCompleted30d: mockSessions.filter((row) => row.completed_at).length,
        avgScore30d: average(mockScores),
      },
      content: {
        questionsAdded30d: behavioralQuestionsResult.count || 0,
        solutionsAdded30d: problemSolutionsResult.count || 0,
        storiesAdded30d: storiesResult.count || 0,
        storyReuseRate30d:
          totalPracticeAnswers > 0 ? practiceWithStory / totalPracticeAnswers : 0,
      },
      feedback: {
        newFeedback30d: feedbackRecent.length,
        openCount: feedbackRows.filter((row) =>
          ["open", "in_progress"].includes(row.status || "")
        ).length,
        resolvedCount: feedbackRows.filter((row) =>
          ["resolved", "closed"].includes(row.status || "")
        ).length,
      },
      subscriptions: {
        active: subscriptionRows.filter((row) => row.status === "active").length,
        trialing: subscriptionRows.filter((row) => row.status === "trialing").length,
        cancelled: subscriptionRows.filter((row) => row.status === "cancelled").length,
        pastDue: subscriptionRows.filter((row) => row.status === "past_due").length,
        new30d: newSubscriptions30d,
        churned30d,
        userJoinDates,
        subscriptionJoinDates,
        cancellationsDates,
        userJoinTimeline: aggregateTimeline(userJoinDates, "month"),
        cancellationsTimeline: aggregateTimeline(cancellationsDates, "month"),
      },
    };
  }, []);

  const loadAnalytics = useCallback(async () => {
    await execute(fetchAnalytics, {
      errorMessage: "Failed to load analytics",
      onError: (error) => {
        logger.error("[AdminAnalytics] Failed to load analytics", {
          error: error.message,
        });
      },
    });
  }, [execute, fetchAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics: data || DEFAULT_ANALYTICS,
    loading,
    refresh: loadAnalytics,
  };
};
