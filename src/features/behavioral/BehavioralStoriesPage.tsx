import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserStories } from "@/hooks/useUserStories";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import type { UserStory } from "@/types";

// Components
import { StoryCard } from "./components/stories/StoryCard";
import { EditStoryDialog } from "./components/stories/EditStoryDialog";

const BehavioralStories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stories, loading, updateStory } = useUserStories();

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenEditDialog = (story: UserStory) => {
    setEditingStory(story);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingStory(null);
  };

  const handleSubmitEdit = async (updates: Partial<UserStory>) => {
    if (!editingStory) return;

    if (!updates.title?.trim() || !updates.description?.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please provide a title and description",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateStory(editingStory.id, updates);

      toast({
        title: "Experience updated!",
        description: "Your experience has been updated successfully",
      });

      handleCloseEditDialog();
    } catch (error) {
      toast({
        title: "Error updating story",
        description: error instanceof Error ? error.message : "Failed to update story",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-[68rem] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/behavioral")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">My Experiences</h1>
                <p className="text-muted-foreground mt-2">
                  Your personal library of projects, achievements, and experiences
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/behavioral/stories/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stories.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Experiences Yet</CardTitle>
                <CardDescription>
                  Add your first experience to start practicing behavioral interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/behavioral/stories/new")}>
                  Add Your First Experience
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={handleOpenEditDialog}
                />
              ))}
            </div>
          )}

          {/* Edit Story Dialog */}
          <EditStoryDialog
            isOpen={isEditDialogOpen}
            onClose={handleCloseEditDialog}
            story={editingStory}
            onSubmit={handleSubmitEdit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default BehavioralStories;
