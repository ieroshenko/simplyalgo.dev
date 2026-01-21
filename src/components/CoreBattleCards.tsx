import React from "react";
import { Code, Share2, MessageCircle, Webhook, Blocks, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isFeatureEnabled, isFeatureEnabledBoolean, type FeatureFlag } from "@/config/features";

const CoreBattleCards = () => {
  const navigate = useNavigate();
  const [showUpcomingAssessments, setShowUpcomingAssessments] = React.useState(false);
  const [showUpcomingInterviews, setShowUpcomingInterviews] = React.useState(false);

  const assessments = [
    {
      title: "Problem Solving",
      description: "Master common coding patterns & solve problems",
      icon: Code,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/problems",
      featureFlag: true,
      status: "ACTIVE"
    },
    {
      title: "System Design",
      description: "Practice system design problems and architecture",
      icon: Share2,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/system-design",
      featureFlag: false, // Disabled for launch
      status: "COMING SOON"
    },
    {
      title: "Implement Script/API",
      description: "Practice implementing scripts or APIs",
      icon: Webhook,
      color: "bg-primary/10",
      iconColor: "text-primary",
      featureFlag: false,
      status: "COMING SOON"
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
      status: "COMING SOON"
    },
    {
      title: "System-Design",
      description: "Practice system design interviews with AI",
      icon: Share2,
      color: "bg-success/20",
      iconColor: "text-primary",
      featureFlag: false,
      status: "COMING SOON"
    },
    {
      title: "Behavioral Interviews",
      description: "Soft skills & behavioral interviews",
      icon: MessageCircle,
      color: "bg-amber/20",
      iconColor: "text-amber-600",
      featureFlag: true,
      path: "/behavioral",
      status: "AVAILABLE",
      isYellow: true, // Flag to render with yellow styling
    },
    {
      title: "Script/API Follow-up",
      description: "Follow-up questions on 'build a script or API' assessment",
      icon: Blocks,
      color: "bg-success/20",
      iconColor: "text-primary",
      featureFlag: false,
      status: "COMING SOON"
    },
  ];

  const availableAssessments = assessments.filter(a => isFeatureEnabledBoolean(a.featureFlag));
  const upcomingAssessments = assessments.filter(a => !isFeatureEnabledBoolean(a.featureFlag));

  const availableInterviews = interviews.filter(i => {
    return typeof i.featureFlag === 'string'
      ? isFeatureEnabled(i.featureFlag as FeatureFlag)
      : isFeatureEnabledBoolean(i.featureFlag);
  });
  const upcomingInterviews = interviews.filter(i => {
    return typeof i.featureFlag === 'string'
      ? !isFeatureEnabled(i.featureFlag as FeatureFlag)
      : !isFeatureEnabledBoolean(i.featureFlag);
  });

  return (
    <div data-tour="core-battle-cards" className="space-y-8 px-6">
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-3">Assessment Prep</h2>

        {/* Available items */}
        <div className="space-y-2">
          {availableAssessments.map((battle) => (
            <button
              key={battle.title}
              onClick={() => navigate(battle.path)}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-green-300/70 dark:border-green-700/50 bg-green-100/50 dark:bg-green-950/30 hover:bg-green-100/70 dark:hover:bg-green-950/40 hover:border-green-400/70 dark:hover:border-green-600/50 transition-all text-left shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full" />
                  <h3 className="font-semibold text-base text-foreground">{battle.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{battle.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Upcoming modules - collapsible */}
        {upcomingAssessments.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowUpcomingAssessments(!showUpcomingAssessments)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showUpcomingAssessments ? 'rotate-90' : ''}`} />
              <span>Upcoming modules ({upcomingAssessments.length})</span>
            </button>

            {showUpcomingAssessments && (
              <div className="space-y-2 pl-5">
                {upcomingAssessments.map((battle) => (
                  <div
                    key={battle.title}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-border/30 bg-background/50 opacity-60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-sm text-foreground">{battle.title}</h3>
                        <span className="text-[10px] font-medium text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/50">
                          coming soon
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{battle.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-3">Interview Prep</h2>

        {/* Available items */}
        <div className="space-y-2">
          {availableInterviews.map((interview) => {
            const isYellow = 'isYellow' in interview && interview.isYellow;
            return (
              <button
                key={interview.title}
                onClick={() => interview.path && navigate(interview.path)}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all text-left shadow-sm ${isYellow
                    ? 'border-amber-300/70 dark:border-amber-700/50 bg-amber-100/50 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 hover:border-amber-400/70 dark:hover:border-amber-600/50'
                    : 'border-green-300/70 dark:border-green-700/50 bg-green-100/50 dark:bg-green-950/30 hover:bg-green-100/70 dark:hover:bg-green-950/40 hover:border-green-400/70 dark:hover:border-green-600/50'
                  }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isYellow ? 'bg-amber-600 dark:bg-amber-400' : 'bg-green-600 dark:bg-green-400'}`} />
                    <h3 className="font-semibold text-base text-foreground">{interview.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{interview.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Upcoming modules - collapsible */}
        {upcomingInterviews.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowUpcomingInterviews(!showUpcomingInterviews)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showUpcomingInterviews ? 'rotate-90' : ''}`} />
              <span>Upcoming modules ({upcomingInterviews.length})</span>
            </button>

            {showUpcomingInterviews && (
              <div className="space-y-2 pl-5">
                {upcomingInterviews.map((interview) => (
                  <div
                    key={interview.title}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-border/30 bg-background/50 opacity-60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-sm text-foreground">{interview.title}</h3>
                        <span className="text-[10px] font-medium text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/50">
                          coming soon
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{interview.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default CoreBattleCards;
