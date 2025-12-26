import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import type { editor } from "monaco-editor";
import VoiceSelector from "@/features/behavioral/components/VoiceSelector";
import ResumeUpload from "@/features/behavioral/components/ResumeUpload";
import AudioWaveform from "@/features/behavioral/components/AudioWaveform";
import InterviewControls from "@/features/technical-interview/components/InterviewControls";
import InterviewFeedback from "@/features/technical-interview/components/InterviewFeedback";
import { InterviewTimer } from "@/features/technical-interview/components/InterviewTimer";
import { useTechnicalInterview } from "@/features/technical-interview/hooks/useTechnicalInterview";
import { useTechnicalInterviewSession } from "@/features/technical-interview/hooks/useTechnicalInterviewSession";
import { TechnicalInterviewService } from "@/features/technical-interview/services/technicalInterviewService";
import { TestRunnerService } from "@/services/testRunner";
import { TestResult } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { notifications } from "@/shared/services/notificationService";
import LoadingSpinner from "@/components/LoadingSpinner";
import { logger } from "@/utils/logger";
import { getDifficultyColor } from "@/utils/uiUtils";
import { useTrackFeatureTime, Features } from '@/hooks/useFeatureTracking';

const TechnicalInterview = () => {
  useTrackFeatureTime(Features.TECHNICAL_INTERVIEW);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { currentTheme } = useEditorTheme();

  interface TechnicalProblem {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    description: string;
    examples?: Array<{
      input: string;
      output: string;
      explanation?: string;
    }>;
    constraints?: string[];
    testCases: TestResult[];
    functionSignature?: string;
    categories?: {
      name: string;
    };
  }

  interface TechnicalProblemOption {
    id: string;
    title: string;
    difficulty: string;
    categories?: {
      name?: string;
    } | null;
  }

  const [selectedVoice, setSelectedVoice] = useState<string>("sage");
  const [selectedProblemId, setSelectedProblemId] = useState<string>("random");
  const [availableProblems, setAvailableProblems] = useState<TechnicalProblemOption[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [problemSelectorOpen, setProblemSelectorOpen] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [showFeedback, setShowFeedback] = useState(false);
  const [problem, setProblem] = useState<TechnicalProblem | null>(null);
  const [code, setCode] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const interviewStartTimeRef = useRef<Date | null>(null);
  const lastCodeSnapshotRef = useRef<string>("");
  const codeSnapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const {
    sessionId,
    createSession,
    endSession,
    addTranscript,
    saveCodeSnapshot,
    saveTestResults,
    saveFeedback,
    error: sessionError,
  } = useTechnicalInterviewSession();

  const { startInterview, stopInterview, sendCodeUpdate, requestEvaluation, audioAnalyser, timeRemaining, error } = useTechnicalInterview({
    problemTitle: problem?.title || "",
    problemDescription: problem?.description || "",
    problemId: problem?.id || "",
    testCases: problem?.testCases || [],
    voice: selectedVoice,
    onConnectionStatusChange: setConnectionStatus,
    onTranscript: (role, content) => {
      logger.debug('Saving transcript', { component: 'TechnicalInterview', role, contentLength: content.length });
      addTranscript(role, content);
    },
    onTimeUp: () => {
      logger.debug("Time is up, preparing to end interview", { component: 'TechnicalInterview' });
      notifications.info("Time's up! The interviewer is providing feedback...");
      // Wait a bit for AI to finish feedback, then auto-stop
      setTimeout(() => {
        handleStopInterview();
      }, 10000); // 10 seconds for AI to finish
    },
    onFeedbackReceived: async (feedback) => {
      logger.debug("Feedback received from AI", { component: 'TechnicalInterview', passed: feedback.passed, score: feedback.overall_score });
      try {
        if (sessionId) {
          // Save feedback to database
          await saveFeedback({
            problem_solving_score: feedback.problem_solving_score,
            code_quality_score: feedback.code_quality_score,
            communication_score: feedback.communication_score,
            strengths: feedback.strengths,
            areas_for_improvement: feedback.areas_for_improvement,
            detailed_feedback: feedback.detailed_feedback,
            interviewer_notes: feedback.interviewer_notes,
          });

          // Update session with pass/fail and overall score
          const duration = Math.floor(
            (new Date().getTime() - (interviewStartTimeRef.current?.getTime() || 0)) / 1000
          );
          await endSession(duration, feedback.passed, feedback.overall_score);

          notifications.success("Feedback saved!");
        }
      } catch (err) {
        logger.error("Failed to save feedback", err, { component: 'TechnicalInterview' });
        notifications.error("Failed to save feedback");
      }
    },
  });

  // Send code updates to AI when code changes
  useEffect(() => {
    if (isInterviewActive && connectionStatus === "connected" && code) {
      sendCodeUpdate(code);
    }
  }, [code, isInterviewActive, connectionStatus, sendCodeUpdate]);

  // Periodic code snapshots (every 30 seconds)
  useEffect(() => {
    if (isInterviewActive && sessionId) {
      codeSnapshotIntervalRef.current = setInterval(() => {
        if (codeEditorRef.current && code !== lastCodeSnapshotRef.current) {
          logger.debug("Saving periodic code snapshot", { component: 'TechnicalInterview' });
          saveCodeSnapshot(code);
          lastCodeSnapshotRef.current = code;
        }
      }, 30000); // 30 seconds

      return () => {
        if (codeSnapshotIntervalRef.current) {
          clearInterval(codeSnapshotIntervalRef.current);
        }
      };
    }
  }, [isInterviewActive, sessionId, code, saveCodeSnapshot]);

  // Load available problems on mount
  useEffect(() => {
    const loadProblems = async () => {
      try {
        setLoadingProblems(true);
        const problems = await TechnicalInterviewService.getAllEligibleProblems();
        logger.debug("Loaded eligible problems", { component: 'TechnicalInterview', count: problems.length });
        setAvailableProblems(problems);
      } catch (err) {
        logger.error("Failed to load problems", err, { component: 'TechnicalInterview' });
        notifications.error("Failed to load problems");
      } finally {
        setLoadingProblems(false);
      }
    };
    loadProblems();
  }, []);

  const handleStartInterview = async () => {
    if (!user) {
      notifications.error("Please log in to start interview");
      return;
    }

    try {
      const isRandom = selectedProblemId === "random";
      notifications.info(isRandom ? "Selecting a random problem..." : "Loading selected problem...");

      // Get problem (random or specific)
      const selectedProblem = await TechnicalInterviewService.getProblem(selectedProblemId);

      logger.debug('Selected problem', {
        component: 'TechnicalInterview',
        id: selectedProblem.id,
        title: selectedProblem.title
      });

      // Clear any previously saved code - start fresh with function signature
      const freshCode = selectedProblem.functionSignature || "";

      // Clear the code editor immediately
      if (codeEditorRef.current?.setValue) {
        codeEditorRef.current.setValue(freshCode);
      }

      // Create session in database
      await createSession(user.id, selectedProblem.id, selectedVoice);
      interviewStartTimeRef.current = new Date();

      notifications.success(`Interview started: ${selectedProblem.title}`);

      // CRITICAL: Set problem and code state synchronously before starting interview
      // This ensures the useTechnicalInterview hook gets the correct values
      setProblem(selectedProblem);
      setCode(freshCode);
      setIsInterviewActive(true);

      // Wait for React to process state updates (2 render cycles)
      await new Promise(resolve => setTimeout(resolve, 200));

      logger.debug('Starting interview', {
        component: 'TechnicalInterview',
        problemTitle: selectedProblem.title,
        problemId: selectedProblem.id,
        testCaseCount: selectedProblem.testCases?.length || 0
      });

      await startInterview();
    } catch (err) {
      logger.error("Failed to start interview", err, { component: 'TechnicalInterview' });
      notifications.error("Failed to start interview. Please try again.");
      setIsInterviewActive(false);
    }
  };

  const handleStopInterview = useCallback(async () => {
    setIsInterviewActive(false);
    stopInterview();

    // Calculate duration and end session
    if (interviewStartTimeRef.current && sessionId) {
      const duration = Math.floor(
        (new Date().getTime() - interviewStartTimeRef.current.getTime()) / 1000
      );

      // Save final code snapshot
      if (code) {
        await saveCodeSnapshot(code);
      }

      // End session (scores will be updated when AI feedback is parsed)
      await endSession(duration);
      interviewStartTimeRef.current = null;

      // Show feedback after interview ends
      setShowFeedback(true);
    }
  }, [stopInterview, sessionId, code, saveCodeSnapshot, endSession]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleRun = async () => {
    if (!problem || !user?.id) return;

    setIsRunning(true);
    setTestResults([]);
    setActiveTestCase(0);

    try {
      const response = await TestRunnerService.runCode({
        language: "python",
        code: code,
        testCases: problem.testCases,
        problemId: problem.id,
      });

      setTestResults(response.results);

      // Save test results to database
      if (sessionId) {
        await saveTestResults(response.results);
      }

      const passedCount = response.results.filter((r) => r.passed).length;
      const totalCount = response.results.length;

      if (passedCount === totalCount) {
        notifications.success(`All ${totalCount} tests passed! 🎉`);
      } else {
        notifications.error(`${passedCount}/${totalCount} test cases passed`);
      }
    } catch (error) {
      logger.error("Failed to run code", error, { component: 'TechnicalInterview' });
      notifications.error("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };



  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Auto-stop if error occurs
  useEffect(() => {
    if ((error || sessionError) && isInterviewActive) {
      notifications.error(error || sessionError || "An error occurred");
      handleStopInterview();
    }
  }, [error, sessionError, isInterviewActive, handleStopInterview]);

  // Show feedback view if interview ended
  if (showFeedback && sessionId) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Interview Feedback
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Review your interview performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <InterviewFeedback
              sessionId={sessionId}
              onClose={() => {
                setShowFeedback(false);
                setProblem(null);
                setCode("");
                setTestResults([]);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-foreground">
                {problem ? problem.title : "Technical Interview"}
              </h1>
              {problem && (
                <>
                  <Badge className={getDifficultyColor(problem.difficulty)}>
                    {problem.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {problem.category}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Timer */}
            <InterviewTimer timeRemaining={timeRemaining} isActive={isInterviewActive} />

            {/* Connection Status */}
            {isInterviewActive && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" :
                  connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                    "bg-gray-400"
                  }`} />
                <span className="text-sm text-muted-foreground">
                  {connectionStatus === "connected" ? "Connected" :
                    connectionStatus === "connecting" ? "Connecting..." :
                      "Not Connected"}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!isInterviewActive && !problem ? (
          // Setup Screen
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-2xl w-full space-y-6">
              {/* Error Display */}
              {(error || sessionError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error || sessionError}</AlertDescription>
                </Alert>
              )}

              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Mock Technical Interview</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Practice FAANG-style technical interviews with an AI interviewer. You'll have 30 minutes to solve a random problem while the interviewer observes your code and approach.
                    </p>
                  </div>

                  {/* Problem Selection */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Problem Selection</h3>
                    <Popover open={problemSelectorOpen} onOpenChange={setProblemSelectorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={problemSelectorOpen}
                          className="w-full justify-between"
                          disabled={isInterviewActive || loadingProblems}
                        >
                          {loadingProblems ? (
                            "Loading problems..."
                          ) : selectedProblemId === "random" ? (
                            <div className="flex items-center gap-2">
                              <span>🎲</span>
                              <span>Random Problem</span>
                            </div>
                          ) : (
                            availableProblems.find((p) => p.id === selectedProblemId)?.title || "Select a problem"
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search problems..." />
                          <CommandList>
                            <CommandEmpty>No problems found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="random"
                                onSelect={() => {
                                  setSelectedProblemId("random");
                                  setProblemSelectorOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${selectedProblemId === "random" ? "opacity-100" : "opacity-0"
                                    }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">🎲 Random Problem</span>
                                  <span className="text-xs text-muted-foreground">
                                    Surprise me!
                                  </span>
                                </div>
                              </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="All Problems">
                              {availableProblems.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.title} ${p.difficulty} ${p.categories?.name || ''}`}
                                  onSelect={() => {
                                    setSelectedProblemId(p.id);
                                    setProblemSelectorOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${selectedProblemId === p.id ? "opacity-100" : "opacity-0"
                                      }`}
                                  />
                                  <div className="flex flex-col flex-1">
                                    <span className="font-medium">{p.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {p.difficulty} • {p.categories?.name || 'General'}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground mt-2">
                      {availableProblems.length} problems available
                    </p>
                  </div>

                  {/* Voice Selection */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Interviewer Voice</h3>
                    <VoiceSelector
                      value={selectedVoice}
                      onChange={setSelectedVoice}
                      disabled={isInterviewActive}
                    />
                  </div>

                  {/* Start Button */}
                  <InterviewControls
                    isInterviewActive={false}
                    onStart={handleStartInterview}
                    onStop={handleStopInterview}
                  />

                  {/* Instructions */}
                  <Card className="p-6 bg-muted/50">
                    <h3 className="font-semibold mb-3">How it works:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Select your preferred interviewer voice</li>
                      <li>Click "Start Interview" and allow microphone access</li>
                      <li>A random LeetCode problem will be selected for you</li>
                      <li>The AI interviewer will explain the problem and answer questions</li>
                      <li>Code your solution - the interviewer watches in real-time</li>
                      <li>Think out loud and communicate your approach</li>
                      <li>You have 30 minutes to complete the interview</li>
                      <li>Receive comprehensive feedback and scores at the end</li>
                    </ol>
                  </Card>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          // Interview Screen
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Problem Description */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full overflow-auto p-6 bg-background">
                {problem && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold mb-2">{problem.title}</h2>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className={getDifficultyColor(problem.difficulty)}>
                          {problem.difficulty}
                        </Badge>
                        <Badge variant="outline">{problem.category}</Badge>
                      </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap">{problem.description}</div>
                    </div>

                    {problem.examples && problem.examples.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Examples:</h3>
                        {problem.examples.map((example, idx: number) => (
                          <div key={idx} className="bg-muted p-3 rounded-md mb-2">
                            <div className="font-mono text-sm space-y-1">
                              <div><strong>Input:</strong> {example.input}</div>
                              <div><strong>Output:</strong> {example.output}</div>
                              {example.explanation && (
                                <div className="text-muted-foreground">
                                  <strong>Explanation:</strong> {example.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {problem.constraints && problem.constraints.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Constraints:</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {problem.constraints.map((constraint: string, idx: number) => (
                            <li key={idx}>{constraint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Middle Panel - Code Editor & Test Results + Audio Waveform */}
            <ResizablePanel defaultSize={65} minSize={40}>
              <ResizablePanelGroup direction="vertical">
                {/* Code Editor */}
                <ResizablePanel defaultSize={isInterviewActive ? 50 : 60} minSize={30}>
                  <CodeEditor
                    initialCode={problem?.functionSignature || ""}
                    problemId={problem?.id || ""}
                    onCodeChange={handleCodeChange}
                    editorRef={codeEditorRef}
                    onRun={handleRun}
                    isRunning={isRunning}
                    hideSubmit={true}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Test Results or Waveform */}
                <ResizablePanel defaultSize={isInterviewActive ? 30 : 20} minSize={15}>
                  {testResults.length > 0 ? (
                    // Test Results
                    <div className="h-full bg-background border-t border-border overflow-auto">
                      <div className="p-4">
                        <div className="text-sm font-medium text-foreground mb-3">
                          Test Results
                        </div>
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {testResults.map((result, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveTestCase(index)}
                              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium transition-all rounded border-2 ${activeTestCase === index
                                ? result.passed
                                  ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600"
                                  : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600"
                                : result.passed
                                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-500 dark:border-green-800"
                                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-500 dark:border-red-800"
                                }`}
                            >
                              <span>Case {index + 1}</span>
                            </button>
                          ))}
                        </div>

                        {testResults[activeTestCase] && (
                          <div className={`p-4 rounded-lg border-2 ${testResults[activeTestCase].passed
                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                            }`}>
                            <div className="space-y-4">
                              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-md">
                                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                  Input:
                                </div>
                                <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">
                                  {renderValue(testResults[activeTestCase].input)}
                                </pre>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-md">
                                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                    Expected:
                                  </div>
                                  <pre className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                    {renderValue(testResults[activeTestCase].expected)}
                                  </pre>
                                </div>

                                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-md">
                                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                    Your Output:
                                  </div>
                                  <pre className={`text-sm font-mono ${testResults[activeTestCase].passed
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-red-700 dark:text-red-300"
                                    }`}>
                                    {renderValue(testResults[activeTestCase].actual) || "No output"}
                                  </pre>
                                </div>
                              </div>

                              {testResults[activeTestCase].stderr && (
                                <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
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
                  ) : (
                    // Audio Waveform
                    <div className="h-full bg-background border-t border-border p-6">
                      <AudioWaveform
                        isActive={isInterviewActive}
                        connectionStatus={connectionStatus}
                        audioAnalyser={audioAnalyser || undefined}
                      />
                    </div>
                  )}
                </ResizablePanel>

                {isInterviewActive && (
                  <>
                    <ResizableHandle withHandle />
                    {/* Interview Controls at bottom */}
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
                      <div className="h-full flex items-center justify-center bg-background border-t border-border">
                        <InterviewControls
                          isInterviewActive={isInterviewActive}
                          onStart={handleStartInterview}
                          onStop={handleStopInterview}
                          onEvaluate={requestEvaluation}
                        />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default TechnicalInterview;

