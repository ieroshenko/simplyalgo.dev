import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserStories } from "@/hooks/useUserStories";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { UserStory } from "@/types";

const BehavioralStories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stories, loading, updateStory } = useUserStories();
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSituation, setEditSituation] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editAction, setEditAction] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editMetrics, setEditMetrics] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTechnicalSkills, setEditTechnicalSkills] = useState<string[]>([]);
  const [editTechnologies, setEditTechnologies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Input states for adding new tags/skills/technologies
  const [tagInput, setTagInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [techInput, setTechInput] = useState("");

  // Speech-to-text functionality for edit title field
  const {
    isListening: isListeningTitle,
    hasNativeSupport: hasNativeSupportTitle,
    isProcessing: isProcessingTitle,
    startListening: startListeningTitle,
    stopListening: stopListeningTitle,
    error: speechErrorTitle,
  } = useSpeechToText({
    onResult: (transcript) => {
      setEditTitle((prev) => prev + (prev ? ' ' : '') + transcript);
    },
    onError: (error) => {
      console.error("Speech recognition error:", error);
    },
  });

  // Speech-to-text functionality for edit description field
  const {
    isListening: isListeningDescription,
    hasNativeSupport: hasNativeSupportDescription,
    isProcessing: isProcessingDescription,
    startListening: startListeningDescription,
    stopListening: stopListeningDescription,
    error: speechErrorDescription,
  } = useSpeechToText({
    onResult: (transcript) => {
      setEditDescription((prev) => prev + (prev ? ' ' : '') + transcript);
    },
    onError: (error) => {
      console.error("Speech recognition error:", error);
    },
  });

  const toggleMicrophoneTitle = async () => {
    if (!hasNativeSupportTitle) return;

    if (isListeningTitle) {
      stopListeningTitle();
    } else {
      await startListeningTitle();
    }
  };

  const toggleMicrophoneDescription = async () => {
    if (!hasNativeSupportDescription) return;

    if (isListeningDescription) {
      stopListeningDescription();
    } else {
      await startListeningDescription();
    }
  };

  const availableCategories = [
    "technical_leadership",
    "code_review_collaboration",
    "debugging_problem_solving",
    "system_design_architecture",
    "technical_failure_recovery",
    "technical_debt_prioritization",
    "technical_communication",
    "technical_initiative",
    "learning_new_technologies",
    "code_quality_best_practices",
    "scaling_performance",
  ];

  const commonTechnicalSkills = [
    "system_design",
    "performance_optimization",
    "code_review",
    "debugging",
    "architecture",
    "scaling",
    "testing",
    "refactoring",
  ];

  const commonTechnologies = [
    "React",
    "Node.js",
    "Python",
    "PostgreSQL",
    "AWS",
    "Docker",
    "Kubernetes",
    "TypeScript",
    "JavaScript",
    "Java",
    "Go",
    "Redis",
    "MongoDB",
  ];

  const addTag = (tag: string) => {
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((tag) => tag !== tagToRemove));
  };

  const addTechnicalSkill = (skill: string) => {
    if (skill && !editTechnicalSkills.includes(skill)) {
      setEditTechnicalSkills([...editTechnicalSkills, skill]);
    }
  };

  const removeTechnicalSkill = (skillToRemove: string) => {
    setEditTechnicalSkills(editTechnicalSkills.filter((skill) => skill !== skillToRemove));
  };

  const addTechnology = (tech: string) => {
    if (tech && !editTechnologies.includes(tech)) {
      setEditTechnologies([...editTechnologies, tech]);
    }
  };

  const removeTechnology = (techToRemove: string) => {
    setEditTechnologies(editTechnologies.filter((tech) => tech !== techToRemove));
  };

  const handleOpenEditDialog = (story: UserStory) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditDescription(story.description || "");
    setEditSituation(story.situation || "");
    setEditTask(story.task || "");
    setEditAction(story.action || "");
    setEditResult(story.result || "");
    setEditMetrics(story.metrics || "");
    setEditTags(story.tags || []);
    setEditTechnicalSkills(story.technical_skills || []);
    setEditTechnologies(story.technologies || []);
    setTagInput("");
    setSkillInput("");
    setTechInput("");
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingStory(null);
    setEditTitle("");
    setEditDescription("");
    setEditSituation("");
    setEditTask("");
    setEditAction("");
    setEditResult("");
    setEditMetrics("");
    setEditTags([]);
    setEditTechnicalSkills([]);
    setEditTechnologies([]);
  };

  const handleSubmitEdit = async () => {
    if (!editingStory) return;

    if (!editTitle.trim() || !editDescription.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please provide a title and description",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateStory(editingStory.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        situation: editSituation.trim() || undefined,
        task: editTask.trim() || undefined,
        action: editAction.trim() || undefined,
        result: editResult.trim() || undefined,
        metrics: editMetrics.trim() || undefined,
        tags: editTags,
        technical_skills: editTechnicalSkills,
        technologies: editTechnologies,
      });

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
                <Card key={story.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{story.title}</CardTitle>
                    <CardDescription>
                      Used {story.practice_count} time{story.practice_count !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {story.description && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                        <div className="text-sm whitespace-pre-wrap">{story.description}</div>
                      </div>
                    )}
                    {story.metrics && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Results</div>
                        <div className="text-sm">{story.metrics}</div>
                      </div>
                    )}
                    {(story.technical_skills && story.technical_skills.length > 0) || 
                     (story.technologies && story.technologies.length > 0) || 
                     (story.tags && story.tags.length > 0) ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {story.technical_skills?.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {story.technologies?.map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {story.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenEditDialog(story)}
                      >
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Story Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Experience</DialogTitle>
                <DialogDescription>
                  Update your experience details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <div className="relative">
                    <Input
                      id="edit-title"
                      placeholder={
                        isListeningTitle
                          ? "🎤 Listening... Speak the title."
                          : isProcessingTitle
                            ? "🔄 Processing audio..."
                            : "e.g., Optimized Database Queries, Built Payment System"
                      }
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={hasNativeSupportTitle ? "pr-10" : ""}
                      required
                    />
                    {hasNativeSupportTitle && (
                      <button
                        type="button"
                        onClick={toggleMicrophoneTitle}
                        disabled={isSubmitting}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${
                          isListeningTitle
                            ? "text-red-500 animate-pulse"
                            : isProcessingTitle
                              ? "text-blue-500"
                              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        title={
                          isListeningTitle
                            ? "Stop listening"
                            : isProcessingTitle
                              ? "Processing..."
                              : "Start voice input"
                        }
                      >
                        {isListeningTitle ? (
                          <MicOff className="w-4 h-4" />
                        ) : isProcessingTitle ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {speechErrorTitle && (
                      <div
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-red-500 opacity-80"
                        title={speechErrorTitle}
                      >
                        ⚠️
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Description */}
                <div className="space-y-2">
                  <Label htmlFor="edit-description">What did you do? *</Label>
                  <div className="relative">
                    <Textarea
                      id="edit-description"
                      placeholder={
                        isListeningDescription
                          ? "🎤 Listening... Speak your description."
                          : isProcessingDescription
                            ? "🔄 Processing audio..."
                            : "Describe your experience, project, or achievement..."
                      }
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className={`min-h-[200px] ${hasNativeSupportDescription ? "pr-10" : ""}`}
                      required
                    />
                    {hasNativeSupportDescription && (
                      <button
                        type="button"
                        onClick={toggleMicrophoneDescription}
                        disabled={isSubmitting}
                        className={`absolute right-2 top-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${
                          isListeningDescription
                            ? "text-red-500 animate-pulse"
                            : isProcessingDescription
                              ? "text-blue-500"
                              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        title={
                          isListeningDescription
                            ? "Stop listening"
                            : isProcessingDescription
                              ? "Processing..."
                              : "Start voice input"
                        }
                      >
                        {isListeningDescription ? (
                          <MicOff className="w-4 h-4" />
                        ) : isProcessingDescription ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {speechErrorDescription && (
                      <div
                        className="absolute right-10 top-2 text-xs text-red-500 opacity-80"
                        title={speechErrorDescription}
                      >
                        ⚠️
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional STAR Structure */}
                <div className="space-y-4">
                  <div className="text-sm font-medium">Optional: STAR Structure</div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-situation" className="text-sm">Situation (Optional)</Label>
                      <Textarea
                        id="edit-situation"
                        placeholder="Context and background"
                        value={editSituation}
                        onChange={(e) => setEditSituation(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-task" className="text-sm">Task (Optional)</Label>
                      <Textarea
                        id="edit-task"
                        placeholder="What needed to be accomplished"
                        value={editTask}
                        onChange={(e) => setEditTask(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-action" className="text-sm">Action (Optional)</Label>
                      <Textarea
                        id="edit-action"
                        placeholder="What you specifically did"
                        value={editAction}
                        onChange={(e) => setEditAction(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-result" className="text-sm">Result (Optional)</Label>
                      <Textarea
                        id="edit-result"
                        placeholder="Outcome and what you learned"
                        value={editResult}
                        onChange={(e) => setEditResult(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2">
                  <Label htmlFor="edit-metrics">Metrics (Optional)</Label>
                  <Input
                    id="edit-metrics"
                    placeholder="e.g., Reduced latency by 40%, Fixed 15 production bugs"
                    value={editMetrics}
                    onChange={(e) => setEditMetrics(e.target.value)}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Categories (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag.replace(/_/g, " ")}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories
                      .filter((cat) => !editTags.includes(cat))
                      .slice(0, 6)
                      .map((cat) => (
                        <Button
                          key={cat}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTag(cat)}
                        >
                          + {cat.replace(/_/g, " ")}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Technical Skills */}
                <div className="space-y-2">
                  <Label>Technical Skills (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTechnicalSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill.replace(/_/g, " ")}
                        <button
                          type="button"
                          onClick={() => removeTechnicalSkill(skill)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonTechnicalSkills
                      .filter((skill) => !editTechnicalSkills.includes(skill))
                      .map((skill) => (
                        <Button
                          key={skill}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTechnicalSkill(skill)}
                        >
                          + {skill.replace(/_/g, " ")}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Technologies */}
                <div className="space-y-2">
                  <Label>Technologies (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTechnologies.map((tech) => (
                      <Badge key={tech} variant="secondary" className="gap-1">
                        {tech}
                        <button
                          type="button"
                          onClick={() => removeTechnology(tech)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonTechnologies
                      .filter((tech) => !editTechnologies.includes(tech))
                      .map((tech) => (
                        <Button
                          key={tech}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTechnology(tech)}
                        >
                          + {tech}
                        </Button>
                      ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseEditDialog} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitEdit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Experience"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default BehavioralStories;

