import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Clock, 
  Flame, 
  TrendingUp, 
  Play,
  Settings,
  Calendar 
} from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";

interface FlashcardStatsProps {
  userId: string;
  onStartReview?: () => void;
  onManageDeck?: () => void;
  className?: string;
}

export const FlashcardStats = ({
  userId,
  onStartReview,
  onManageDeck,
  className = "",
}: FlashcardStatsProps) => {
  const { stats, dueCards, isLoading } = useFlashcards(userId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalCards === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            📚 Flashcards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No flashcards yet</p>
            <p className="text-sm text-muted-foreground">
              Solve problems and add them to your flashcard deck for spaced repetition review!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const masteryPercentage = stats.totalCards > 0 
    ? Math.round((stats.masteredCards / stats.totalCards) * 100) 
    : 0;

  const dueCount = dueCards.length;
  const hasDueCards = dueCount > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Flashcards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalCards}</div>
            <div className="text-xs text-muted-foreground">Total Cards</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{dueCount}</div>
            <div className="text-xs text-muted-foreground">Due Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.masteredCards}</div>
            <div className="text-xs text-muted-foreground">Mastered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.currentStreak ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
        </div>

        {/* Mastery Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Overall Mastery
            </span>
            <span className="font-medium">{masteryPercentage}%</span>
          </div>
          <Progress value={masteryPercentage} className="h-2" />
        </div>

        {/* Card Distribution */}
        <div className="flex flex-wrap gap-2">
          {stats.newCards > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stats.newCards} New
            </Badge>
          )}
          {stats.learningCards > 0 && (
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
              {stats.learningCards} Learning
            </Badge>
          )}
          {stats.masteredCards > 0 && (
            <Badge variant="outline" className="text-xs border-green-300 text-green-600">
              {stats.masteredCards} Mastered
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onStartReview}
            disabled={!hasDueCards}
            className={hasDueCards ? "flex-1" : "flex-1 opacity-50"}
            variant={hasDueCards ? "default" : "outline"}
          >
            <Play className="h-4 w-4 mr-2" />
            {hasDueCards 
              ? `Review ${dueCount} Card${dueCount > 1 ? 's' : ''}` 
              : 'No Cards Due'
            }
          </Button>
          
          <Button
            variant="outline"
            size="default"
            onClick={onManageDeck}
            className="px-3"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Next Review Info */}
        {!hasDueCards && stats.totalCards > 0 && (
          <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Calendar className="h-4 w-4 inline mr-1" />
            All caught up! Check back later for more reviews.
          </div>
        )}

        {/* Performance Indicators */}
        {stats.averageEaseFactor !== 2.5 && (
          <div className="text-xs text-muted-foreground text-center">
            <Flame className="h-3 w-3 inline mr-1" />
            Average ease: {stats.averageEaseFactor.toFixed(1)}
            {stats.longestStreak != null && stats.longestStreak > 0 && ` • Best streak: ${stats.longestStreak} days`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};