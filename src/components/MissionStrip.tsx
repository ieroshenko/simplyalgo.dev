import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { Skeleton } from "@/components/ui/skeleton";

const MissionStrip = () => {
  const { user } = useAuth();
  const { stats, loading } = useUserStats(user?.id);

  return (
    <div className="border-b border-border/20 px-6 py-4">
      <div className="flex items-center gap-8 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status:</span>
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground uppercase">Active</span>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Focus:</span>
          <span className="text-xs font-semibold text-foreground uppercase">Interview</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Streak:</span>
          <span className="text-xs font-semibold text-foreground">
            {loading ? <Skeleton className="h-4 w-6 inline-block" /> : `${stats.streak} days`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MissionStrip;
