import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserAttemptsService } from "@/services/userAttempts";
import { formatTimeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";

type ActivityItem = {
  id: string;
  problem_id: string;
  status: "pending" | "passed" | "failed" | "error" | null;
  updated_at: string;
  title: string;
  difficulty?: "Easy" | "Medium" | "Hard";
};

const RecentActivity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const rows = await UserAttemptsService.getRecentActivity(user.id, 4);
      if (!mounted) return;
      const mapped: ActivityItem[] = rows.map((r) => ({
        id: r.id,
        problem_id: r.problem_id,
        status: r.status,
        updated_at: r.updated_at,
        title: r.problem?.title ?? r.problem_id,
        difficulty: r.problem?.difficulty as ActivityItem["difficulty"],
      }));
      setItems(mapped);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-3">
            Recent Activity
          </h3>

          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-xs text-muted-foreground">No recent activity.</div>
            ) : (
              items.map((a) => (
                <button
                  key={a.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent/5 transition-colors group border border-transparent hover:border-border/40"
                  onClick={() => navigate(`/problem/${a.problem_id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate mb-1">
                        {a.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn(
                          "font-medium",
                          a.difficulty === "Easy" ? "text-green-600" :
                            a.difficulty === "Medium" ? "text-amber-600" : "text-red-600"
                        )}>
                          {a.difficulty}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(a.updated_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
