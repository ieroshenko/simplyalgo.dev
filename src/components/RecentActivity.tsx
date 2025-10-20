import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserAttemptsService } from "@/services/userAttempts";
import { formatTimeAgo } from "@/lib/date";

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
      const rows = await UserAttemptsService.getRecentActivity(user.id, 3);
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

  const quickActions = useMemo(
    () => [
      // {
      //   title: "Random Pattern Drill",
      //   icon: Plus,
      //   action: () => console.log("Random Pattern Drill"),
      // },
      // {
      //   title: "Random LC Problem",
      //   icon: Plus,
      //   action: () => console.log("Random LC Problem"),
      // },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent activity yet.</div>
          ) : (
            items.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/problem/${a.problem_id}`)}
                role="button"
                aria-label={`Open ${a.title}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {a.status === "passed"
                      ? "Solved"
                      : a.status === "failed"
                      ? "Attempt failed"
                      : "Attempted"}
                    : {a.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {a.difficulty ? `${a.difficulty} • ` : ""}
                    {formatTimeAgo(a.updated_at)}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
