import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import BehavioralHeader from "@/features/behavioral/components/BehavioralHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePracticeAnswers } from "@/hooks/usePracticeAnswers";
import { useUserStories } from "@/hooks/useUserStories";
import {
  BookOpen,
  FileText,
  TrendingUp,
  ArrowRight,
  Users,
  ChevronRight,
} from "lucide-react";
import { logger } from "@/utils/logger";
import { useTrackFeatureTime, Features } from "@/hooks/useFeatureTracking";

const Behavioral = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getProgress } = usePracticeAnswers();
  const { stories, loading: storiesLoading } = useUserStories();

  // Track behavioral interview feature usage
  useTrackFeatureTime(Features.BEHAVIORAL);

  const [stats, setStats] = useState<{
    totalQuestionsPracticed: number;
    totalQuestions: number;
    totalStoriesCreated: number;
    averageScore: number;
  }>({
    totalQuestionsPracticed: 0,
    totalQuestions: 0,
    totalStoriesCreated: 0,
    averageScore: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        setStatsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        const progress = await getProgress();
        const storiesCount = stories.length;

        setStats({
          totalQuestionsPracticed: progress.totalPracticed,
          totalQuestions: progress.totalQuestions,
          totalStoriesCreated: storiesCount,
          averageScore: progress.averageScore,
        });
      } catch (err) {
        logger.error('[Behavioral] Error loading stats', { error: err });
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [user, getProgress, stories.length]);

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const hubCards = [
    {
      title: "Question Bank",
      description: "Browse technical behavioral questions organized by category",
      icon: BookOpen,
      path: "/behavioral/questions",
      status: "ACTIVE"
    },
    {
      title: "My Experiences",
      description: "Build and manage your personal experience library",
      icon: FileText,
      path: "/behavioral/stories",
      status: "ACTIVE"
    },
    {
      title: "Mock Interview",
      description: "Upload your resume and get personalized interview questions",
      icon: Users,
      path: "/behavioral/mock-interview",
      status: "BETA"
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <BehavioralHeader />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Questions Practiced</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalQuestionsPracticed}/{stats.totalQuestions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Experiences Created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStoriesCreated}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageScore > 0 ? `${stats.averageScore}%` : "0%"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hubCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.path}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(card.path)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      {card.status && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-muted">
                          {card.status}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between group-hover:bg-accent">
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Behavioral;
