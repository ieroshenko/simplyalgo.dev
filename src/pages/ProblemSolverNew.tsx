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
import { ProblemSelector } from "@/components/problem/ProblemSelector";
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
import { notifications } from "@/shared/services/notificationService";
import Timer from "@/components/Timer";
import FeedbackButton from "@/components/FeedbackButton";
import { supabase } from "@/integrations/supabase/client";
// Removed unused insertion utilities - only using AI smart insertion now
import { useCoachingNew } from "@/hooks/useCoachingNew";
import { useTheme } from "@/hooks/useTheme";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import CoachBubble from "@/components/coaching/CoachBubble";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { logger } from "@/utils/logger";
import { OverlayPositionManager } from "@/services/overlayPositionManager";
import { useFeatureTracking, Features } from "@/hooks/useFeatureTracking";
import { trackEvent, trackCodeRun, AnalyticsEvents } from "@/services/analytics";
import { SimpleTabs, TabPanel } from "@/components/ui/simple-tabs";
import { FlashcardButton } from "@/components/flashcards/FlashcardButton";
import { ProblemSolverDialogs } from "@/pages/ProblemSolverDialogs";
import { ProblemSolverCoachingLayer } from "@/pages/ProblemSolverCoachingLayer";
import { ProblemSolverTestResultsPanel } from "@/pages/ProblemSolverTestResultsPanel";


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
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Initialize OverlayPositionManager for coaching overlay positioning
  const overlayPositionManager = useRef<OverlayPositionManager | null>(null);

  // Initialize position manager when problem ID is available
  useEffect(() => {
    if (problemId) {
      overlayPositionManager.current = new OverlayPositionManager(problemId);
    }
  }, [problemId]);



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
  interface ComplexityAnalysis {
    time_complexity: string;
    time_explanation: string;
    space_complexity: string;
    space_explanation: string;
    analysis: string;
  }
  const [complexityResults, setComplexityResults] = useState<Record<string, ComplexityAnalysis>>({});
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

  logger.debug('ProblemSolverNew init', {
    problemId,
    problemsCount: problems.length,
    problemIds: problems.map((p) => p.id),
  });

  const problem = problems.find((p) => p.id === problemId);

  logger.debug('ProblemSolverNew problem resolved', { problemId, title: problem?.title });

  const {
    submissions,
    loading: subsLoading,
    error: subsError,
    optimisticAdd,
    watchForAcceptance,
  } = useSubmissions(user?.id, problem?.id);
  const { solutions, loading: solutionsLoading } = useSolutions(problemId);

  // Load existing complexity analysis from submissions
  useEffect(() => {
    logger.debug('[ProblemSolverNew] Loading analysis from submissions', { count: submissions?.length || 0 });
    if (submissions && submissions.length > 0) {
      const results: Record<string, ComplexityAnalysis> = {};
      submissions.forEach(submission => {
        logger.debug('[ProblemSolverNew] Submission analysis presence', { submissionId: submission.id, hasAnalysis: !!submission.complexity_analysis });
        if (submission.complexity_analysis) {
          // Avoid logging full analysis payload to keep logs concise
          logger.debug('[ProblemSolverNew] Loading analysis for submission', { submissionId: submission.id });
          results[submission.id] = submission.complexity_analysis as ComplexityAnalysis;
        }
      });
      logger.debug('[ProblemSolverNew] Total loaded analysis', { total: Object.keys(results).length });
      setComplexityResults(results);
    }
  }, [submissions]);

  // Initialize code when problem is loaded
  useEffect(() => {
    if (problem?.functionSignature && code === "") {
      setCode(problem.functionSignature);
    }
  }, [problem?.functionSignature, code]);

  const [largeInsertConfirmState, setLargeInsertConfirmState] = useState<{
    open: boolean;
    lineCount: number;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    lineCount: 0,
    resolve: null,
  });

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
    confirmLargeInsert: ({ lineCount }) => {
      return new Promise<boolean>((resolve) => {
        setLargeInsertConfirmState({
          open: true,
          lineCount,
          resolve,
        });
      });
    },
    onCodeInsert: async (code: string, cursorPosition?: { line: number; column: number }, insertionType?: string, context?: { isCoachingCorrection?: boolean; feedback?: string }) => {
      // Wrap the code string in a CodeSnippet for the existing handler
      const snippet: CodeSnippet = {
        id: `coaching-${Date.now()}`,
        code,
        language: "python",
        isValidated: true,
        insertionType: (insertionType as "smart" | "cursor" | "append" | "prepend" | "replace") || "smart",
        insertionHint: {
          type: "statement",
          scope: "function",
          description: context?.isCoachingCorrection
            ? `AI coaching correction: ${context.feedback || 'Code fix'}`
            : "AI coaching generated code"
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

  // Replacement Confirmation State
  const [showReplacementDialog, setShowReplacementDialog] = useState(false);
  const [pendingReplacementCode, setPendingReplacementCode] = useState<string | null>(null);
  const [currentCodeForDiff, setCurrentCodeForDiff] = useState("");

  const handleConfirmReplacement = () => {
    if (!pendingReplacementCode || !codeEditorRef.current) return;

    const currentCode = codeEditorRef.current.getValue();
    const newCodeFromBackend = pendingReplacementCode;

    if (newCodeFromBackend === currentCode) {
      logger.info('[ProblemSolverNew] New code identical to current code', {
        currentLength: currentCode.length,
        newLength: newCodeFromBackend.length,
      });
      notifications.success("Code is already correct — no changes made.");
    } else {
      logger.info('[ProblemSolverNew] Updating editor with new code', {
        oldLength: currentCode.length,
        newLength: newCodeFromBackend.length,
        codePreview: newCodeFromBackend.substring(0, 300) + "..."
      });

      codeEditorRef.current.setValue(newCodeFromBackend);
      setCode(newCodeFromBackend);

      logger.info('[ProblemSolverNew] Editor updated successfully');
    }

    setShowReplacementDialog(false);
    setPendingReplacementCode(null);
  };

  const handleCancelReplacement = () => {
    setShowReplacementDialog(false);
    setPendingReplacementCode(null);
    notifications.error("Insertion canceled. No changes applied.");
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
          <Button onClick={() => navigate("/problems")}>
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
      notifications.success("Copied to clipboard");
    } catch {
      notifications.error("Failed to copy");
    }
  };

  const handleAnalyzeComplexity = async (code: string, submissionId: string) => {
    if (!problem || !user) {
      notifications.error("Unable to analyze complexity - missing context");
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

      const analysisData = {
        time_complexity: analysis.timeComplexity,
        time_explanation: analysis.timeExplanation,
        space_complexity: analysis.spaceComplexity,
        space_explanation: analysis.spaceExplanation,
        analysis: analysis.overallAnalysis
      };

      // Save to state for immediate display
      setComplexityResults(prev => ({
        ...prev,
        [submissionId]: analysisData
      }));

      // Save to database for persistence
      logger.info('[ProblemSolverNew] Saving analysis for submission', { submissionId });
      const saved = await UserAttemptsService.saveComplexityAnalysis(submissionId, analysisData);
      logger.debug('[ProblemSolverNew] Save result', { submissionId, success: !!saved });

      if (!saved) {
        logger.error('[ProblemSolverNew] Failed to save analysis to database', { submissionId, analysisData });
      }

      notifications.success("Complexity analysis complete!");
    } catch (error) {
      logger.error('[ProblemSolverNew] Complexity analysis error', { submissionId, error });
      notifications.error("Failed to analyze complexity. Please try again.");
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
    logger.info('[ProblemSolverNew] Inserting code snippet', { snippet });

    if (!codeEditorRef.current) {
      logger.error('[ProblemSolverNew] Code editor ref is not available');
      notifications.error("Code editor not ready");
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

      logger.debug('[ProblemSolverNew] Starting AI-powered insertion', {
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
            message: snippet.insertionHint?.description?.includes('coaching correction')
              ? `[coaching correction] Fix specific issue: ${snippet.insertionHint.description}. Replace incorrect code with corrected version.`
              : `[ai-chat snippet insertion] Context: User asked for code fix/improvement. Current code may have bugs that need replacement rather than addition.`,
            conversationHistory: [],
          },
        });

        logger.debug('[ProblemSolverNew] AI insertion response', {
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

          logger.info('[ProblemSolverNew] AI insertion successful', {
            insertedAtLine,
            codeLengthChange: newCodeFromBackend.length - currentCode.length,
            rationale: backendRationale || "No rationale provided"
          });
        }
      } catch (e) {
        logger.error('[ProblemSolverNew] AI insertion failed', { error: e });
        logger.debug('[ProblemSolverNew] AI insertion error details', {
          message: (e as Error)?.message,
          stack: (e as Error)?.stack
        });
      }

      // Only use AI insertion - no fallback
      logger.debug('[ProblemSolverNew] AI insertion result', {
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
          setPendingReplacementCode(newCodeFromBackend);
          setCurrentCodeForDiff(currentCode);
          setShowReplacementDialog(true);
          return;
        }
      }

      if (!newCodeFromBackend) {
        notifications.error("Code insertion failed. Please try again.");
        return;
      }

      // Only skip if the new code is identical to current code AND the AI didn't report making changes
      const aiMadeChanges = insertedAtLine !== undefined || (backendRationale && backendRationale.length > 0);
      const codesAreIdentical = newCodeFromBackend === currentCode;

      if (codesAreIdentical && !aiMadeChanges) {
        logger.info('[ProblemSolverNew] New code identical to current code, no AI changes reported', {
          currentLength: currentCode.length,
          newLength: newCodeFromBackend.length,
          rationale: backendRationale,
        });
        notifications.success("Code is already correct — no changes made.");
        return;
      }

      // If codes look identical but AI says it made changes, trust the AI and apply anyway
      if (codesAreIdentical && aiMadeChanges) {
        logger.warn('[ProblemSolverNew] Codes appear identical but AI reported changes', {
          insertedAtLine,
          rationale: backendRationale,
          currentLength: currentCode.length,
          newLength: newCodeFromBackend.length,
        });
        // Continue to apply the code - the AI might have made subtle changes
      }

      logger.info('[ProblemSolverNew] Updating editor with new code', {
        oldLength: currentCode.length,
        newLength: newCodeFromBackend.length,
        insertedAtLine,
        rationale: backendRationale,
        codesAreIdentical,
        aiMadeChanges,
        codePreview: newCodeFromBackend.substring(0, 300) + "..."
      });

      editor.setValue(newCodeFromBackend);
      setCode(newCodeFromBackend);

      logger.info('[ProblemSolverNew] Editor updated successfully');

      // Provide feedback about what was inserted
      if (insertedAtLine !== undefined) {
        notifications.success(`Code inserted at line ${insertedAtLine}`);
      } else if (backendRationale) {
        notifications.success("Code updated successfully");
      } else {
        notifications.success("Code inserted");
      }
    } catch (error) {
      logger.error('[ProblemSolverNew] Failed to insert code snippet', { error });
      notifications.error("Failed to insert code snippet");
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
      setTestPanelSize(250); // Expand test panel when results are received

      const passedCount = response.results.filter((r) => r.passed).length;
      const totalCount = response.results.length;

      if (passedCount === totalCount) {
        notifications.success("All tests passed! 🎉");
        const saved = await UserAttemptsService.markProblemSolved(
          user.id,
          problem.id,
          code,
          response.results,
        );
        // Optimistically add to submissions list for instant UI feedback
        if (saved) {
          optimisticAdd(saved);
        }
        // Ensure the submissions tab reflects this run even if realtime misses
        watchForAcceptance(30_000, 2_000);
        await handleProblemSolved(
          problem.difficulty as "Easy" | "Medium" | "Hard",
        );
      } else {
        notifications.error(`${passedCount}/${totalCount} test cases passed`);
      }
    } catch (error) {
      notifications.error("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    try {
      await UserAttemptsService.submitCode(user.id, problem.id, code);
      notifications.success("Solution submitted successfully!");
      // Start watching for the asynchronous grader to mark as accepted
      watchForAcceptance(60_000, 2_000);
    } catch (error) {
      notifications.error("Failed to submit solution");
    }
  };

  const handleToggleStar = async () => {
    if (!user?.id) return;

    try {
      await toggleStar(problem.id);
      notifications.success(
        problem.isStarred ? "Removed from favorites" : "Added to favorites",
      );
    } catch (error) {
      notifications.error("Failed to update favorites");
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
              onClick={() => navigate("/problems")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <ProblemSelector
              problems={problems}
              currentProblemId={problemId}
            />
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
            <FeedbackButton />
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
                  submissions={submissions}
                  submissionsLoading={subsLoading}
                  submissionsError={subsError}
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
                      <ProblemSolverTestResultsPanel
                        testResults={testResults}
                        activeTestCase={activeTestCase}
                        setActiveTestCase={setActiveTestCase}
                        renderValue={renderValue}
                      />
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

      <ProblemSolverDialogs
        fullscreenOpen={fullscreenOpen}
        setFullscreenOpen={setFullscreenOpen}
        fullscreenTitle={fullscreenTitle}
        fullscreenCode={fullscreenCode}
        fullscreenLang={fullscreenLang}
        currentTheme={currentTheme}
        defineCustomThemes={defineCustomThemes}
        showReplacementDialog={showReplacementDialog}
        setShowReplacementDialog={setShowReplacementDialog}
        currentCodeForDiff={currentCodeForDiff}
        pendingReplacementCode={pendingReplacementCode}
        onConfirmReplacement={handleConfirmReplacement}
        onCancelReplacement={handleCancelReplacement}
        largeInsertConfirmState={largeInsertConfirmState}
        setLargeInsertConfirmState={setLargeInsertConfirmState}
      />

      <ProblemSolverCoachingLayer
        coachingState={coachingState}
        codeEditorRef={codeEditorRef}
        submitCoachingCode={submitCoachingCode}
        cancelInput={cancelInput}
        insertCorrectCode={insertCorrectCode}
        startOptimization={startOptimization}
        stopCoaching={stopCoaching}
        closeFeedback={closeFeedback}
        onFinishCoaching={async () => {
          // When coaching completes successfully, save as submission
          if (user?.id && problem?.id && code) {
            logger.debug('[ProblemSolverNew] Coaching completed - saving submission');
            try {
              const saved = await UserAttemptsService.markProblemSolved(
                user.id,
                problem.id,
                code,
                [], // No test results available for coaching completion
              );
              if (saved) {
                optimisticAdd(saved);
              }
              watchForAcceptance(30_000, 2_000);
              await handleProblemSolved(
                problem.difficulty as "Easy" | "Medium" | "Hard",
              );
              notifications.success("Solution saved to submissions! 🎉");
            } catch (error) {
              logger.error('[ProblemSolverNew] Failed to save coaching completion', { error });
              notifications.error("Failed to save submission");
            }
          }
          stopCoaching();
        }}
        overlayPositionManager={overlayPositionManager.current}
        problemId={problemId}
      />
    </div>
  );
};

export default ProblemSolverNew;
