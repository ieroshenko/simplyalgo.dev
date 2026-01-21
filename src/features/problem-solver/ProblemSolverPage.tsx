/**
 * Problem Solver Page - Main component for solving coding problems
 * Refactored to use extracted hooks and components
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import ChatBubbles from "@/components/chat/ChatBubbles";
import ProblemPanel from "@/features/problems/components/ProblemPanel";
import Notes, { NotesHandle } from "@/components/Notes";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useProblems } from "@/features/problems/hooks/useProblems";
import { useProblem } from "@/features/problems/hooks/useProblem";
import { useUserStats } from "@/hooks/useUserStats";
import { useSubmissions } from "@/features/problems/hooks/useSubmissions";
import { useSolutions } from "@/features/problems/hooks/useSolutions";
import { UserAttemptsService } from "@/services/userAttempts";
import { CodeSnippet } from "@/types";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { notifications } from "@/shared/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingNew } from "@/hooks/useCoachingNew";
import { useTheme } from "@/hooks/useTheme";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import type { editor } from "monaco-editor";
import { logger } from "@/utils/logger";
import { OverlayPositionManager } from "@/services/overlayPositionManager";
import { useTrackFeatureTime, Features } from '@/hooks/useFeatureTracking';
import { trackProblemStarted, trackEvent } from '@/services/analytics';

// Demo mode imports
import { DemoModeProvider, useDemoMode } from "@/features/onboarding/DemoModeContext";
import { DemoBanner } from "@/components/onboarding/DemoBanner";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { DEMO_TOUR_STEPS } from "@/features/onboarding/demoTourSteps";

// Feature-local imports
import { ProblemSolverDialogs } from "./components/ProblemSolverDialogs";
import { ProblemSolverCoachingLayer } from "./components/ProblemSolverCoachingLayer";
import { ProblemSolverTestResultsPanel } from "./components/ProblemSolverTestResultsPanel";
import { ProblemSolverHeader } from "./components/ProblemSolverHeader";
import { usePanelState } from "./hooks/usePanelState";
import { useCodeInsertion } from "./hooks/useCodeInsertion";
import { useTestExecution } from "./hooks/useTestExecution";
import { renderValue } from "./utils/problemSolverUtils";
import type { ComplexityAnalysis } from "./types";
import { LEFT_PANEL_TABS } from "./types";

const ProblemSolverNew = () => {
  useTrackFeatureTime(Features.PROBLEM_SOLVER);

  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  // Use problems list for navigation (no test_cases needed)
  const { problems, toggleStar, loading: listLoading, refetch: refetchList } = useProblems(user?.id);
  // Use single problem hook for the solver page (includes test_cases)
  const { problem, loading: problemLoading, refetch: refetchProblem } = useProblem(problemId, user?.id);
  const loading = listLoading || problemLoading;
  const refetch = useCallback(() => {
    refetchList();
    refetchProblem();
  }, [refetchList, refetchProblem]);
  const { updateStatsOnProblemSolved } = useUserStats(user?.id);
  const { theme, setTheme, isDark } = useTheme();
  const { currentTheme, defineCustomThemes } = useEditorTheme();

  // Demo mode hooks - must be called early for use in callbacks
  const {
    isDemoMode,
    isTourActive,
    tourStep,
    nextTourStep,
    prevTourStep,
    skipTour,
    completeTour,
    completeDemo,
  } = useDemoMode();

  // Hard-lock page scrolling for this route.
  // The Problem Solver UI is a multi-pane app; only internal panes (chat/problem/test results)
  // should scroll. When chat history grows, some browsers/layouts can otherwise push scroll to body.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

  // Local state
  const [activeTab, setActiveTab] = useState("question");
  const [code, setCode] = useState("");
  const notesRef = useRef<NotesHandle>(null);
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Ref for demo completion timeout to prevent memory leak on unmount
  const demoCompletionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup demo completion timeout on unmount
  useEffect(() => {
    return () => {
      if (demoCompletionTimeoutRef.current) {
        clearTimeout(demoCompletionTimeoutRef.current);
      }
    };
  }, []);

  // Initialize OverlayPositionManager for coaching overlay positioning
  const overlayPositionManager = useRef<OverlayPositionManager | null>(null);

  useEffect(() => {
    if (problemId) {
      overlayPositionManager.current = new OverlayPositionManager(problemId);
    }
  }, [problemId]);

  // Use extracted hooks
  const {
    panelState,
    toggleLeftPanel,
    toggleBottomPanel,
    toggleRightPanel,
    setShowBottomPanel,
  } = usePanelState();

  // problem is now fetched directly with test_cases via useProblem hook

  const {
    submissions,
    loading: subsLoading,
    error: subsError,
    optimisticAdd,
    watchForAcceptance,
  } = useSubmissions(user?.id, problem?.id);
  const { solutions, loading: solutionsLoading } = useSolutions(problemId);

  // Code insertion hook
  const {
    largeInsertConfirmState,
    setLargeInsertConfirmState,
    replacementState,
    handleInsertCodeSnippet,
    handleConfirmReplacement,
    handleCancelReplacement,
    confirmLargeInsert,
  } = useCodeInsertion({
    codeEditorRef,
    problemDescription: problem?.description || "",
    setCode,
  });

  // Callback for problem solved - handles both regular and demo mode
  const handleProblemSolved = useCallback(async (
    difficulty: "Easy" | "Medium" | "Hard",
  ) => {
    if (!problemId) return;

    // Handle demo mode completion
    if (isDemoMode) {
      trackEvent('demo_problem_solved');

      // Show congratulations toast for everyone in demo mode
      if (hasActiveSubscription) {
        // Admin testing - just show the toast, no redirect
        notifications.success("Congratulations! You solved the demo problem!");
      } else {
        // New user - show toast and redirect to checkout
        notifications.success("Congratulations! You solved the demo problem! Redirecting to checkout...");
        // Small delay to let user see the success message
        // Clear any existing timeout before setting a new one
        if (demoCompletionTimeoutRef.current) {
          clearTimeout(demoCompletionTimeoutRef.current);
        }
        demoCompletionTimeoutRef.current = setTimeout(() => {
          completeDemo();
        }, 2000);
      }
    }

    await updateStatsOnProblemSolved(difficulty, problemId);
    refetch();
  }, [problemId, updateStatsOnProblemSolved, refetch, isDemoMode, hasActiveSubscription, completeDemo]);

  // Test execution hook
  const {
    testResults,
    isRunning,
    activeTestCase,
    setActiveTestCase,
    testPanelSize,
    handleRun,
    handleSubmit,
  } = useTestExecution({
    userId: user?.id,
    problem,
    code,
    onProblemSolved: handleProblemSolved,
    optimisticAdd,
    watchForAcceptance,
    setShowBottomPanel,
  });

  // Complexity analysis state
  const [complexityResults, setComplexityResults] = useState<Record<string, ComplexityAnalysis>>({});
  const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<string | null>(null);

  // Load existing complexity analysis from submissions
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      const results: Record<string, ComplexityAnalysis> = {};
      submissions.forEach(submission => {
        if (submission.complexity_analysis) {
          results[submission.id] = submission.complexity_analysis as ComplexityAnalysis;
        }
      });
      setComplexityResults(results);
    }
  }, [submissions]);

  // Track when user starts a problem
  useEffect(() => {
    if (problem && problemId) {
      trackProblemStarted(
        problemId,
        problem.title,
        problem.difficulty,
        problem.category
      );
    }
  }, [problem, problemId]);

  // Initialize code when problem is loaded
  useEffect(() => {
    if (problem?.functionSignature && code === "") {
      setCode(problem.functionSignature);
    }
  }, [problem?.functionSignature, code]);

  // Load notes
  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.loadNotes();
    }
  }, []);

  // Coaching system integration
  const {
    coachingState,
    startCoaching,
    stopCoaching,
    submitCoachingCode,
    insertCorrectCode,
    cancelInput,
    closeFeedback,
    continueToNextStep,
    startOptimization,
  } = useCoachingNew({
    problemId: problemId || "",
    userId: user?.id || "anonymous",
    problemDescription: problem?.description || "",
    editorRef: codeEditorRef,
    confirmLargeInsert,
    onCodeInsert: async (insertCode: string) => {
      const snippet: CodeSnippet = {
        id: `coaching-${Date.now()}`,
        code: insertCode,
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

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleToggleStar = async () => {
    if (!user?.id || !problem) return;
    try {
      await toggleStar(problem.id);
      notifications.success(
        problem.isStarred ? "Removed from favorites" : "Added to favorites",
      );
    } catch (error) {
      notifications.error("Failed to update favorites");
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleAnalyzeComplexity = async (submissionCode: string, submissionId: string) => {
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
          code: submissionCode,
          problem_id: problem.id,
          problem_description: problem.description,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      const analysis = result.complexityAnalysis || result;

      const analysisData = {
        time_complexity: analysis.timeComplexity,
        time_explanation: analysis.timeExplanation,
        space_complexity: analysis.spaceComplexity,
        space_explanation: analysis.spaceExplanation,
        analysis: analysis.overallAnalysis
      };

      setComplexityResults(prev => ({
        ...prev,
        [submissionId]: analysisData
      }));

      await UserAttemptsService.saveComplexityAnalysis(submissionId, analysisData);
      notifications.success("Complexity analysis complete!");
    } catch (error) {
      logger.error('[ProblemSolverNew] Complexity analysis error', { submissionId, error });
      notifications.error("Failed to analyze complexity. Please try again.");
    } finally {
      setAnalyzingSubmissionId(null);
    }
  };

  // Track demo problem attempts
  const handleDemoRun = useCallback(() => {
    if (isDemoMode) {
      trackEvent('demo_problem_attempted', { action: 'run' });
    }
    handleRun();
  }, [isDemoMode, handleRun]);

  const handleDemoSubmit = useCallback(() => {
    if (isDemoMode) {
      trackEvent('demo_problem_attempted', { action: 'submit' });
    }
    handleSubmit();
  }, [isDemoMode, handleSubmit]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Problem not found
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

  return (
    <div className="h-screen min-h-0 bg-background flex flex-col overflow-hidden">
      {/* Demo Mode Banner */}
      <DemoBanner />

      {/* Header */}
      <ProblemSolverHeader
        problem={problem}
        problems={problems}
        problemId={problemId}
        userId={user?.id}
        isDark={isDark}
        isDemoMode={isDemoMode}
        hasSubscription={hasActiveSubscription}
        onToggleTheme={toggleTheme}
        onToggleStar={handleToggleStar}
      />

      {/* Product Tour Overlay */}
      <ProductTour
        steps={DEMO_TOUR_STEPS}
        currentStep={tourStep}
        isActive={isTourActive}
        onNext={nextTourStep}
        onPrev={prevTourStep}
        onSkip={skipTour}
        onComplete={completeTour}
      />

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
          {/* Left Panel - Problem Description */}
          {panelState.showLeftPanel && (
            <>
              <ResizablePanel defaultSize={35} minSize={25} className="min-h-0">
                <ProblemPanel
                  problem={problem}
                  problemId={problemId}
                  userId={user?.id}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  leftPanelTabs={LEFT_PANEL_TABS as unknown as { id: string; label: string }[]}
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
              panelState.showLeftPanel && panelState.showRightPanel
                ? 40
                : panelState.showLeftPanel || panelState.showRightPanel
                  ? 60
                  : 100
            }
            minSize={30}
            className="min-h-0"
          >
            <ResizablePanelGroup direction="vertical" className="h-full min-h-0">
              <ResizablePanel
                defaultSize={panelState.showBottomPanel ? 65 : 100}
                minSize={40}
                className="min-h-0"
              >
                <CodeEditor
                  initialCode={problem.functionSignature}
                  problemId={problem.id}
                  onCodeChange={handleCodeChange}
                  editorRef={codeEditorRef}
                  onRun={handleDemoRun}
                  onSubmit={handleDemoSubmit}
                  isRunning={isRunning}
                  onStartCoaching={() => startCoaching()}
                  onStopCoaching={stopCoaching}
                  isCoachModeActive={coachingState.isCoachModeActive}
                  isCoachingLoading={coachingState.isWaitingForResponse}
                />
              </ResizablePanel>
              {panelState.showBottomPanel && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={testPanelSize} minSize={20} className="min-h-0">
                    <div className="h-full bg-background border-t border-border flex flex-col">
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
          {panelState.showRightPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={25}
                minSize={25}
                onResize={(size) => {
                  localStorage.setItem("ai-chat-width", String(size));
                }}
                className="min-h-0"
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
        showReplacementDialog={replacementState.showDialog}
        setShowReplacementDialog={(show) => {
          if (!show) handleCancelReplacement();
        }}
        currentCodeForDiff={replacementState.currentCodeForDiff}
        pendingReplacementCode={replacementState.pendingCode}
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
        continueToNextStep={continueToNextStep}
        startOptimization={startOptimization}
        stopCoaching={stopCoaching}
        closeFeedback={closeFeedback}
        onFinishCoaching={async () => {
          if (user?.id && problem?.id && code) {
            logger.debug('[ProblemSolverNew] Coaching completed - saving submission');
            try {
              const saved = await UserAttemptsService.markProblemSolved(
                user.id,
                problem.id,
                code,
                [],
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

// Wrapper component that provides DemoModeContext
const ProblemSolverPage: React.FC = () => {
  return (
    <DemoModeProvider>
      <ProblemSolverNew />
    </DemoModeProvider>
  );
};

export default ProblemSolverPage;
