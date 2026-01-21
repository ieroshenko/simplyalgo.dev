import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  MessageSquare,
  Code,
  UserMinus,
  Gift,
  Bot,
  Ban,
  Clock,
  Settings,
  Zap,
  RotateCcw,
} from "lucide-react";
import type { UserStats, DialogUserInfo } from "../types/admin.types";
import {
  formatTokens,
  getUsagePercentage,
  getUsageColor,
  formatDate,
  formatDateTime,
} from "../utils/adminUtils";

interface UserCardProps {
  user: UserStats;
  onGrantPremium: (userId: string, email: string) => void;
  onRevokePremium: (userId: string, email: string) => void;
  onDeleteUser: (userId: string, email: string) => void;
  onToggleAIAccess: (
    userId: string,
    email: string,
    feature: "ai_coach" | "ai_chat",
    enabled: boolean
  ) => void;
  onRemoveCooldown: (userId: string, email: string) => void;
  onOpenCooldownDialog: (user: DialogUserInfo) => void;
  onOpenLimitsDialog: (user: DialogUserInfo, dailyLimit: number, monthlyLimit: number) => void;
  onResetSurvey?: (userId: string, email: string) => void;
}

export function UserCard({
  user,
  onGrantPremium,
  onRevokePremium,
  onDeleteUser,
  onToggleAIAccess,
  onRemoveCooldown,
  onOpenCooldownDialog,
  onOpenLimitsDialog,
  onResetSurvey,
}: UserCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          {/* User Header */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{user.email}</h3>
            {user.is_premium && (
              <Badge variant="default" className="bg-yellow-500">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          {/* User Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Active</p>
              <p className="font-medium">{formatDate(user.last_active)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Problems Solved</p>
              <p className="font-medium">{user.problems_solved}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Activity</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span className="font-medium">{user.chat_messages}</span>
                </div>
                <div className="flex items-center">
                  <Code className="h-3 w-3 mr-1" />
                  <span className="font-medium">{user.coaching_sessions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Problems */}
          {user.recent_problems.length > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground">Recent Problems:</p>
              <p className="font-mono text-xs">
                {user.recent_problems.slice(0, 3).join(", ")}
              </p>
            </div>
          )}

          {/* AI Access Controls */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI Access Controls</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {/* AI Coach Toggle */}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">AI Coach</span>
                <Button
                  variant={
                    user.ai_restriction?.ai_coach_enabled !== false
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    onToggleAIAccess(
                      user.id,
                      user.email,
                      "ai_coach",
                      user.ai_restriction?.ai_coach_enabled === false
                    )
                  }
                >
                  {user.ai_restriction?.ai_coach_enabled !== false ? (
                    <>
                      <Zap className="h-3 w-3 mr-1" /> Enabled
                    </>
                  ) : (
                    <>
                      <Ban className="h-3 w-3 mr-1" /> Disabled
                    </>
                  )}
                </Button>
              </div>

              {/* AI Chat Toggle */}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">AI Chat</span>
                <Button
                  variant={
                    user.ai_restriction?.ai_chat_enabled !== false
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    onToggleAIAccess(
                      user.id,
                      user.email,
                      "ai_chat",
                      user.ai_restriction?.ai_chat_enabled === false
                    )
                  }
                >
                  {user.ai_restriction?.ai_chat_enabled !== false ? (
                    <>
                      <MessageSquare className="h-3 w-3 mr-1" /> Enabled
                    </>
                  ) : (
                    <>
                      <Ban className="h-3 w-3 mr-1" /> Disabled
                    </>
                  )}
                </Button>
              </div>

              {/* Daily Usage */}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Daily Usage</span>
                <div className="flex flex-col gap-1">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUsageColor(
                        getUsagePercentage(
                          user.ai_usage?.tokens_today || 0,
                          user.ai_restriction?.daily_limit_tokens || 100000
                        )
                      )}`}
                      style={{
                        width: `${getUsagePercentage(
                          user.ai_usage?.tokens_today || 0,
                          user.ai_restriction?.daily_limit_tokens || 100000
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono">
                    {formatTokens(user.ai_usage?.tokens_today || 0)} /{" "}
                    {formatTokens(user.ai_restriction?.daily_limit_tokens || 100000)}
                  </span>
                </div>
              </div>

              {/* Monthly Usage */}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Monthly Usage</span>
                <div className="flex flex-col gap-1">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUsageColor(
                        getUsagePercentage(
                          user.ai_usage?.tokens_month || 0,
                          user.ai_restriction?.monthly_limit_tokens || 2000000
                        )
                      )}`}
                      style={{
                        width: `${getUsagePercentage(
                          user.ai_usage?.tokens_month || 0,
                          user.ai_restriction?.monthly_limit_tokens || 2000000
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono">
                    {formatTokens(user.ai_usage?.tokens_month || 0)} /{" "}
                    {formatTokens(user.ai_restriction?.monthly_limit_tokens || 2000000)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cooldown Status */}
            {user.ai_restriction?.cooldown_until &&
              new Date(user.ai_restriction.cooldown_until) > new Date() && (
                <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-800 dark:text-yellow-200">
                      Cooldown until{" "}
                      {formatDateTime(user.ai_restriction.cooldown_until)}
                      {user.ai_restriction.cooldown_reason &&
                        ` - ${user.ai_restriction.cooldown_reason}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onRemoveCooldown(user.id, user.email)}
                  >
                    Remove
                  </Button>
                </div>
              )}

            {/* Quick Actions */}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() =>
                  onOpenCooldownDialog({ id: user.id, email: user.email })
                }
              >
                <Clock className="h-3 w-3 mr-1" /> Cooldown
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() =>
                  onOpenLimitsDialog(
                    { id: user.id, email: user.email },
                    user.ai_restriction?.daily_limit_tokens || 100000,
                    user.ai_restriction?.monthly_limit_tokens || 2000000
                  )
                }
              >
                <Settings className="h-3 w-3 mr-1" /> Set Limits
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 ml-4">
          {user.is_premium ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevokePremium(user.id, user.email)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Revoke Premium
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onGrantPremium(user.id, user.email)}
            >
              <Gift className="h-4 w-4 mr-1" />
              Grant Premium
            </Button>
          )}
          {onResetSurvey && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResetSurvey(user.id, user.email)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset Survey
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteUser(user.id, user.email)}
          >
            <UserMinus className="h-4 w-4 mr-1" />
            Delete User
          </Button>
        </div>
      </div>
    </Card>
  );
}
