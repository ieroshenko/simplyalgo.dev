import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getUserAvatar = () => {
    // Try Google avatar from user metadata first
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    // Generate initials avatar as fallback
    const name = user?.user_metadata?.full_name || "User";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    return `https://ui-avatars.com/api/?name=${initials}&background=3b82f6&color=fff&size=80`;
  };

  return (
    <div className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-accent/10 rounded-lg">
          <div className="w-6 h-6 bg-accent rounded-md"></div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      </div>

      <Button
        variant="ghost"
        onClick={() => navigate("/profile")}
        className="flex items-center space-x-3 px-4 py-2 hover:bg-secondary rounded-lg"
      >
        <img
          src={getUserAvatar()}
          alt="Profile"
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="text-left">
          <div className="text-sm font-medium text-foreground">
            {user?.user_metadata?.full_name || "User"}
          </div>
          <div className="text-xs text-muted-foreground">View Profile</div>
        </div>
      </Button>
    </div>
  );
};

export default DashboardHeader;
