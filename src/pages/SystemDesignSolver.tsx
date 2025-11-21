import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSystemDesignSession } from "@/hooks/useSystemDesignSession";
import { useSystemDesignSpecs } from "@/hooks/useSystemDesignSpecs";
import { useSystemDesignSubmissions } from "@/hooks/useSystemDesignSubmissions";
import DesignCanvas from "@/components/system-design/DesignCanvas";
import ProblemContextSidebar from "@/components/system-design/ProblemContextSidebar";
import DesignCoachChat from "@/components/system-design/DesignCoachChat";
import SystemDesignSubmissions from "@/components/system-design/SystemDesignSubmissions";
import EvaluationDisplay from "@/components/system-design/EvaluationDisplay";
import SubmissionPreviewModal from "@/components/system-design/SubmissionPreviewModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { ArrowLeft, Moon, Sun, Star, StarOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SystemDesignBoardState } from "@/types";
import type { SystemDesignSubmission } from "@/hooks/useSystemDesignSubmissions";

const SystemDesignSolver = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { specs, loading: specsLoading } = useSystemDesignSpecs(user?.id);

  const spec = specs.find((s) => s.id === problemId);

  const {
    session,
    boardState,
    messages,
    evaluation,
    completeness,
    loading: sessionLoading,
    error,
    isTyping,
    hasDraft,
    updateBoard,
    sendMessage,
    evaluateDesign,
    clearConversation,
    saveDraft,
    restoreDraft,
    isEvaluating,
  } = useSystemDesignSession({
    problemId: problemId || "",
    userId: user?.id || "",
  });

  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useSystemDesignSubmissions(user?.id, problemId);

  const [showEvaluation, setShowEvaluation] = useState(false);
  const [previewSubmission, setPreviewSubmission] = useState<SystemDesignSubmission | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    const saved = localStorage.getItem("system-design-showLeftPanel");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showRightPanel, setShowRightPanel] = useState(() => {
    const saved = localStorage.getItem("system-design-showRightPanel");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const { theme, setTheme, isDark } = useTheme();

  const toggleLeftPanel = useCallback(() => {
    const newValue = !showLeftPanel;
    setShowLeftPanel(newValue);
    localStorage.setItem("system-design-showLeftPanel", JSON.stringify(newValue));
  }, [showLeftPanel]);

  const toggleRightPanel = useCallback(() => {
    const newValue = !showRightPanel;
    setShowRightPanel(newValue);
    localStorage.setItem("system-design-showRightPanel", JSON.stringify(newValue));
  }, [showRightPanel]);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleClearDiagram = () => {
    const hasNodes = boardState.nodes && boardState.nodes.length > 0;

    if (hasNodes) {
      setConfirmDialog({
        isOpen: true,
        title: "Clear Diagram?",
        message: "Are you sure you want to start a new attempt? This will clear your current diagram and cannot be undone.",
        onConfirm: async () => {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
          await clearConversation();
          toast.success("Started new attempt");
        },
      });
    } else {
      // No nodes, just clear without confirmation
      clearConversation();
      toast.success("Started new attempt");
    }
  };

  const handleViewSubmission = async (submission: SystemDesignSubmission) => {
    // Auto-save current work as draft before viewing
    const hasCurrentWork = boardState.nodes && boardState.nodes.length > 0;

    if (hasCurrentWork) {
      await saveDraft();
      toast.success("Current work saved as draft");
    }

    // Open preview modal
    setPreviewSubmission(submission);
    setShowPreviewModal(true);
  };

  const handleRestoreDraft = () => {
    if (!hasDraft) return;

    setConfirmDialog({
      isOpen: true,
      title: "Restore Draft?",
      message: "This will replace your current work with the previously saved draft. Continue?",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        await restoreDraft();
        toast.success("Draft restored successfully");
      },
    });
  };

  const handleToggleStar = async () => {
    if (!user || !problemId) return;
    try {
      const { error } = await supabase
        .from("user_starred_problems")
        .select("problem_id")
        .eq("user_id", user.id)
        .eq("problem_id", problemId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const isStarred = !error;

      if (isStarred) {
        await supabase
          .from("user_starred_problems")
          .delete()
          .eq("user_id", user.id)
          .eq("problem_id", problemId);
      } else {
        await supabase
          .from("user_starred_problems")
          .insert({ user_id: user.id, problem_id: problemId });
      }

      toast.success(
        isStarred ? "Removed from favorites" : "Added to favorites",
      );
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            toggleLeftPanel();
            break;
          case "l":
            e.preventDefault();
            toggleRightPanel();
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleLeftPanel, toggleRightPanel]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (evaluation) {
      setShowEvaluation(true);
    }
  }, [evaluation]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success text-success-foreground";
      case "Medium":
        return "bg-amber-500 text-white";
      case "Hard":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (authLoading || specsLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading system design...</p>
        </div>
      </div>
    );
  }

  if (!user || !spec || !problemId) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header - Match ProblemSolverNew styling */}
      <div className="border-b border-border bg-background p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/system-design")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-foreground">
                {spec.title}
              </h1>
              <Badge className={getDifficultyColor(spec.difficulty)}>
                {spec.difficulty}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {spec.category}
              </Badge>
              {/* Removed redundant "System Design" label */}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreDraft}
                className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                title="Restore previously saved draft"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Restore Draft</span>
                <span className="sm:hidden">Draft</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDiagram}
              className="text-muted-foreground hover:text-foreground"
              title="Clear diagram and start fresh"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Clear Diagram</span>
              <span className="sm:hidden">Clear</span>
            </Button>
            <ShortcutsHelp />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleStar}
              className="text-muted-foreground hover:text-foreground"
            >
              {spec.isStarred ? (
                <Star className="w-4 h-4 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - explicit height calculation */}
      <div className="flex-1" style={{ height: "calc(100vh - 81px)" }}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Problem Context & Submissions */}
          {showLeftPanel && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                <div className="h-full border-r border-border bg-background">
                  <Tabs defaultValue="description" className="h-full flex flex-col">
                    <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/50">
                      <TabsTrigger value="description" className="flex-1">
                        Description
                      </TabsTrigger>
                      <TabsTrigger value="submissions" className="flex-1">
                        Submissions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="description" className="flex-1 m-0 overflow-auto">
                      <ProblemContextSidebar spec={spec} />
                    </TabsContent>

                    <TabsContent value="submissions" className="flex-1 m-0 overflow-auto">
                      <SystemDesignSubmissions
                        submissions={submissions}
                        loading={submissionsLoading}
                        error={submissionsError}
                        onViewDiagram={handleViewSubmission}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Middle Panel - Design Canvas */}
          <ResizablePanel defaultSize={showLeftPanel && showRightPanel ? 60 : 80}>
            <div className="h-full overflow-hidden">
              <DesignCanvas
                boardState={boardState}
                onBoardChange={updateBoard}
              />
            </div>
          </ResizablePanel>

          {/* Right Panel - AI Coach Chat */}
          {showRightPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="h-full border-l border-border flex flex-col bg-background">
                  <DesignCoachChat
                    messages={messages}
                    session={session}
                    loading={sessionLoading}
                    isTyping={isTyping}
                    error={error}
                    completeness={completeness}
                    onSendMessage={sendMessage}
                    onClearConversation={clearConversation}
                    onEvaluate={evaluateDesign}
                    isEvaluating={isEvaluating}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Evaluation Modal */}
      {showEvaluation && evaluation && (
        <EvaluationDisplay
          evaluation={evaluation}
          onClose={() => setShowEvaluation(false)}
        />
      )}

      {/* Submission Preview Modal */}
      <SubmissionPreviewModal
        submission={previewSubmission}
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewSubmission(null);
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="destructive"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
      />
    </div>
  );
};

export default SystemDesignSolver;
