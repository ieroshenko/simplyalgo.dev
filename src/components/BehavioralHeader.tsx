import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials, getUserName } from "@/lib/userAvatar";
import { useUserStats } from "@/hooks/useUserStats";

const BehavioralHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserStats(user?.id);

  const displayName = getUserName(user);
  const initials = getUserInitials(displayName);
  const avatarUrl = getUserAvatarUrl(user, profile, 80);

  return (
    <div className="flex justify-between items-start p-6 border-b border-border">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Behavioral Interview Prep
        </h1>
        <p className="text-muted-foreground mt-1">
          Master technical behavioral interviews and ace your next interview
        </p>
      </div>

      <Button
        variant="ghost"
        onClick={() => navigate("/profile")}
        className="flex items-center space-x-3 px-4 py-2 hover:bg-secondary rounded-lg"
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={avatarUrl} referrerPolicy="no-referrer" loading="lazy" />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-left">
          <div className="text-sm font-medium text-foreground">
            {displayName}
          </div>
          <div className="text-xs text-muted-foreground">View Profile</div>
        </div>
      </Button>
    </div>
  );
};

export default BehavioralHeader;
