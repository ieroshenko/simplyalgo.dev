import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSystemDesignSession } from "@/hooks/useSystemDesignSession";
import { useSystemDesignSpecs } from "@/hooks/useSystemDesignSpecs";
import DesignCanvas from "@/components/system-design/DesignCanvas";
import ProblemContextSidebar from "@/components/system-design/ProblemContextSidebar";
import DesignCoachChat from "@/components/system-design/DesignCoachChat";
import EvaluationDisplay from "@/components/system-design/EvaluationDisplay";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { ArrowLeft, Moon, Sun, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    loading: sessionLoading,
    error,
    isTyping,
    updateBoard,
    sendMessage,
    evaluateDesign,
    clearConversation,
    isEvaluating,
  } = useSystemDesignSession({
    problemId: problemId || "",
    userId: user?.id || "",
  });

  const [showEvaluation, setShowEvaluation] = useState(false);
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
          {/* Left Panel - Problem Context */}
          {showLeftPanel && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                <div className="h-full border-r border-border overflow-y-auto bg-background">
                  <ProblemContextSidebar spec={spec} />
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
    </div>
  );
};

export default SystemDesignSolver;
