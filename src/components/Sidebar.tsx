import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Home,
  BarChart3,
  Settings,
  List,
  Database,
  Layers,
  Brain,
  Hash,
  Type,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  TreePine,
  FolderTree,
  Mountain,
  RotateCcw,
  Sparkles,
  Code2,
  TrendingUp,
  Zap,
  Network,
  Grid3X3,
  DollarSign,
  Calendar,
  Calculator,
  Binary,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProblems } from "@/hooks/useProblems";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { categories } = useProblems(user?.id);

  const navigationItems = [
    { icon: Sparkles, label: "Dashboard", path: "/dashboard" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // No per-category icons in progress list (simplified UI)

  return (
    <div className="w-64 bg-background border-r border-border h-full flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <img
            src="/src/assets/simplyalgo-logo.png"
            alt="SimplyAlgo Logo"
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="text-lg font-bold text-foreground">SimplyAlgo</span>
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
              className={`w-full justify-start ${
                isActive
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
      </div>

      {/* Category Progress - Only show on DSA Arena pages */}
      {(location.pathname === "/DSA" ||
        location.pathname === "/arena") && (
        <div className="px-4 pb-4 flex-1">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">
              Category Progress
            </h3>
            <div className="space-y-3">
              {categories.map((category) => {
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
