import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { supabase } from "@/integrations/supabase/client";

const ProgressRadar = () => {
  const { user } = useAuth();
  const { stats } = useUserStats(user?.id);

  const [totalProblems, setTotalProblems] = useState<number>(0);

  useEffect(() => {
    const fetchTotals = async () => {
      const { count, error } = await supabase
        .from("problems")
        .select("id", { count: "exact", head: true });
      if (!error && typeof count === "number") {
        setTotalProblems(count);
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
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            {/* Outer ring */}
            <svg
              className="w-32 h-32 transform -rotate-90"
              viewBox="0 0 144 144"
            >
              {/* Background circle */}
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${overallPercent * 4.02} 402`}
                className="transition-all duration-300"
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {overallPercent}%
                </div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
            </div>
          </div>

          <div className="text-lg font-semibold text-foreground mb-2">
            Progress
          </div>
          <div className="text-sm text-muted-foreground text-center">
            {stats.totalSolved} solved out of {totalProblems}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressRadar;
