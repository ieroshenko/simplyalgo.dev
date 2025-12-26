import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import type { AdminOverviewStats, OpenRouterUsage } from "../types/admin.types";

interface OverviewCardsProps {
  stats: AdminOverviewStats;
  openRouterStats: OpenRouterUsage | null;
}

export function OverviewCards({ stats, openRouterStats }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            {stats.premiumUsers} premium users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">MRR</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.mrr.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Monthly recurring revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Today</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeToday}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalUsers > 0
              ? Math.round((stats.activeToday / stats.totalUsers) * 100)
              : 0}
            % of total users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">OpenRouter Credits</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${openRouterStats?.credits_remaining.toFixed(2) || "0.00"}
          </div>
          <p className="text-xs text-muted-foreground">
            ${openRouterStats?.credits_used.toFixed(2) || "0.00"} total used
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${openRouterStats?.credits_total.toFixed(2) || "0.00"}
          </div>
          <p className="text-xs text-muted-foreground">Total allocation</p>
        </CardContent>
      </Card>
    </div>
  );
}
