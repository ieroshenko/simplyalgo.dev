import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Clock, Trophy, Calendar, Flame, CheckCircle2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials, getUserName } from "@/lib/userAvatar";
import { FlashcardStats } from "@/components/flashcards/FlashcardStats";
import { FlashcardReviewInterface } from "@/components/flashcards/FlashcardReviewInterface";
import { isFeatureEnabled } from "@/config/features";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);
  const [showFlashcardReview, setShowFlashcardReview] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = getUserName(user, profile);
  const initials = getUserInitials(displayName);
  const avatarUrl = getUserAvatarUrl(user, profile, 200);
  const userEmail = user.email || profile.email || "";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/problems")}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Header Card */}
        <Card className="p-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={avatarUrl} referrerPolicy="no-referrer" loading="lazy" />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {displayName}
              </h2>
              <p className="text-muted-foreground mb-4">{userEmail}</p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined{" "}
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.totalSolved}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Solved
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.streak}
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Streak
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.maxStreak}
                </div>
                <div className="text-sm text-muted-foreground">Best Streak</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {stats.totalSolved > 0
                    ? Math.round((stats.totalSolved / 100) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Flashcard Section */}
        {isFeatureEnabled("FLASHCARDS") && user && (
          <FlashcardStats
            userId={user.id}
            onStartReview={() => setShowFlashcardReview(true)}
            onManageDeck={() => navigate("/flashcards")}
          />
        )}

        {/* Problem Breakdown */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-6">
            Problems Solved by Difficulty
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl font-bold text-green-700">
                  {stats.easySolved}
                </div>
              </div>
              <div className="text-sm font-medium text-green-700">Easy</div>
              <div className="text-xs text-muted-foreground mt-1">
                Problems Solved
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl font-bold text-yellow-700">
                  {stats.mediumSolved}
                </div>
              </div>
              <div className="text-sm font-medium text-yellow-700">Medium</div>
              <div className="text-xs text-muted-foreground mt-1">
                Problems Solved
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                <div className="text-2xl font-bold text-red-700">
                  {stats.hardSolved}
                </div>
              </div>
              <div className="text-sm font-medium text-red-700">Hard</div>
              <div className="text-xs text-muted-foreground mt-1">
                Problems Solved
              </div>
            </div>
          </div>
        </Card>

        {/* Flashcard Review Interface */}
        {isFeatureEnabled("FLASHCARDS") && user && (
          <FlashcardReviewInterface
            isOpen={showFlashcardReview}
            onClose={() => setShowFlashcardReview(false)}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;
