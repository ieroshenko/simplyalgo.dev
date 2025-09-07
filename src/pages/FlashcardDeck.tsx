import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { FlashcardDeckManager } from "@/components/flashcards/FlashcardDeckManager";
import { isFeatureEnabled } from "@/config/features";

const FlashcardDeck = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect if feature is disabled
    if (!isFeatureEnabled("FLASHCARDS")) {
      navigate("/profile");
      return;
    }

    // Redirect if user is not authenticated
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading flashcard deck...</p>
        </div>
      </div>
    );
  }

  if (!user || !isFeatureEnabled("FLASHCARDS")) {
    return null;
  }

  return <FlashcardDeckManager userId={user.id} />;
};

export default FlashcardDeck;