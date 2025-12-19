import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useProblems } from "@/hooks/useProblems";
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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-sm text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[#FAFAF8] py-16 px-6"
    >
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-6 pb-8 border-b border-neutral-200">
          <Avatar className="w-20 h-20 ring-1 ring-neutral-200 ring-offset-2 ring-offset-[#FAFAF8]">
            <AvatarImage src={avatarUrl} referrerPolicy="no-referrer" />
            <AvatarFallback className="text-2xl font-medium bg-neutral-100 text-neutral-600">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              {displayName}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Member since {memberSince}
            </p>
          </div>
        </div>

        {/* Performance Summary */}
        <section className="bg-neutral-50/50 rounded-lg p-8 border border-neutral-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-6">
            Performance
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-semibold text-neutral-900 tracking-tight">
                {stats.totalSolved}
              </div>
              <div className="text-xs text-neutral-500 mt-1">problems solved</div>
            </div>
            <div className="border-l border-neutral-200 pl-8">
              <div className="text-3xl font-semibold text-neutral-900 tracking-tight">
                {stats.streak}
              </div>
              <div className="text-xs text-neutral-500 mt-1">current streak</div>
            </div>
            <div className="border-l border-neutral-200 pl-8">
              <div className="text-3xl font-semibold text-neutral-900 tracking-tight">
                {stats.maxStreak}
              </div>
              <div className="text-xs text-neutral-500 mt-1">max streak</div>
            </div>
          </div>
        </section>

        {/* Problem Distribution */}
        <section className="bg-white/50 rounded-lg p-8 border border-neutral-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-6">
            Problem Distribution
          </h2>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm text-neutral-600">Easy</span>
                <span className="text-sm font-medium text-neutral-900">
                  {stats.easySolved} / {totalEasy}
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${easyPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm text-neutral-600">Medium</span>
                <span className="text-sm font-medium text-neutral-900">
                  {stats.mediumSolved} / {totalMedium}
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${mediumPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm text-neutral-600">Hard</span>
                <span className="text-sm font-medium text-neutral-900">
                  {stats.hardSolved} / {totalHard}
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${hardPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Flashcards Section */}
        <section className="bg-neutral-50/50 rounded-lg p-8 border border-neutral-100">
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Flashcards
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Spaced repetition knowledge system
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {safeFlashcardStats.totalCards}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">total</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {safeFlashcardStats.dueToday}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">due</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {safeFlashcardStats.masteredCards}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">mastered</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Overall mastery</span>
              <span className="text-xs font-medium text-neutral-600">
                {flashcardMastery}%
              </span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
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
