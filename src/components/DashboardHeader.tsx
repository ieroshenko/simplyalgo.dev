import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials, getUserName } from "@/lib/userAvatar";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayName = getUserName(user);
  const initials = getUserInitials(displayName);
  const avatarUrl = getUserAvatarUrl(user, undefined, 80);

  return (
    <div className="flex items-center justify-end px-6 pt-4 pb-0">
      <Button
        variant="ghost"
        onClick={() => navigate("/profile")}
        className="flex items-center space-x-3 px-3 py-2 hover:bg-accent/5 rounded-lg"
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

export default DashboardHeader;
