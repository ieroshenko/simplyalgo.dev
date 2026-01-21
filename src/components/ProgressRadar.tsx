import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const ProgressRadar = () => {
  const { user } = useAuth();
  const { stats } = useUserStats(user?.id);

  const [totalProblems, setTotalProblems] = useState<number>(0);

  useEffect(() => {
    const fetchTotals = async () => {
      // Fetch all problems with their categories to filter out non-algorithm problems
      const { data, error } = await supabase
        .from("problems")
        .select("id, categories!inner(name)");

      if (!error && data) {
        // Filter out System Design and Data Structure Implementations (same logic as technical interview)
        const algorithmProblems = data.filter((problem) => {
          const categoryName = (problem.categories as { name?: string })?.name || "";
          return (
            categoryName !== "System Design" &&
            categoryName !== "Data Structure Implementations" &&
            !problem.id.startsWith("sd_")
          );
        });
        setTotalProblems(algorithmProblems.length);
      }
    };
    fetchTotals();
  }, []);

  const overallPercent = useMemo(() => {
    if (!totalProblems || totalProblems <= 0) return 0;
    const solved = stats.totalSolved || 0;
    return Math.min(100, Math.round((solved / totalProblems) * 100));
  }, [stats.totalSolved, totalProblems]);

  return (
    <Card data-tour="progress-radar" className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-3">
            Progress
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-foreground">{stats.totalSolved}</span>
                <span className="text-sm text-muted-foreground">/ {totalProblems}</span>
              </div>
              <p className="text-xs text-muted-foreground">problems solved</p>
            </div>

            <div className="space-y-2">
              <Progress value={overallPercent} className="h-1.5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{overallPercent}% coverage</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressRadar;
