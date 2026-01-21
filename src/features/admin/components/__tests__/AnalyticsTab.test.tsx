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

const emptyStats: AdminAnalyticsStats = {
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
    cancellationsDates: [],
    subscriptionJoinDates: [],
    userJoinTimeline: [],
    cancellationsTimeline: [],
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

  describe("Engagement metrics", () => {
    it("displays DAU, WAU, and MAU values correctly", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      // 120 appears multiple times (DAU, dueNow, active subscriptions)
      const dau120Elements = screen.getAllByText("120");
      expect(dau120Elements.length).toBeGreaterThan(0);
      expect(screen.getByText("540")).toBeInTheDocument(); // WAU
      expect(screen.getByText("2.1K")).toBeInTheDocument(); // MAU (2100 formatted)
    });

    it("displays retention percentages correctly", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("42%")).toBeInTheDocument(); // 7d retention
      expect(screen.getByText("28%")).toBeInTheDocument(); // 30d retention
    });
  });

  describe("AI Usage metrics", () => {
    it("displays token count and cost correctly", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("1.5M")).toBeInTheDocument(); // tokens30d formatted
      expect(screen.getByText("$420.50")).toBeInTheDocument(); // cost30d
    });

    it("displays session count correctly", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("680")).toBeInTheDocument(); // sessions30d
    });

    it("displays feature breakdown", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("Usage by Feature")).toBeInTheDocument();
      expect(screen.getByText("chat")).toBeInTheDocument();
      expect(screen.getByText("coach")).toBeInTheDocument();
    });
  });

  describe("Problem metrics", () => {
    it("displays pass rate as percentage", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("58%")).toBeInTheDocument(); // passRate30d
    });

    it("displays attempt count", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("1.2K")).toBeInTheDocument(); // attempts30d formatted
    });
  });

  describe("Subscription metrics", () => {
    it("displays subscription counts correctly", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      // Use getAllByText for values that appear multiple times
      const activeElements = screen.getAllByText("120");
      expect(activeElements.length).toBeGreaterThan(0); // Active subscriptions (and DAU and dueNow)
      // Trialing shows as 18 - may appear multiple times
      const trialingElements = screen.getAllByText("18");
      expect(trialingElements.length).toBeGreaterThan(0);
      // Cancelled shows as 6
      const cancelledElements = screen.getAllByText("6");
      expect(cancelledElements.length).toBeGreaterThan(0);
    });

    it("displays churn metrics", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      // new30d = 25
      const newElements = screen.getAllByText("25");
      expect(newElements.length).toBeGreaterThan(0);
      // churned30d = 4 (may also match openCount)
      const churnElements = screen.getAllByText("4");
      expect(churnElements.length).toBeGreaterThan(0);
    });
  });

  describe("Empty state handling", () => {
    it("handles empty data gracefully", () => {
      render(<AnalyticsTab stats={emptyStats} loading={false} />);

      // Should still render sections
      expect(screen.getByText("Engagement")).toBeInTheDocument();
      expect(screen.getByText("AI Usage")).toBeInTheDocument();

      // Should show "No data available" for empty breakdowns
      const noDataMessages = screen.getAllByText("No data available");
      expect(noDataMessages.length).toBeGreaterThan(0);
    });

    it("shows zero values without crashing", () => {
      render(<AnalyticsTab stats={emptyStats} loading={false} />);

      // Multiple 0s should be present
      const zeroElements = screen.getAllByText("0");
      expect(zeroElements.length).toBeGreaterThan(0);

      // Zero percentage
      expect(screen.getAllByText("0%").length).toBeGreaterThan(0);
    });
  });

  describe("Learning Tools metrics", () => {
    it("displays flashcard deck count", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("430")).toBeInTheDocument(); // decksTotal
    });

    it("displays behavioral session count with completed helper", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("75")).toBeInTheDocument(); // behavioral sessions started
      expect(screen.getByText("60 completed")).toBeInTheDocument(); // helper text
    });

    it("displays mock interview metrics", () => {
      render(<AnalyticsTab stats={mockStats} loading={false} />);

      expect(screen.getByText("42")).toBeInTheDocument(); // mock interviews started
      expect(screen.getByText("30 completed")).toBeInTheDocument(); // helper text
    });
  });
});
