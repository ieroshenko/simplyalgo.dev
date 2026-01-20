import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useProblems } from "@/features/problems/hooks/useProblems";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUserAvatarUrl, getUserInitials, getUserName } from "@/lib/userAvatar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);
  const { stats: flashcardStats, isLoading: flashcardsLoading } = useFlashcards(user?.id);
  const { problems } = useProblems(user?.id);

  const displayName = getUserName(user, profile);
  const initials = getUserInitials(displayName);
  const avatarUrl = getUserAvatarUrl(user, profile, 120);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    : "";

  // Calculate total problems by difficulty
  const totalEasy = problems.filter(p => p.difficulty === 'Easy').length;
  const totalMedium = problems.filter(p => p.difficulty === 'Medium').length;
  const totalHard = problems.filter(p => p.difficulty === 'Hard').length;

  // Calculate percentages for progress bars
  const easyPercentage = totalEasy > 0 ? (stats.easySolved / totalEasy) * 100 : 0;
  const mediumPercentage = totalMedium > 0 ? (stats.mediumSolved / totalMedium) * 100 : 0;
  const hardPercentage = totalHard > 0 ? (stats.hardSolved / totalHard) * 100 : 0;

  // Safe defaults for flashcard stats - use correct property names
  const safeFlashcardStats = flashcardStats || {
    totalCards: 0,
    dueToday: 0,
    masteredCards: 0
  };

  const flashcardMastery = safeFlashcardStats.totalCards > 0
    ? Math.round((safeFlashcardStats.masteredCards / safeFlashcardStats.totalCards) * 100)
    : 0;

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-background py-16 px-6"
    >
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-6 pb-8 border-b border-border">
          <Avatar className="w-20 h-20 ring-1 ring-border ring-offset-2 ring-offset-background">
            <AvatarImage src={avatarUrl} referrerPolicy="no-referrer" />
            <AvatarFallback className="text-2xl font-medium bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Member since {memberSince}
            </p>
          </div>
        </div>

        {/* Performance Summary */}
        <section className="bg-card rounded-lg p-8 border border-border shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
            Performance
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-semibold text-foreground tracking-tight">
                {stats.totalSolved}
              </div>
              <div className="text-xs text-muted-foreground mt-1">problems solved</div>
            </div>
            <div className="border-l border-border pl-8">
              <div className="text-3xl font-semibold text-foreground tracking-tight">
                {stats.streak}
              </div>
              <div className="text-xs text-muted-foreground mt-1">current streak</div>
            </div>
            <div className="border-l border-border pl-8">
              <div className="text-3xl font-semibold text-foreground tracking-tight">
                {stats.maxStreak}
              </div>
              <div className="text-xs text-muted-foreground mt-1">max streak</div>
            </div>
          </div>
        </section>

        {/* Problem Distribution */}
        <section className="bg-card rounded-lg p-8 border border-border shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
            Problem Distribution
          </h2>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm text-muted-foreground">Easy</span>
                <span className="text-sm font-medium text-foreground">
                  {stats.easySolved} / {totalEasy}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${easyPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm text-muted-foreground">Medium</span>
                <span className="text-sm font-medium text-foreground">
                  {stats.mediumSolved} / {totalMedium}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${mediumPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm text-muted-foreground">Hard</span>
                <span className="text-sm font-medium text-foreground">
                  {stats.hardSolved} / {totalHard}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${hardPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Flashcards Section */}
        <section className="bg-card rounded-lg p-8 border border-border shadow-sm">
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Flashcards
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Spaced repetition knowledge system
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {safeFlashcardStats.totalCards}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">total</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {safeFlashcardStats.dueToday}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">due</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {safeFlashcardStats.masteredCards}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">mastered</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall mastery</span>
              <span className="text-xs font-medium text-muted-foreground">
                {flashcardMastery}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${flashcardMastery}%` }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>

          <Button
            onClick={() => navigate("/flashcards")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-lg text-sm font-medium"
          >
            <span>Review due cards</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </section>
      </div>
    </motion.div>
  );
};

export default Profile;
