import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign } from "lucide-react";
import type { OpenRouterUsage } from "../types/admin.types";

interface ApiUsageTabProps {
  openRouterStats: OpenRouterUsage | null;
}

export function ApiUsageTab({ openRouterStats }: ApiUsageTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenRouter API Usage</CardTitle>
        <CardDescription>
          Monitor your OpenRouter credits and usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Credits Remaining
              </span>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              ${openRouterStats?.credits_remaining.toFixed(2) || "0.00"}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Credits</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              ${openRouterStats?.credits_total.toFixed(2) || "0.00"}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Credits Used</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              ${openRouterStats?.credits_used.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>

        {openRouterStats?.credits_total === 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              OpenRouter credits not available. Make sure you have set the
              OPENROUTER_API_KEY in your Supabase secrets.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
