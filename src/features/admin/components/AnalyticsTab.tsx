import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, Users, Calendar, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Brush,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  AdminAnalyticsStats,
  AnalyticsBreakdownItem,
  AnalyticsResolution,
  AnalyticsTimelinePoint,
} from "../types/admin.types";

interface AnalyticsTabProps {
  stats: AdminAnalyticsStats;
  loading: boolean;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const formatNumber = (value: number) => numberFormatter.format(value);
const formatPercent = (value: number) => percentFormatter.format(value);

const MetricCard = ({
  label,
  value,
  helper,
  trend,
}: {
  label: string;
  value: string;
  helper?: string;
  trend?: { value: string; positive: boolean };
}) => (
  <Card className="overflow-hidden relative group transition-all duration-300 hover:shadow-lg hover:border-primary/20">
    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
      <BarChart3 className="w-12 h-12" />
    </div>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-end gap-2">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className={cn(
            "text-xs font-medium mb-1",
            trend.positive ? "text-emerald-500" : "text-rose-500"
          )}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </div>
        )}
      </div>
      {helper ? <p className="text-xs text-muted-foreground mt-1.5 font-medium">{helper}</p> : null}
    </CardContent>
  </Card>
);

const BreakdownList = ({ title, items }: { title: string; items: AnalyticsBreakdownItem[] }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data available</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{formatNumber(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const aggregateTimeline = (
  dates: string[] | undefined,
  resolution: AnalyticsResolution
): AnalyticsTimelinePoint[] => {
  if (!dates || !Array.isArray(dates)) {
    return [];
  }
  const counts = new Map<string, number>();
  dates.forEach((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const key =
      resolution === "year"
        ? `${date.getFullYear()}`
        : resolution === "month"
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          : date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <Card key={`analytics-skeleton-${index}`}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32 mt-2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const AnalyticsTab = ({ stats, loading }: AnalyticsTabProps) => {
  const [resolution, setResolution] = useState<AnalyticsResolution>("month");
  const joinDates = stats?.subscriptions?.userJoinDates ?? [];
  const cancellationDates = stats?.subscriptions?.cancellationsDates ?? [];
  const premiumJoinDates = stats?.subscriptions?.subscriptionJoinDates ?? [];

  const joinTimeline = useMemo(
    () => aggregateTimeline(joinDates, resolution),
    [joinDates, resolution]
  );

  const cancellationsTimeline = useMemo(
    () => aggregateTimeline(cancellationDates, resolution),
    [cancellationDates, resolution]
  );

  const premiumsTimeline = useMemo(
    () => aggregateTimeline(premiumJoinDates, resolution),
    [premiumJoinDates, resolution]
  );

  const combinedTimeline = useMemo(() => {
    const joinMap = new Map(joinTimeline.map((point) => [point.date, point.count]));
    const premiumMap = new Map(premiumsTimeline.map((point) => [point.date, point.count]));
    const cancelMap = new Map(cancellationsTimeline.map((point) => [point.date, point.count]));
    const allDates = new Set([
      ...joinTimeline.map((p) => p.date),
      ...premiumsTimeline.map((p) => p.date),
      ...cancellationsTimeline.map((p) => p.date),
    ]);

    return Array.from(allDates)
      .sort()
      .map((date) => {
        const joins = joinMap.get(date) || 0;
        const premiums = premiumMap.get(date) || 0;
        const cancels = cancelMap.get(date) || 0;
        return {
          date,
          joins,
          premiums,
          cancels,
          net: joins - cancels,
        };
      });
  }, [joinTimeline, premiumsTimeline, cancellationsTimeline]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonGrid />
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Engagement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard label="DAU" value={formatNumber(stats.engagement.dau)} />
          <MetricCard label="WAU" value={formatNumber(stats.engagement.wau)} />
          <MetricCard label="MAU" value={formatNumber(stats.engagement.mau)} />
          <MetricCard
            label="New Users (30d)"
            value={formatNumber(stats.engagement.newUsers30d)}
          />
          <MetricCard
            label="Retention (7d)"
            value={formatPercent(stats.engagement.retention7d)}
          />
          <MetricCard
            label="Retention (30d)"
            value={formatPercent(stats.engagement.retention30d)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">AI Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Tokens (30d)" value={formatNumber(stats.aiUsage.tokens30d)} />
          <MetricCard label="Cost (30d)" value={`$${stats.aiUsage.cost30d.toFixed(2)}`} />
          <MetricCard label="Sessions (30d)" value={formatNumber(stats.aiUsage.sessions30d)} />
          <MetricCard
            label="Avg Messages/Session"
            value={stats.aiUsage.avgMessagesPerSession.toFixed(1)}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily AI Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  tokens: { label: "Tokens", color: "hsl(var(--chart-1))" },
                  sessions: { label: "Sessions", color: "hsl(var(--chart-2))" },
                }}
                className="h-56"
              >
                <LineChart data={stats.aiUsage.dailySeries}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={48} />
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="date" indicator="line" />}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="var(--color-tokens)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="var(--color-sessions)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <BreakdownList title="Usage by Feature" items={stats.aiUsage.featureBreakdown} />
            <BreakdownList title="Usage by Model" items={stats.aiUsage.modelBreakdown} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Practice & Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Attempts (30d)" value={formatNumber(stats.problems.attempts30d)} />
          <MetricCard label="Pass Rate" value={formatPercent(stats.problems.passRate30d)} />
          <MetricCard
            label="Unique Problems"
            value={formatNumber(stats.problems.uniqueProblems30d)}
          />
          <MetricCard
            label="Avg Attempts/Problem"
            value={stats.problems.avgAttemptsPerProblem.toFixed(1)}
          />
          <MetricCard label="At-Risk Streaks" value={formatNumber(stats.streaks.atRiskUsers)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Problems (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.problems.topProblems.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data available</p>
              ) : (
                <ChartContainer
                  config={{
                    attempts: { label: "Attempts", color: "hsl(var(--chart-3))" },
                  }}
                  className="h-56"
                >
                  <BarChart data={stats.problems.topProblems}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={48} />
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="label" indicator="line" />}
                    />
                    <Bar dataKey="value" fill="var(--color-attempts)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Streak Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Current Streak</span>
                <span className="font-medium">{stats.streaks.averageCurrentStreak.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Max Streak</span>
                <span className="font-medium">{formatNumber(stats.streaks.maxStreak)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">At-Risk Users</span>
                <span className="font-medium">{formatNumber(stats.streaks.atRiskUsers)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Learning Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Flashcard Decks" value={formatNumber(stats.flashcards.decksTotal)} />
          <MetricCard label="Reviews (30d)" value={formatNumber(stats.flashcards.reviews30d)} />
          <MetricCard label="Due Now" value={formatNumber(stats.flashcards.dueNow)} />
          <MetricCard
            label="Avg Mastery"
            value={stats.flashcards.avgMastery.toFixed(1)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Behavioral Sessions"
            value={formatNumber(stats.behavioral.sessionsStarted30d)}
            helper={`${stats.behavioral.sessionsCompleted30d} completed`}
          />
          <MetricCard
            label="Behavioral Avg Score"
            value={stats.behavioral.avgScore30d.toFixed(1)}
          />
          <MetricCard
            label="Mock Interviews"
            value={formatNumber(stats.mockInterviews.sessionsStarted30d)}
            helper={`${stats.mockInterviews.sessionsCompleted30d} completed`}
          />
          <MetricCard
            label="Mock Avg Score"
            value={stats.mockInterviews.avgScore30d.toFixed(1)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Content & Feedback</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Questions Added (30d)"
            value={formatNumber(stats.content.questionsAdded30d)}
          />
          <MetricCard
            label="Solutions Added (30d)"
            value={formatNumber(stats.content.solutionsAdded30d)}
          />
          <MetricCard
            label="Stories Added (30d)"
            value={formatNumber(stats.content.storiesAdded30d)}
          />
          <MetricCard
            label="Story Reuse Rate"
            value={formatPercent(stats.content.storyReuseRate30d)}
          />
          <MetricCard
            label="Feedback (30d)"
            value={formatNumber(stats.feedback.newFeedback30d)}
            helper={`${stats.feedback.openCount} open · ${stats.feedback.resolvedCount} resolved`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard label="Active" value={formatNumber(stats.subscriptions.active)} />
          <MetricCard label="Trialing" value={formatNumber(stats.subscriptions.trialing)} />
          <MetricCard label="Cancelled" value={formatNumber(stats.subscriptions.cancelled)} />
          <MetricCard label="Past Due" value={formatNumber(stats.subscriptions.pastDue)} />
          <MetricCard label="New (30d)" value={formatNumber(stats.subscriptions.new30d)} />
          <MetricCard label="Churned (30d)" value={formatNumber(stats.subscriptions.churned30d)} />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Join & Cancellation Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["year", "month", "day"] as const).map((option) => (
                <Button
                  key={option}
                  variant={resolution === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResolution(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="bg-muted/5 rounded-xl border p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Growth Performance
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analyzing registration and conversion velocity over time
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  <div className="flex items-center gap-1.5 border-r pr-4">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Joins
                  </div>
                  <div className="flex items-center gap-1.5 border-r pr-4">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Premiums
                  </div>
                  <div className="flex items-center gap-1.5 border-r pr-4">
                    <span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Cancels
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6366f1]" /> Net
                  </div>
                </div>
              </div>

              <div className="h-[420px] w-full">
                {combinedTimeline.length === 0 ? (
                  <div className="flex h-full items-center justify-center border border-dashed rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">No data available for the selected period</p>
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      joins: { label: "New Users", color: "#10b981" },
                      premiums: { label: "New Premiums", color: "#f59e0b" },
                      cancels: { label: "Cancellations", color: "#f43f5e" },
                      net: { label: "Net Growth", color: "#6366f1" },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart data={combinedTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorJoins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPremiums" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="4 4"
                        stroke="hsl(var(--border) / 0.4)"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        dy={15}
                        minTickGap={30}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={30}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <ChartTooltip
                        cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            className="bg-background/95 backdrop-blur-sm border-border shadow-2xl"
                          />
                        }
                      />
                      <Area
                        name="New Users"
                        type="monotone"
                        dataKey="joins"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorJoins)"
                        strokeWidth={2.5}
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                      <Bar
                        name="New Premiums"
                        dataKey="premiums"
                        fill="#f59e0b"
                        radius={[3, 3, 0, 0]}
                        barSize={18}
                        isAnimationActive={true}
                        animationDuration={1800}
                      />
                      <Line
                        name="Cancellations"
                        type="monotone"
                        dataKey="cancels"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0, stroke: "#fff" }}
                        isAnimationActive={true}
                      />
                      <Line
                        name="Net Growth"
                        type="monotone"
                        dataKey="net"
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        opacity={0.8}
                        isAnimationActive={true}
                      />
                      <Brush
                        dataKey="date"
                        height={35}
                        stroke="hsl(var(--border) / 0.5)"
                        fill="transparent"
                        travellerWidth={10}
                        className="mt-8"
                      />
                    </ComposedChart>
                  </ChartContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
