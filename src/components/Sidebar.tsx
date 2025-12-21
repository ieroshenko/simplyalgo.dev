import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import FeedbackModal from "@/components/FeedbackModal";
import {
  Home,
  Settings,
  Shield,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProblems } from "@/features/problems/hooks/useProblems";

const ADMIN_EMAILS = [
  "tazigrigolia@gmail.com",
  "ivaneroshenko@gmail.com"
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories } = useProblems(user?.id);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const navigationItems = [
    { icon: Sparkles, label: "Dashboard", path: "/dashboard" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // Default Sidebar
  return (
    <div className="w-64 bg-background border-r border-border h-screen flex flex-col sticky top-0 z-10">
      {/* Logo */}
      <div className="pt-7 pb-7 pl-5 border-b border-border">
        <div className="flex items-center space-x-3">
          <img
            src="/simplyalgo-logo.png"
            alt="SimplyAlgo Logo"
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="text-2xl font-bold text-foreground">SimplyAlgo.dev</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Button
              key={item.path}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-foreground"
                }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="w-4 h-4 mr-3" />
              {item.label}
            </Button>
          );
        })}

        {isAdmin && (
          <Button
            variant={location.pathname === "/admin" ? "default" : "ghost"}
            className={`w-full justify-start ${location.pathname === "/admin"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary text-foreground"
              }`}
            onClick={() => navigate("/admin")}
          >
            <Shield className="w-4 h-4 mr-3" />
            Admin
          </Button>
        )}

        {/* Feedback Modal Trigger */}
        <FeedbackModal>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-secondary text-foreground"
          >
            <MessageSquare className="w-4 h-4 mr-3" />
            Leave Feedback
          </Button>
        </FeedbackModal>
      </div>

      {/* Category Progress - Only show on DSA Arena pages */}
      {(location.pathname === "/problems" ||
        location.pathname === "/arena") && (
          <div className="px-4 pb-4 flex-1">
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-foreground text-sm">
                Category Progress
              </h3>
              <div className="space-y-3">
                {categories
                  .filter((category) =>
                    category.name !== "Data Structure Implementations" &&
                    category.name !== "System Design"
                  )
                  .map((category) => {
                    const percentage = (category.solved / category.total) * 100;

                    return (
                      <div key={category.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-foreground">
                              {category.name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {category.solved}/{category.total}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        )}
    </div>
  );
};

export default Sidebar;
