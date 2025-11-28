import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Grid3x3, Share2, MessageCircle, Webhook, Blocks, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isFeatureEnabled, isFeatureEnabledBooleal } from "@/config/features";

const CoreBattleCards = () => {
  const navigate = useNavigate();

  const assessments = [
    {
      title: "Problem Solving",
      description: "Master common coding patterns & solve problems",
      icon: Code,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/problems",
      featureFlag: true,
    },
    {
      title: "System Design",
      description: "Practice system design problems and architecture",
      icon: Share2,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/system-design",
      featureFlag: false, // Disabled for launch
    },
    {
      title: "Implement Script/API",
      description: "Practice implementing scripts or APIs",
      icon: Webhook,
      color: "bg-primary/10",
      iconColor: "text-primary",
      featureFlag: false,
    },
  ];

  const interviews = [
    {
      title: "Problem Solving Mock",
      description: "Mock data structure and algorithm interviews",
      icon: Code,
      color: "bg-success/20",
      iconColor: "text-primary",
      path: "/technical-interview",
      featureFlag: "TECHNICAL_INTERVIEW" as const,
    },
    {
      title: "System-Design",
      description: "Practice system design interviews with AI",
      icon: Share2,
      color: "bg-success/20",
      iconColor: "text-primary",
      featureFlag: false,
    },
    {
      title: "Behavioral Interviews",
      description: "Soft skills & behavioral interviews",
      icon: MessageCircle,
      color: "bg-success/20",
      iconColor: "text-primary",
      featureFlag: true,
      path: "/behavioral",
    },  
    {
      title: "Script/API Follow-up",
      description: "Follow-up questions on 'build a script or API' assessment",
      icon: Blocks,
      color: "bg-success/20",
      iconColor: "text-primary",
      featureFlag: false,
    }, 
  ];

  // Get all assessments and interviews (don't filter by feature flags)
  const allAssessments = assessments;
  const allInterviews = interviews;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Assessment prep</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allAssessments.map((battle) => {
          const Icon = battle.icon;
          const isEnabled = isFeatureEnabledBooleal(battle.featureFlag);
          return (
            <Card
              key={battle.title}
              className={`hover:shadow-md transition-shadow group relative ${
                isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-75"
              }`}
              onClick={() => isEnabled && navigate(battle.path)}
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
                
                {!isEnabled && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      Coming soon
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <h2 className="text-2xl font-bold text-foreground mt-6">Interview prep</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {allInterviews.map((interview) => {
          const Icon = interview.icon;
          // Check if featureFlag is a string (feature flag name) or boolean
          const isEnabled = typeof interview.featureFlag === 'string' 
            ? isFeatureEnabled(interview.featureFlag)
            : isFeatureEnabledBooleal(interview.featureFlag);
          return (
            <Card
              key={interview.title}
              className={`hover:shadow-md transition-shadow group relative ${
                isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-75"
              }`}
              onClick={() => {
                if (isEnabled && interview.path) {
                  navigate(interview.path);
                }
              }}
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 ${interview.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                >
                  <Icon className={`w-6 h-6 ${interview.iconColor}`} />
                </div>

                <h3 className="font-bold text-lg text-foreground mb-2">
                  {interview.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {interview.description}
                </p>
                
                {!isEnabled && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      Coming soon
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CoreBattleCards;
