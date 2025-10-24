import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Trash2,
  Calendar,
  RotateCcw,
  Search,
  Filter,
  ArrowLeft,
  Star,
  Clock,
  Brain,
} from "lucide-react";
import { useFlashcards, type FlashcardDeck } from "@/hooks/useFlashcards";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface FlashcardDeckManagerProps {
  userId: string;
}

export const FlashcardDeckManager = ({ userId }: FlashcardDeckManagerProps) => {
  const navigate = useNavigate();
  const {
    flashcards,
    removeFromFlashcards,
    isRemovingFromFlashcards,
    isLoading,
  } = useFlashcards(userId);

  const [searchTerm, setSearchTerm] = useState("");
  const [masteryFilter, setMasteryFilter] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<FlashcardDeck | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filter flashcards based on search and mastery level
  const filteredCards = flashcards.filter((card) => {
    const matchesSearch = card.problem_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.solution_title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMastery = masteryFilter === "all" ||
      card.mastery_level.toString() === masteryFilter;

    return matchesSearch && matchesMastery;
  });

  const handleDeleteCard = (card: FlashcardDeck) => {
    setSelectedCard(card);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedCard) {
      removeFromFlashcards(selectedCard.id);
      setShowDeleteDialog(false);
      setSelectedCard(null);
    }
  };

  const getMasteryLabel = (level: number, reviewCount: number) => {
    // If card has been reviewed but still shows as level 0, it should be Learning
    if (level === 0 && reviewCount > 0) {
      return { label: "Learning", color: "bg-blue-100 text-blue-800" };
    }

    switch (level) {
      case 0: return { label: "New", color: "bg-gray-100 text-gray-800" };
      case 1: return { label: "Learning", color: "bg-blue-100 text-blue-800" };
      case 2: return { label: "Good", color: "bg-green-100 text-green-800" };
      case 3: return { label: "Mastered", color: "bg-purple-100 text-purple-800" };
      default: return { label: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
  };

  const formatNextReview = (date: string) => {
    const reviewDate = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="hover:bg-secondary"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Flashcard Deck</h1>
              <p className="text-muted-foreground">
                Manage your spaced repetition learning cards
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{flashcards.length}</div>
                  <div className="text-xs text-muted-foreground">Total Cards</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {flashcards.filter(c => c.mastery_level === 3).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Mastered</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {flashcards.filter(c => new Date(c.next_review_date) <= new Date()).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Due Now</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {flashcards.length > 0
                      ? (flashcards.reduce((sum, card) => sum + card.ease_factor, 0) / flashcards.length).toFixed(1)
                      : "0.0"
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Avg. Ease</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search problems..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={masteryFilter} onValueChange={setMasteryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by mastery" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="0">New</SelectItem>
                  <SelectItem value="1">Learning</SelectItem>
                  <SelectItem value="2">Good</SelectItem>
                  <SelectItem value="3">Mastered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Flashcards Grid */}
        {filteredCards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {flashcards.length === 0 ? "No Flashcards Yet" : "No Cards Match Your Filters"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {flashcards.length === 0
                  ? "Start by solving problems and adding them to your flashcard deck!"
                  : "Try adjusting your search terms or filters to find cards."
                }
              </p>
              {flashcards.length === 0 && (
                <Button onClick={() => navigate("/problems")}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Solve Problems
                </Button>
              )}
              {flashcards.length > 0 && filteredCards.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setMasteryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => {
              const mastery = getMasteryLabel(card.mastery_level, card.review_count);
              return (
                <Card key={card.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">
                        {card.problem_title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCard(card)}
                        disabled={isRemovingFromFlashcards}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove from flashcards"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Solution: {card.solution_title}
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={mastery.color}>
                        {mastery.label}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {card.review_count} reviews
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatNextReview(card.next_review_date)}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Ease factor: {card.ease_factor.toFixed(2)}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Added: {new Date(card.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Flashcard</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove "{selectedCard?.problem_title}" from your flashcard deck?
                This will delete all review history for this card.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isRemovingFromFlashcards}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isRemovingFromFlashcards}
              >
                {isRemovingFromFlashcards ? "Removing..." : "Remove Card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};