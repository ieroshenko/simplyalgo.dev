import { Flame, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";

const MissionStrip = () => {
  const { user } = useAuth();
  const { stats, loading } = useUserStats(user?.id);
  return (
    <div className="bg-secondary/50 p-4 mx-6 mt-6 rounded-lg border border-secondary">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Welcome back!
        </h2>
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">Progress</div>
          <div className="text-sm text-muted-foreground">
            Keep pushing forward!
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-8 mt-2">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-accent" />
          <span className="font-semibold text-foreground">
            Streak: {loading ? "..." : stats.streak}
          </span>
        </div>

        {/* <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            System Design: TinyURL at 20:00
          </span>
        </div> */}
      </div>
    </div>
  );
};

export default MissionStrip;
