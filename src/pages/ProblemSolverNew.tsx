import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import ChatBubbles from "@/components/chat/ChatBubbles";
import ProblemPanel from "@/components/problem/ProblemPanel";
import Notes, { NotesHandle } from "@/components/Notes";
import {
  ArrowLeft,
  Star,
  StarOff,
  Copy,
  Check,
  X,
  Clock,
  Maximize2,
  Moon,
  Sun,
  Brain,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProblems } from "@/hooks/useProblems";
import { useUserStats } from "@/hooks/useUserStats";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useSolutions } from "@/hooks/useSolutions";
import { UserAttemptsService } from "@/services/userAttempts";
import { TestRunnerService } from "@/services/testRunner";
import { TestResult, CodeSnippet } from "@/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import Timer from "@/components/Timer";
import { supabase } from "@/integrations/supabase/client";
// Removed unused insertion utilities - only using AI smart insertion now
import { useCoachingNew } from "@/hooks/useCoachingNew";
import { useTheme } from "@/hooks/useTheme";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import CoachBubble from "@/components/coaching/CoachBubble";
import HighlightOverlay from "@/components/coaching/HighlightOverlay";
import SimpleOverlay from "@/components/coaching/SimpleOverlay";
import FeedbackOverlay from "@/components/coaching/FeedbackOverlay";
import CoachProgress from "@/components/coaching/CoachProgress";
import LoadingSpinner from "@/components/LoadingSpinner";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import Editor from "@monaco-editor/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleTabs, TabPanel } from "@/components/ui/simple-tabs";
import { FlashcardButton } from "@/components/flashcards/FlashcardButton";


const ProblemSolverNew = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { problems, toggleStar, loading, error, refetch } = useProblems(user?.id);
  const { updateStatsOnProblemSolved } = useUserStats(user?.id);
  const { theme, setTheme, isDark } = useTheme();
  const { currentTheme, defineCustomThemes } = useEditorTheme();
  const [activeTab, setActiveTab] = useState("question");
  const [code, setCode] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [testPanelSize, setTestPanelSize] = useState(100);
  const notesRef = useRef<NotesHandle>(null);
  const codeEditorRef = useRef<{
    getValue: () => string;
    setValue: (value: string) => void;
    getPosition: () => { lineNumber: number; column: number } | null;
    setPosition: (pos: { lineNumber: number; column: number }) => void;
    focus: () => void;
    deltaDecorations: (
      oldDecorations: string[],
      newDecorations: unknown[],
    ) => string[];
    getScrollTop: () => number;
    getVisibleRanges: () => unknown[];
  } | null>(null);

  // Panel visibility state
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    const saved = localStorage.getItem("showLeftPanel");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showBottomPanel, setShowBottomPanel] = useState(() => {
    const saved = localStorage.getItem("showBottomPanel");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showRightPanel, setShowRightPanel] = useState(() => {
    const saved = localStorage.getItem("showRightPanel");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Complexity analysis state
  const [complexityResults, setComplexityResults] = useState<Record<string, any>>({});
  const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<string | null>(null);

  // Panel toggle functions
  const toggleLeftPanel = useCallback(() => {
    const newValue = !showLeftPanel;
    setShowLeftPanel(newValue);
    localStorage.setItem("showLeftPanel", JSON.stringify(newValue));
  }, [showLeftPanel]);

  const toggleBottomPanel = useCallback(() => {
    const newValue = !showBottomPanel;
    setShowBottomPanel(newValue);
    localStorage.setItem("showBottomPanel", JSON.stringify(newValue));
    if (!newValue) {
      // show hint after collapsing
      localStorage.setItem("hint-tests-collapsed", "1");
    }
  }, [showBottomPanel]);

  const toggleRightPanel = useCallback(() => {
    const newValue = !showRightPanel;
    setShowRightPanel(newValue);
    localStorage.setItem("showRightPanel", JSON.stringify(newValue));
    if (!newValue) {
      localStorage.setItem("hint-chat-collapsed", "1");
    }
  }, [showRightPanel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            toggleLeftPanel();
            break;
          case "j":
            e.preventDefault();
            toggleBottomPanel();
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
  }, [toggleLeftPanel, toggleBottomPanel, toggleRightPanel]);

  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.loadNotes();
    }
  }, []);

  const problem = problems.find((p) => p.id === problemId);
  const {
    submissions,
    loading: subsLoading,
    error: subsError,
    optimisticAdd,
  } = useSubmissions(user?.id, problem?.id);
  const { solutions, loading: solutionsLoading } = useSolutions(problemId);

  // Coaching system integration
  const {
    coachingState,
    startCoaching,
    stopCoaching,
    submitCoachingCode,
    insertCorrectCode,
    cancelInput,
    closeFeedback,
    startOptimization,
  } = useCoachingNew({
    problemId: problemId || "",
    userId: user?.id || "anonymous",
    problemDescription: problem?.description || "",
    editorRef: codeEditorRef,
    onCodeInsert: async (code: string) => {
      // Wrap the code string in a CodeSnippet for the existing handler
      const snippet: CodeSnippet = {
        id: `coaching-${Date.now()}`,
        code,
        language: "python",
        isValidated: true,
        insertionType: "smart",
        insertionHint: {
          type: "statement",
          scope: "function", 
          description: "AI coaching generated code"
        }
      };
      await handleInsertCodeSnippet(snippet);
    },
  });

  // Track which submission is expanded
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const toggleSubmission = (id: string) => {
    setExpandedSubmissionId((prev) => (prev === id ? null : id));
  };

  // Fullscreen viewer state
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenCode, setFullscreenCode] = useState("");
  const [fullscreenLang, setFullscreenLang] = useState("python");
  const [fullscreenTitle, setFullscreenTitle] = useState("Code");
  const openFullscreen = (code: string, lang: string, title: string) => {
    setFullscreenCode(code);
    setFullscreenLang((lang || "python").toLowerCase());
    setFullscreenTitle(title);
    setFullscreenOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Problem not found
          </h1>
          <Button onClick={() => navigate("/DSA")}>
            Back to Problems
          </Button>
        </div>
      </div>
    );
  }

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

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleAnalyzeComplexity = async (code: string, submissionId: string) => {
    if (!problem || !user) {
      toast.error("Unable to analyze complexity - missing context");
      return;
    }

    setAnalyzingSubmissionId(submissionId);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "analyze_complexity",
          code,
          problem_id: problem.id,
          problem_description: problem.description,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle the response structure from the backend
      const analysis = result.complexityAnalysis || result;
      
      setComplexityResults(prev => ({
        ...prev,
        [submissionId]: {
          time_complexity: analysis.timeComplexity,
          time_explanation: analysis.timeExplanation,
          space_complexity: analysis.spaceComplexity,
          space_explanation: analysis.spaceExplanation,
          analysis: analysis.overallAnalysis
        }
      }));

      toast.success("Complexity analysis complete!");
    } catch (error) {
      console.error("Complexity analysis error:", error);
      toast.error("Failed to analyze complexity. Please try again.");
    } finally {
      setAnalyzingSubmissionId(null);
    }
  };

  const formatRelativeTime = (isoDate: string) => {
    const now = new Date();
    const then = new Date(isoDate);
    const diffMs = now.getTime() - then.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
    return then.toLocaleDateString();
  };

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          return JSON.stringify(JSON.parse(trimmed));
        } catch {
          return value;
        }
      }
      return value;
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value as Record<string, unknown>);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const handleInsertCodeSnippet = async (snippet: CodeSnippet) => {
    console.log("🔧 Inserting code snippet:", snippet);

    if (!codeEditorRef.current) {
      console.error("❌ Code editor ref is not available");
      toast.error("Code editor not ready");
      return;
    }

    try {
      const editor = codeEditorRef.current;
      const currentCode = editor.getValue();
      const position = editor.getPosition();

      const cursorPosition = {
        line: position?.lineNumber ? position.lineNumber - 1 : 0,
        column: position?.column || 0,
      };

      // Use backend AI-guided insertion for all snippets
      let newCodeFromBackend: string | null = null;
      let insertedAtLine: number | undefined;
      let backendRationale: string | undefined;
      
      console.log("🚀 Starting AI-powered insertion:", {
        snippetCode: snippet.code,
        currentCodeLength: currentCode.length,
        cursorPosition,
        snippetType: snippet.insertionHint?.type
      });
      
      try {
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            action: "insert_snippet",
            code: currentCode,
            snippet,
            cursorPosition,
            problemDescription: problem.description,
            // Enhanced context for better insertion decisions
            message: `[ai-chat snippet insertion] Context: User asked for code fix/improvement. Current code may have bugs that need replacement rather than addition.`,
            conversationHistory: [],
          },
        });
        
        console.log("🤖 AI insertion response:", { 
          error: !!error, 
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          newCodeLength: data?.newCode?.length || 0
        });
        
        if (error) throw error;
        if (data && typeof data.newCode === "string") {
          newCodeFromBackend = data.newCode;
          insertedAtLine =
            typeof data.insertedAtLine === "number"
              ? data.insertedAtLine
              : undefined;
          backendRationale = typeof data.rationale === "string" ? data.rationale : undefined;
          
          console.log("✅ AI insertion successful:", {
            insertedAtLine,
            codeLengthChange: newCodeFromBackend.length - currentCode.length,
            rationale: backendRationale || "No rationale provided"
          });
        }
      } catch (e) {
        console.error("❌ AI insertion failed:", e);
        console.error("Error details:", {
          message: (e as Error)?.message,
          stack: (e as Error)?.stack
        });
      }

      // Only use AI insertion - no fallback
      console.log("🤖 AI insertion result:", { 
        success: !!newCodeFromBackend, 
        insertedAt: insertedAtLine,
        codeLength: newCodeFromBackend?.length || 0 
      });

      // Client-side safety: ask before applying destructive replacements
      if (newCodeFromBackend) {
        const shrinkRatio = newCodeFromBackend.length / (currentCode.length || 1);
        const rationaleText = backendRationale || "";
        const looksDestructive =
          shrinkRatio < 0.7 &&
          /replaced conflicting function region|file-level replacement/i.test(
            rationaleText,
          );
        if (looksDestructive && (snippet.insertionType || "smart") !== "replace") {
          const ok = window.confirm(
            "The AI suggests replacing a large portion of your code to insert this snippet. Proceed with replacement?",
          );
          if (!ok) {
            console.warn("User canceled potentially destructive insertion", {
              shrinkRatio,
              rationaleText,
            });
            toast.error("Insertion canceled. No changes applied.");
            newCodeFromBackend = null;
          }
        }
      }

      if (!newCodeFromBackend) {
        toast.error("Code insertion failed. Please try again.");
        return;
      }

      // Only skip if the new code is identical to current code
      if (newCodeFromBackend === currentCode) {
        console.log("ℹ️ New code is identical to current code - no changes needed.", {
          currentLength: currentCode.length,
          newLength: newCodeFromBackend.length,
          rationale: backendRationale,
        });
        toast.success("Code is already correct — no changes made.");
        return;
      }

      console.log("🔄 Updating editor with new code:", {
        oldLength: currentCode.length,
        newLength: newCodeFromBackend.length,
        insertedAtLine,
        rationale: backendRationale,
        codePreview: newCodeFromBackend.substring(0, 300) + "..."
      });

      editor.setValue(newCodeFromBackend);
      setCode(newCodeFromBackend);

      console.log("✅ Editor updated successfully");
    } catch (error) {
      console.error("❌ Failed to insert code snippet:", error);
      toast.error("Failed to insert code snippet");
    }
  };

  const handleRun = async () => {
    if (!user?.id) return;
    setIsRunning(true);
    setTestResults([]);
    setActiveTestCase(0); // Reset to first test case
    // Ensure the test results panel is visible when a run starts
    if (!showBottomPanel) {
      setShowBottomPanel(true);
      localStorage.setItem("showBottomPanel", JSON.stringify(true));
    }

    try {
      await UserAttemptsService.saveDraft(user.id, problem.id, code);
      const response = await TestRunnerService.runCode({
        language: "python",
        code: code,
        testCases: problem.testCases,
        problemId: problem.id,
      });
      setTestResults(response.results);
      setTestPanelSize(150); // Expand test panel when results are received

      const passedCount = response.results.filter((r) => r.passed).length;
      const totalCount = response.results.length;

      if (passedCount === totalCount) {
        toast.success("All tests passed! 🎉");
        const saved = await UserAttemptsService.markProblemSolved(
          user.id,
          problem.id,
          code,
          response.results,
        );
        // Optimistically add to submissions list for instant UI feedback
        if (saved) optimisticAdd(saved);
        await handleProblemSolved(
          problem.difficulty as "Easy" | "Medium" | "Hard",
        );
      } else {
        toast.error(`${passedCount}/${totalCount} test cases passed`);
      }
    } catch (error) {
      toast.error("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    try {
      await UserAttemptsService.submitCode(user.id, problem.id, code);
      toast.success("Solution submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit solution");
    }
  };

  const handleToggleStar = async () => {
    if (!user?.id) return;

    try {
      await toggleStar(problem.id);
      toast.success(
        problem.isStarred ? "Removed from favorites" : "Added to favorites",
      );
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleProblemSolved = async (
    difficulty: "Easy" | "Medium" | "Hard",
  ) => {
    if (!problemId) return;
    await updateStatsOnProblemSolved(difficulty, problemId);
    refetch();
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const leftPanelTabs = [
    { id: "question", label: "Question" },
    { id: "solution", label: "Solution" },
    { id: "submissions", label: "Submissions" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/DSA")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-foreground">
                {problem.title}
              </h1>
              <Badge className={getDifficultyColor(problem.difficulty)}>
                {problem.difficulty}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {problem.category}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Timer />
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
              {problem.isStarred ? (
                <Star className="w-4 h-4 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
            <FlashcardButton
              problemId={problem.id}
              problemStatus={problem.status}
              userId={user?.id}
              className="ml-2"
            />
          </div>
        </div>
      </div>

      {/* Main Content - explicit height calculation */}
      <div className="flex-1" style={{ height: "calc(100vh - 81px)" }}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Problem Description */}
          {showLeftPanel && (
            <>
              <ResizablePanel defaultSize={35} minSize={25}>
                <ProblemPanel
                  problem={problem}
                  problemId={problemId}
                  userId={user?.id}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  leftPanelTabs={leftPanelTabs}
                  notesRef={notesRef}
                  onFullscreenCode={openFullscreen}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Middle Panel - Code Editor & Test Results */}
          <ResizablePanel
            defaultSize={
              showLeftPanel && showRightPanel
                ? 40
                : showLeftPanel || showRightPanel
                  ? 60
                  : 100
            }
            minSize={30}
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                defaultSize={showBottomPanel ? 65 : 100}
                minSize={40}
              >
                <CodeEditor
                  initialCode={problem.functionSignature}
                  problemId={problem.id}
                  onCodeChange={handleCodeChange}
                  editorRef={codeEditorRef}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  isRunning={isRunning}
                  onStartCoaching={() => startCoaching()}
                  onStopCoaching={stopCoaching}
                  isCoachModeActive={coachingState.isCoachModeActive}
                  isCoachingLoading={coachingState.isWaitingForResponse}
                />
              </ResizablePanel>
              {showBottomPanel && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={testPanelSize} minSize={20}>
                    <div className="h-full bg-background border-t border-border flex flex-col">
                      {/* One-time hint for tests panel */}
                      {!showBottomPanel && localStorage.getItem("hint-tests-collapsed") === "1" && (
                        <div className="absolute bottom-3 right-3 z-10">
                          <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground border shadow-sm">
                            Press {/(Mac|iPhone|iPad|iPod)/i.test(navigator.platform || "") ? "⌘" : "Ctrl"}+J to toggle Tests
                          </div>
                        </div>
                      )}
                      {testResults.length === 0 ? (
                        <div className="p-4">
                          <div className="text-sm font-medium text-foreground mb-3">
                            Test Results
                          </div>
                          <div className="font-mono text-sm text-muted-foreground">
                            Click "Run" to test your code...
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col">
                          <div className="px-4 pt-4 pb-2">
                            <div className="text-sm font-medium text-foreground mb-3">
                              Test Results
                            </div>
                            <div className="flex gap-2 mb-3">
                              {testResults.map((result, index) => {
                                let buttonClass = "flex items-center space-x-2 px-3 py-1.5 text-xs font-medium transition-all rounded border-2 ";
                                if (activeTestCase === index) {
                                  buttonClass += result.passed
                                    ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600"
                                    : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600";
                                } else {
                                  buttonClass += result.passed
                                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-500 dark:border-green-800 dark:hover:bg-green-900/20"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-500 dark:border-red-800 dark:hover:bg-red-900/20";
                                }
                                return (
                                <button
                                  key={index}
                                  onClick={() => setActiveTestCase(index)}
                                    className={buttonClass}
                                >
                                  {result.passed ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <X className="w-3 h-3" />
                                  )}
                                  <span>Case {index + 1}</span>
                                </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex-1 px-4 pb-4">
                            {testResults[activeTestCase] && (
                              <div
                                className={`p-4 rounded-lg border-2 ${
                                  testResults[activeTestCase].passed
                                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    {testResults[activeTestCase].passed ? (
                                      <Check className="w-5 h-5 text-green-700 dark:text-green-400" />
                                    ) : (
                                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    )}
                                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                      Test Case {activeTestCase + 1}
                                    </span>
                                    <Badge
                                      className={`text-xs font-semibold px-3 py-1 ${
                                        testResults[activeTestCase].passed
                                          ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600"
                                          : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
                                      }`}
                                    >
                                      {testResults[activeTestCase].passed ? "✅ PASSED" : "❌ FAILED"}
                                    </Badge>
                                  </div>
                                  {testResults[activeTestCase].time && (
                                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                      <Clock className="w-4 h-4" />
                                      <span>{testResults[activeTestCase].time}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                      Input:
                                    </div>
                                    <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">
                                      {renderValue(testResults[activeTestCase].input)}
                                    </pre>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                        Expected Output:
                                      </div>
                                      <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">
                                        {renderValue(testResults[activeTestCase].expected)}
                                      </pre>
                                    </div>

                                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-md">
                                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                        Your Output:
                                      </div>
                                      <pre
                                        className={`text-sm font-mono whitespace-pre overflow-x-auto ${
                                          testResults[activeTestCase].passed
                                            ? "text-green-700 dark:text-green-300"
                                            : "text-red-700 dark:text-red-300"
                                        }`}
                                      >
                                        {renderValue(testResults[activeTestCase].actual) ||
                                          "No output"}
                                      </pre>
                                    </div>
                                  </div>

                                  {testResults[activeTestCase].stderr && (
                                    <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-800">
                                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                                        Error:
                                      </div>
                                      <pre className="text-sm font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                                        {testResults[activeTestCase].stderr}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Right Panel - AI Chat */}
          {showRightPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={25}
                minSize={25}
                onResize={(size) => {
                  localStorage.setItem("ai-chat-width", String(size));
                }}
              >
                <ChatBubbles
                  problemId={problem.id}
                  problemDescription={problem.description}
                  onInsertCodeSnippet={handleInsertCodeSnippet}
                  problemTestCases={problem.testCases}
                  problem={problem}
                  currentCode={code}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Full-screen code viewer */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[90vw] p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">{fullscreenTitle}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="border rounded">
              <Editor
                height="80vh"
                defaultLanguage={fullscreenLang}
                value={fullscreenCode}
                theme={currentTheme}
                onMount={(editor, monaco) => {
                  defineCustomThemes(monaco);
                }}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  lineNumbers: "on",
                  folding: true,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: "none",
                  fontSize: 15,
                  wordWrap: "off",
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coaching Overlays */}
      {coachingState.isCoachModeActive && coachingState.session && (
        <>
          {/* Progress and question now integrated into SimpleOverlay below */}
          
          {/* Enhanced Coaching Overlay */}
          {coachingState.showInputOverlay && coachingState.inputPosition && coachingState.session && (
            <SimpleOverlay
              isVisible={true}
              position={coachingState.inputPosition}
              onValidateCode={(explanation) => {
                // Get code from the highlighted area in the main editor
                const editor = codeEditorRef.current;
                if (!editor) {
                  console.error("Editor not available for code validation");
                  return;
                }
                
                // Get the current code from the editor
                const currentCode = editor.getValue();
                console.log("Validating code from editor:", currentCode);
                
                // Submit the current editor code for validation with optional explanation
                submitCoachingCode(currentCode, explanation || "Code validation from highlighted area");
              }}
              onCancel={cancelInput}
              isValidating={coachingState.isValidating}
              question={coachingState.session?.currentQuestion || ""} // ← This should be empty when completed
              hint={coachingState.session?.currentHint}
              isSessionCompleted={coachingState.session?.isCompleted || false}
              validationResult={coachingState.lastValidation ? {
                isCorrect: coachingState.lastValidation.isCorrect,
                feedback: coachingState.lastValidation.feedback,
                codeToAdd: coachingState.lastValidation.codeToAdd,
                nextStep: coachingState.lastValidation.nextStep,
                nextAction: coachingState.lastValidation.nextAction, // ← Add this
                isOptimizable: coachingState.lastValidation.isOptimizable, // ← Add this
              } : null}
              onInsertCorrectCode={insertCorrectCode}
              onPositionChange={(pos) => {
                // Use the coaching hook's stored position via a dedicated setter in future;
                // for now, rely on showInteractiveQuestion preserving this prop value.
                coachingState.inputPosition = pos as { x: number; y: number } | null;
              }}
              onStartOptimization={(type) => startOptimization(type)} // Pass the type parameter
              onFinishCoaching={stopCoaching}
              isOptimizable={coachingState.isOptimizable || coachingState.lastValidation?.isOptimizable}
              hasAlternative={coachingState.lastValidation?.hasAlternative} // New prop
              hasError={coachingState.feedback?.type === "error" && coachingState.feedback?.message?.includes("AI Coach is temporarily unavailable")}
              onExitCoach={() => {
                console.log("Exiting coach mode due to AI service error");
                stopCoaching();
              }}
              highlightedLine={coachingState.session.highlightArea?.startLine}
              editorHeight={600}
              editorRef={codeEditorRef}
            />
          )}
        </>
      )}

      {/* Loading Spinner for AI Coaching */}
      {coachingState.isWaitingForResponse && (
        <LoadingSpinner 
          message={coachingState.isValidating ? "Validating your code..." : "AI Coach is thinking..."} 
        />
      )}

      {/* Feedback Overlay for coaching errors/success */}
      {coachingState.feedback.show && (
        <FeedbackOverlay
          isVisible={coachingState.feedback.show}
          type={coachingState.feedback.type || "hint"}
          message={coachingState.feedback.message}
          onClose={closeFeedback}
          showConfetti={coachingState.feedback.showConfetti}
        />
      )}
    </div>
  );
};

export default ProblemSolverNew;
