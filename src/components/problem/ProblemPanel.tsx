import { Button } from "@/components/ui/button";
import { SimpleTabs, TabPanel } from "@/components/ui/simple-tabs";
import { Badge } from "@/components/ui/badge";
import { Problem } from "@/types";
import Notes, { NotesHandle } from "@/components/Notes";
import { useSolutions } from "@/hooks/useSolutions";
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { toast } from "sonner";
import { FlashcardButton } from "@/components/flashcards/FlashcardButton";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/hooks/useTheme";

interface ProblemPanelProps {
  problem: Problem;
  problemId: string;
  userId?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  leftPanelTabs: Array<{ id: string; label: string }>;
  notesRef: React.RefObject<NotesHandle>;
  onFullscreenCode?: (code: string, lang: string, title: string) => void;
  submissions: any[];
  submissionsLoading: boolean;
  submissionsError: string | null;
}

const ProblemPanel = ({
  problem,
  problemId,
  userId,
  activeTab,
  onTabChange,
  leftPanelTabs,
  notesRef,
  onFullscreenCode,
  submissions,
  submissionsLoading: subsLoading,
  submissionsError: subsError,
}: ProblemPanelProps) => {
  // Submissions are now passed as props from parent (ProblemSolverNew)
  // This ensures realtime subscription stays active regardless of tab
  const {
    solutions,
    loading: solutionsLoading,
  } = useSolutions(problemId);
  const { currentTheme, defineCustomThemes } = useEditorTheme();
  const { isDark } = useTheme();

  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [complexityResults, setComplexityResults] = useState<Record<string, any>>({});
  const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<string | null>(null);

  // Select syntax highlighting theme based on current color scheme
  const syntaxTheme = isDark ? vscDarkPlus : vs;

  // Load existing complexity analysis from submissions
  React.useEffect(() => {
    console.log('🔍 [ProblemPanel] Loading analysis from submissions:', submissions?.length || 0, 'submissions');
    if (submissions && submissions.length > 0) {
      const results: Record<string, any> = {};
      submissions.forEach(submission => {
        console.log('📊 [ProblemPanel] Submission:', submission.id, 'has analysis:', !!submission.complexity_analysis);
        if (submission.complexity_analysis) {
          console.log('✅ [ProblemPanel] Loading analysis:', submission.complexity_analysis);
          results[submission.id] = submission.complexity_analysis;
        }
      });
      console.log('✅ [ProblemPanel] Total loaded analysis:', Object.keys(results).length);
      setComplexityResults(results);
    }
  }, [submissions]);

  const toggleSubmission = (id: string) => {
    setExpandedSubmissionId((prev) => (prev === id ? null : id));
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
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

  const handleAnalyzeComplexity = async (code: string, submissionId: string) => {
    if (!problem || !userId) {
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
          user_id: userId,
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
      console.log('💾 [ProblemPanel] Saving analysis for submission:', submissionId);
      console.log('📝 [ProblemPanel] Analysis data:', analysisData);
      const { UserAttemptsService } = await import("@/services/userAttempts");
      const saved = await UserAttemptsService.saveComplexityAnalysis(submissionId, analysisData);
      console.log('✅ [ProblemPanel] Save result:', saved ? 'Success' : 'Failed');

      if (!saved) {
        console.error('❌ [ProblemPanel] Failed to save analysis to database');
      }

      toast.success("Complexity analysis complete!");
    } catch (error) {
      console.error("Complexity analysis error:", error);
      toast.error("Failed to analyze complexity. Please try again.");
    } finally {
      setAnalyzingSubmissionId(null);
    }
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

  const openFullscreen = (code: string, lang: string, title: string) => {
    if (onFullscreenCode) {
      onFullscreenCode(code, lang, title);
    }
  };

  const formatSubmissionTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "text-green-600";
      case "wrong_answer":
        return "text-red-600";
      case "time_limit_exceeded":
        return "text-orange-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <SimpleTabs
      tabs={leftPanelTabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
    >
      {/* Question Tab */}
      <TabPanel value="question" activeTab={activeTab}>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Problem Description
            </h2>
            <div className="prose prose-sm max-w-none text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:bg-transparent prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:border prose-img:border-border prose-strong:text-foreground prose-strong:font-semibold prose-headings:text-foreground">
              <ReactMarkdown
                components={{
                  code({ inline, className, children }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={syntaxTheme}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: "0.375rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  // Enhanced image rendering with responsive sizing and dark mode support
                  img({ src, alt }: any) {
                    return (
                      <div className="my-4 p-3 bg-white dark:bg-gray-100 rounded-lg border border-border">
                        <img
                          src={src}
                          alt={alt || "Problem illustration"}
                          className="max-w-full h-auto rounded shadow-sm mx-auto"
                          style={{
                            maxHeight: "400px",
                            objectFit: "contain",
                          }}
                          loading="lazy"
                        />
                      </div>
                    );
                  },
                }}
              >
                {problem.description}
              </ReactMarkdown>
            </div>
          </div>
          {problem.examples && problem.examples.length > 0 && (
            <div>
              <h3 className="text-md font-semibold text-foreground mb-3">
                Examples
              </h3>
              <div className="space-y-4">
                {problem.examples.map((example, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 p-4 rounded-lg"
                  >
                    <div className="space-y-2 font-mono text-sm">
                      <div>
                        <span className="font-semibold">Input:</span>
                        <pre className="mt-1 text-xs md:text-sm font-mono whitespace-pre overflow-x-auto bg-background p-2 rounded border">
                          {renderValue(example.input)}
                        </pre>
                      </div>
                      <div>
                        <span className="font-semibold">Output:</span>
                        <pre className="mt-1 text-xs md:text-sm font-mono whitespace-pre overflow-x-auto bg-background p-2 rounded border">
                          {renderValue(example.output)}
                        </pre>
                      </div>
                      {example.explanation && (
                        <div>
                          <span className="font-semibold">Explanation:</span>
                          <div className="prose prose-sm max-w-none text-muted-foreground mt-1">
                            <p>{example.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Complexity */}
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">
              Recommended Time & Space Complexity
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Time: {problem.recommendedTimeComplexity || "—"}
              </li>
              <li>
                • Space: {problem.recommendedSpaceComplexity || "—"}
              </li>
            </ul>
          </div>
        </div>
      </TabPanel>

      {/* Solution Tab */}
      <TabPanel value="solution" activeTab={activeTab}>
        <div className="space-y-6">
          {solutionsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading solutions...
            </div>
          ) : solutions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No curated solutions yet.
            </div>
          ) : (
            solutions.map((sol, idx) => (
              <div key={idx}>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {idx + 1}. {sol.title}
                </h2>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex space-x-2">
                      <Button variant="default" size="sm">
                        Python
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openFullscreen(
                            sol.code,
                            "python",
                            `${problem.title} — ${sol.title}`,
                          )
                        }
                        className="h-7 px-2 text-xs"
                      >
                        Maximize
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(sol.code)}
                        className="h-7 px-2 text-xs"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded overflow-hidden">
                    <Editor
                      height={`${Math.max(120, Math.min(500, (sol.code.split('\n').length * 22) + 40))}px`}
                      defaultLanguage="python"
                      value={sol.code}
                      theme={currentTheme}
                      onMount={(editor, monaco) => {
                        defineCustomThemes(monaco);
                      }}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        lineNumbers: "off",
                        folding: false,
                        scrollBeyondLastLine: false,
                        renderLineHighlight: "none",
                        fontSize: 15,
                        wordWrap: "on",
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    Time & Space Complexity
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Time complexity: {sol.time_complexity}</li>
                    <li>• Space complexity: {sol.space_complexity}</li>
                  </ul>
                  {sol.explanation && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {sol.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </TabPanel>

      {/* Submissions Tab */}
      <TabPanel value="submissions" activeTab={activeTab}>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Submissions
          </h2>
          {subsLoading && (
            <div className="text-sm text-muted-foreground">
              Loading submissions...
            </div>
          )}
          {!subsLoading && subsError && (
            <div className="text-sm text-red-600">{subsError}</div>
          )}
          {!subsLoading &&
            !subsError &&
            submissions.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No submissions yet.
              </div>
            )}
          {!subsLoading &&
            !subsError &&
            submissions.length > 0 && (
              <div className="space-y-3">
                {submissions.map((s) => (
                  <div
                    key={s.id}
                    className="bg-muted/50 rounded-lg border border-border"
                  >
                    <button
                      onClick={() => toggleSubmission(s.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center space-x-3 text-left">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color:
                              s.status === "passed"
                                ? "#388e3c"
                                : s.status === "failed"
                                  ? "#d32f2f"
                                  : "#555",
                          }}
                        >
                          {s.status === "passed"
                            ? "Accepted"
                            : s.status.charAt(0).toUpperCase() +
                            s.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{s.language || "Python"}</span>
                        <span>
                          {formatRelativeTime(s.created_at)}
                        </span>
                      </div>
                    </button>
                    {expandedSubmissionId === s.id && (
                      <div className="px-3 pb-3">
                        <div className="bg-background border rounded">
                          <div className="flex flex-col gap-2 px-3 py-2 border-b sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                              {s.language || "Python"}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto sm:justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openFullscreen(
                                    s.code,
                                    s.language || "python",
                                    `${problem.title} — Submission`,
                                  )
                                }
                                className="h-7 px-2 text-xs min-w-0"
                              >
                                Maximize
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(s.code)}
                                className="h-7 px-2 text-xs min-w-0"
                              >
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAnalyzeComplexity(s.code, s.id)}
                                disabled={analyzingSubmissionId === s.id}
                                className="h-7 px-2 text-xs min-w-0"
                              >
                                {analyzingSubmissionId === s.id ? (
                                  "Analyzing..."
                                ) : (
                                  "Analyze"
                                )}
                              </Button>
                              <FlashcardButton
                                problemId={problemId}
                                problemStatus="solved"
                                userId={userId}
                                submissionCode={s.code}
                                submissionId={s.id}
                                variant="submission"
                                className="h-7 px-2 text-xs min-w-0 whitespace-normal"
                              />
                            </div>
                          </div>
                          <Editor
                            height={`${Math.max(s.code.split('\n').length * 20 + 40, 100)}px`}
                            defaultLanguage={(
                              s.language || "python"
                            ).toLowerCase()}
                            value={s.code}
                            theme={currentTheme}
                            onMount={(editor, monaco) => {
                              defineCustomThemes(monaco);
                            }}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              lineNumbers: "off",
                              folding: false,
                              scrollBeyondLastLine: false,
                              renderLineHighlight: "none",
                              fontSize: 15,
                              wordWrap: "on",
                            }}
                          />

                          {/* Complexity Analysis Results */}
                          {complexityResults[s.id] && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                              <h4 className="font-medium text-sm text-foreground mb-3">
                                Complexity Analysis
                              </h4>
                              <div className="space-y-3">
                                {/* Time Complexity */}
                                <div>
                                  <div className="text-sm font-medium text-foreground mb-1">
                                    Time Complexity:
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {complexityResults[s.id].time_complexity || "N/A"}
                                    </Badge>
                                  </div>
                                  {complexityResults[s.id].time_explanation && (
                                    <p className="text-sm text-foreground/80">
                                      {complexityResults[s.id].time_explanation}
                                    </p>
                                  )}
                                </div>

                                {/* Space Complexity */}
                                <div>
                                  <div className="text-sm font-medium text-foreground mb-1">
                                    Space Complexity:
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {complexityResults[s.id].space_complexity || "N/A"}
                                    </Badge>
                                  </div>
                                  {complexityResults[s.id].space_explanation && (
                                    <p className="text-sm text-foreground/80">
                                      {complexityResults[s.id].space_explanation}
                                    </p>
                                  )}
                                </div>

                                {/* Overall Analysis */}
                                {complexityResults[s.id].analysis && (
                                  <div>
                                    <div className="text-sm font-medium text-foreground mb-1">
                                      Analysis:
                                    </div>
                                    <p className="text-sm text-foreground/80">
                                      {complexityResults[s.id].analysis}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel value="notes" activeTab={activeTab}>
        <Notes problemId={problemId} ref={notesRef} />
      </TabPanel>
    </SimpleTabs>
  );
};

export default ProblemPanel;
