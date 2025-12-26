import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBehavioralQuestions } from "@/features/behavioral/hooks/useBehavioralQuestions";
import { useCustomQuestions } from "@/hooks/useCustomQuestions";
import { usePracticeAnswers } from "@/hooks/usePracticeAnswers";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { BehavioralQuestionCategory, QuestionDifficulty, EvaluationType, BehavioralQuestion } from "@/types";

const BehavioralQuestions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<BehavioralQuestionCategory | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{ id: string; question: BehavioralQuestion } | null>(null);
  
  const { questions, loading, refresh: refreshQuestions } = useBehavioralQuestions({
    category: selectedCategory,
    difficulty: selectedDifficulty,
    includeCustom: true, // Include user's custom questions
  });

  const { createQuestion, updateQuestion, deleteQuestion, loading: customLoading } = useCustomQuestions();
  const { getQuestionScores, getProgress } = usePracticeAnswers();

  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<{ totalPracticed: number; totalQuestions: number; averageScore: number }>({
    totalPracticed: 0,
    totalQuestions: 0,
    averageScore: 0,
  });

  // Load question scores and progress on mount
  useEffect(() => {
    const loadScoresAndProgress = async () => {
      if (user) {
        const scores = await getQuestionScores();
        setQuestionScores(scores);
        const progressData = await getProgress();
        setProgress(progressData);
      }
    };
    loadScoresAndProgress();
  }, [user, getQuestionScores, getProgress]);

  // Form state for creating/editing custom questions
  const [questionText, setQuestionText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<BehavioralQuestionCategory[]>([]);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("intermediate");
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("star");
  const [customPrompt, setCustomPrompt] = useState("");

  const resetForm = () => {
    setQuestionText("");
    setSelectedCategories([]);
    setDifficulty("intermediate");
    setEvaluationType("star");
    setCustomPrompt("");
    setEditingQuestion(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (question: BehavioralQuestion) => {
    if (!question.user_id) return; // Can't edit curated questions
    setQuestionText(question.question_text);
    setSelectedCategories(question.category);
    setDifficulty(question.difficulty);
    setEvaluationType(question.evaluation_type || "star");
    setCustomPrompt(question.custom_evaluation_prompt || "");
    setEditingQuestion({ id: question.id, question });
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const toggleCategory = (category: BehavioralQuestionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  };

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      toast({
        title: "Error",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    if (evaluationType === "custom" && !customPrompt.trim()) {
      toast({
        title: "Error",
        description: "Custom evaluation prompt is required when evaluation type is 'custom'",
        variant: "destructive",
      });
      return;
    }

    if (evaluationType === "custom" && getWordCount(customPrompt) > 500) {
      toast({
        title: "Error",
        description: `Custom evaluation prompt exceeds 500 words (${getWordCount(customPrompt)} words)`,
        variant: "destructive",
      });
      return;
    }

    if (editingQuestion) {
      const success = await updateQuestion(editingQuestion.id, {
        question_text: questionText,
        category: selectedCategories,
        difficulty,
        evaluation_type: evaluationType,
        custom_evaluation_prompt: evaluationType === "custom" ? customPrompt : undefined,
      });

      if (success) {
        toast({
          title: "Success",
          description: "Question updated successfully",
        });
        handleCloseDialog();
        // Refresh questions
        refreshQuestions();
      } else {
        toast({
          title: "Error",
          description: "Failed to update question",
          variant: "destructive",
        });
      }
    } else {
      const newQuestion = await createQuestion(
        questionText,
        selectedCategories,
        difficulty,
        evaluationType,
        evaluationType === "custom" ? customPrompt : undefined
      );

      if (newQuestion) {
        toast({
          title: "Success",
          description: "Custom question created successfully",
        });
        handleCloseDialog();
        // Refresh questions
        refreshQuestions();
      } else {
        toast({
          title: "Error",
          description: "Failed to create question",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    const success = await deleteQuestion(questionId);
    if (success) {
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      // Refresh questions
      refreshQuestions();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const categories = [
    "general",
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

  const difficulties = ["beginner", "intermediate", "advanced"];

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
                <h1 className="text-3xl font-bold text-foreground">Question Bank</h1>
                <p className="text-muted-foreground mt-2">
                  Browse technical behavioral interview questions
                </p>
              </div>
            </div>
            {user && (
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Question
              </Button>
            )}
          </div>

          {/* Progress Indicator */}
          {user && (
            <div>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Progress</div>
                      <div className="text-2xl font-bold">
                        {progress.totalPracticed} / {progress.totalQuestions} questions practiced
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Average Score</div>
                      <div className="text-2xl font-bold">{progress.averageScore}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Category</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === undefined ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(undefined)}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat as BehavioralQuestionCategory)}
                    >
                      {cat.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Difficulty</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedDifficulty === undefined ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty(undefined)}
                  >
                    All
                  </Button>
                  {difficulties.map((diff) => (
                    <Button
                      key={diff}
                      variant={selectedDifficulty === diff ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDifficulty(diff as QuestionDifficulty)}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions.map((question) => (
                <Card key={question.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{question.question_text}</CardTitle>
                      </div>
                      {question.user_id && user?.id === question.user_id && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(question)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(question.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {question.user_id && (
                        <Badge variant="default">Custom</Badge>
                      )}
                      {question.category.map((cat) => (
                        <Badge key={cat} variant="secondary">
                          {cat.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      <Badge variant="outline">{question.difficulty}</Badge>
                      {question.evaluation_type && question.evaluation_type !== 'star' && (
                        <Badge variant="outline">
                          Eval: {question.evaluation_type === 'custom' ? 'Custom' : 'None'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={() => navigate(`/behavioral/practice?questionId=${question.id}`)}
                      >
                        Practice
                      </Button>
                      {questionScores[question.id] !== undefined && (() => {
                        const score = questionScores[question.id];
                        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
                        let badgeClassName = "text-sm font-semibold";
                        
                        if (score <= 30) {
                          badgeVariant = "destructive";
                          badgeClassName += " bg-orange-500 hover:bg-orange-600 text-white";
                        } else if (score <= 75) {
                          badgeVariant = "secondary";
                          badgeClassName += " bg-yellow-500 hover:bg-yellow-600 text-white";
                        } else {
                          badgeVariant = "default";
                          badgeClassName += " bg-green-500 hover:bg-green-600 text-white";
                        }
                        
                        return (
                          <Badge variant={badgeVariant} className={badgeClassName}>
                            {score}%
                          </Badge>
                        );
                      })()}
                      {questionScores[question.id] === undefined && <div className="w-16" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Custom Question Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Custom Question" : "Add Custom Question"}
            </DialogTitle>
            <DialogDescription>
              Create your own behavioral interview question with custom evaluation criteria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="question-text">Question Text *</Label>
              <Textarea
                id="question-text"
                placeholder="e.g., Tell me about a time when you had to debug a critical production issue..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
              />
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories *</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategories.includes(cat as BehavioralQuestionCategory) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCategory(cat as BehavioralQuestionCategory)}
                  >
                    {cat.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
              {selectedCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">Select at least one category</p>
              )}
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as QuestionDifficulty)}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Evaluation Criteria */}
            <div className="space-y-2">
              <Label>Evaluation Criteria</Label>
              <RadioGroup value={evaluationType} onValueChange={(value) => setEvaluationType(value as EvaluationType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="star" id="eval-star" />
                  <Label htmlFor="eval-star" className="font-normal cursor-pointer">
                    STAR Method (Situation, Task, Action, Result)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="eval-none" />
                  <Label htmlFor="eval-none" className="font-normal cursor-pointer">
                    None (General feedback only)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="eval-custom" />
                  <Label htmlFor="eval-custom" className="font-normal cursor-pointer">
                    Custom Prompt
                  </Label>
                </div>
              </RadioGroup>

              {evaluationType === "custom" && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custom-prompt">Custom Evaluation Prompt *</Label>
                    <span className="text-sm text-muted-foreground">
                      {getWordCount(customPrompt)} / 500 words
                    </span>
                  </div>
                  <Textarea
                    id="custom-prompt"
                    placeholder="e.g., Evaluate the answer based on: 1) Technical depth, 2) Problem-solving approach, 3) Impact on the team..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={6}
                    className={getWordCount(customPrompt) > 500 ? "border-destructive" : ""}
                  />
                  <p className="text-sm text-muted-foreground">
                    Define how the AI should evaluate answers to this question (max 500 words)
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={customLoading}>
              {editingQuestion ? "Update Question" : "Create Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BehavioralQuestions;

