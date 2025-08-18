import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Grid3x3, Share2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isFeatureEnabled } from "@/config/features";

const CoreBattleCards = () => {
  const navigate = useNavigate();

  const battles = [
    {
      title: "LeetCode Arena",
      description: "Master common coding patterns & solve problems",
      icon: Code,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/leetcode",
      featureFlag: "LEETCODE_ARENA" as const,
    },
    {
      title: "System-Design War-Room",
      description: "Prepare for system design interviews",
      icon: Share2,
      color: "bg-success/20",
      iconColor: "text-primary",
      path: "/system-design",
      featureFlag: "SYSTEM_DESIGN_WAR_ROOM" as const,
    },
    {
      title: "Mock Interviews",
      description: "Practice coding and system design",
      icon: MessageCircle,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/mock-interviews",
      featureFlag: "MOCK_INTERVIEWS" as const,
    },
  ];

  // Filter battles based on feature flags
  const enabledBattles = battles.filter((battle) =>
    isFeatureEnabled(battle.featureFlag),
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      {enabledBattles.map((battle) => {
        const Icon = battle.icon;
        return (
          <Card
            key={battle.title}
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(battle.path)}
          >
            <CardContent className="p-6">
              <div
                className={`w-12 h-12 ${battle.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
              >
                <Icon className={`w-6 h-6 ${battle.iconColor}`} />
              </div>

              <h3 className="font-bold text-lg text-foreground mb-2">
                {battle.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {battle.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CoreBattleCards;
