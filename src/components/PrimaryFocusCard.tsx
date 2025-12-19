import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserAttemptsService } from "@/services/userAttempts";
import { formatTimeAgo } from "@/lib/date";
import { useProblems } from "@/hooks/useProblems";

type LastActivity = {
  problemTitle: string;
  category: string;
  timeAgo: string;
  problemId: string;
} | null;

const PrimaryFocusCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { problems } = useProblems(user?.id);
  const [lastActivity, setLastActivity] = useState<LastActivity>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadLastActivity = async () => {
      if (!user?.id) {
        setLastActivity(null);
        setLoading(false);
        return;
      }

      try {
        const rows = await UserAttemptsService.getRecentActivity(user.id, 1);
        if (!mounted) return;

        if (rows.length > 0) {
          const lastAttempt = rows[0];
          const problem = problems.find(p => p.id === lastAttempt.problem_id);

          setLastActivity({
            problemTitle: lastAttempt.problem?.title ?? lastAttempt.problem_id,
            category: problem?.category ?? "Problem Solving",
            timeAgo: formatTimeAgo(lastAttempt.updated_at),
            problemId: lastAttempt.problem_id,
          });
        } else {
          setLastActivity(null);
        }
      } catch (error) {
        console.error("Error loading last activity:", error);
        setLastActivity(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLastActivity();
    return () => { mounted = false; };
  }, [user?.id, problems]);

  return (
    <div className="relative bg-gradient-to-br from-green-100/90 to-green-200/70 dark:from-green-950/40 dark:to-green-900/30 border border-green-300/50 dark:border-green-700/40 rounded-xl p-6 shadow-sm overflow-hidden">
      <div className="absolute inset-0 bg-grain opacity-[0.015] pointer-events-none" />

      <div className="relative space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">Active</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Continue Training</h2>
          <div className="flex items-center gap-2 text-sm">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : lastActivity ? (
              <>
                <span className="text-muted-foreground">Problem Solving</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold text-foreground">{lastActivity.category}</span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Problem Solving</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold text-foreground">Start your first problem</span>
              </>
            )}
          </div>
        </div>

        <div className="text-xs">
          {loading ? (
            <Skeleton className="h-3 w-32" />
          ) : lastActivity ? (
            <>
              <span className="text-muted-foreground">Last session: </span>
              <span className="font-semibold text-foreground">{lastActivity.timeAgo}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No recent activity</span>
          )}
        </div>

        <Button
          onClick={() => lastActivity ? navigate(`/problem/${lastActivity.problemId}`) : navigate("/problems")}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white w-full sm:w-auto shadow-sm hover:shadow transition-all"
        >
          {lastActivity ? "Resume training" : "Start training"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default PrimaryFocusCard;
