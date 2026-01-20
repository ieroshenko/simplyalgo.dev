import { render, screen, mockResizeObserver } from "@/test-utils";
import { describe, it, expect, beforeEach } from "vitest";
import { AnalyticsTab } from "../AnalyticsTab";
import type { AdminAnalyticsStats } from "../../types/admin.types";

const mockStats: AdminAnalyticsStats = {
  engagement: {
    dau: 120,
    wau: 540,
    mau: 2100,
    newUsers30d: 320,
    retention7d: 0.42,
    retention30d: 0.28,
  },
  aiUsage: {
    tokens30d: 1500000,
    cost30d: 420.5,
    sessions30d: 680,
    avgMessagesPerSession: 6.4,
    featureBreakdown: [
      { label: "chat", value: 900000 },
      { label: "coach", value: 600000 },
    ],
    modelBreakdown: [
      { label: "gpt-4o-mini", value: 800000 },
      { label: "gpt-4o", value: 700000 },
    ],
    dailySeries: [
      { date: "2025-01-01", tokens: 50000, cost: 12, sessions: 20, activeUsers: 12 },
      { date: "2025-01-02", tokens: 62000, cost: 14, sessions: 24, activeUsers: 16 },
    ],
  },
  problems: {
    attempts30d: 1200,
    passRate30d: 0.58,
    uniqueProblems30d: 180,
    avgAttemptsPerProblem: 6.7,
    topProblems: [
      { label: "two-sum", value: 120 },
      { label: "valid-parentheses", value: 95 },
    ],
  },
  streaks: {
    averageCurrentStreak: 3.2,
    maxStreak: 29,
    atRiskUsers: 14,
  },
  flashcards: {
    decksTotal: 430,
    reviews30d: 980,
    dueNow: 120,
    avgMastery: 2.1,
  },
  behavioral: {
    sessionsStarted30d: 75,
    sessionsCompleted30d: 60,
    avgScore30d: 82.3,
  },
  mockInterviews: {
    sessionsStarted30d: 42,
    sessionsCompleted30d: 30,
    avgScore30d: 79.1,
  },
  content: {
    questionsAdded30d: 12,
    solutionsAdded30d: 24,
    storiesAdded30d: 18,
    storyReuseRate30d: 0.38,
  },
  feedback: {
    newFeedback30d: 9,
    openCount: 4,
    resolvedCount: 5,
  },
  subscriptions: {
    active: 120,
    trialing: 18,
    cancelled: 6,
    pastDue: 3,
    new30d: 25,
    churned30d: 4,
    userJoinDates: ["2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z"],
    cancellationsDates: ["2025-01-03T00:00:00Z"],
    subscriptionJoinDates: ["2025-01-01T00:00:00Z"],
    userJoinTimeline: [
      { date: "2025-01", count: 2 },
    ],
    cancellationsTimeline: [
      { date: "2025-01", count: 1 },
    ],
  },
};

describe("AnalyticsTab", () => {
  beforeEach(() => {
    mockResizeObserver();
  });

  it("renders key sections and metrics", () => {
    render(<AnalyticsTab stats={mockStats} loading={false} />);

    expect(screen.getByText("Engagement")).toBeInTheDocument();
    expect(screen.getByText("AI Usage")).toBeInTheDocument();
    expect(screen.getByText("Practice & Performance")).toBeInTheDocument();
    expect(screen.getByText("Learning Tools")).toBeInTheDocument();
    expect(screen.getByText("Content & Feedback")).toBeInTheDocument();
    expect(screen.getByText("Subscriptions")).toBeInTheDocument();

    expect(screen.getByText("DAU")).toBeInTheDocument();
    expect(screen.getByText("Tokens (30d)")).toBeInTheDocument();
    expect(screen.getByText("Attempts (30d)")).toBeInTheDocument();
    expect(screen.getByText("Flashcard Decks")).toBeInTheDocument();
    expect(screen.getByText("User Join & Cancellation Timeline")).toBeInTheDocument();
  });

  it("shows loading state without sections", () => {
    render(<AnalyticsTab stats={mockStats} loading />);

    expect(screen.queryByText("Engagement")).not.toBeInTheDocument();
  });
});
