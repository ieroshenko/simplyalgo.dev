import { Button } from "@/components/ui/button";
import { SimpleTabs, TabPanel } from "@/components/ui/simple-tabs";
import { Problem } from "@/types";
import Notes, { NotesHandle } from "@/components/Notes";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useSolutions } from "@/hooks/useSolutions";
import { useState } from "react";

interface ProblemPanelProps {
  problem: Problem;
  problemId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  leftPanelTabs: Array<{ id: string; label: string }>;
  notesRef: React.RefObject<NotesHandle>;
  onFullscreenCode?: (code: string, lang: string, title: string) => void;
}

const ProblemPanel = ({
  problem,
  problemId,
  activeTab,
  onTabChange,
  leftPanelTabs,
  notesRef,
  onFullscreenCode,
}: ProblemPanelProps) => {
  const {
    submissions,
    loading: subsLoading,
    error: subsError,
  } = useSubmissions(problemId);
  const {
    solutions,
    loading: solutionsLoading,
  } = useSolutions(problemId);
  
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

  const toggleSubmission = (id: string) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderValue = (value: any): string => {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
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
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{problem.description}</p>
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
                            sol.title
                          )
                        }
                      >
                        Fullscreen
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-muted-foreground mb-4">
                    <p>{sol.explanation}</p>
                  </div>
                  <pre className="text-xs md:text-sm font-mono whitespace-pre overflow-x-auto bg-background p-4 rounded border">
                    {sol.code}
                  </pre>
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
                      className="w-full p-4 text-left hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-medium ${getStatusColor(
                                s.status
                              )}`}
                            >
                              {s.status.replace("_", " ").toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatSubmissionTime(s.submitted_at)}
                            </span>
                          </div>
                          <div className="prose prose-sm max-w-none text-muted-foreground">
                            <p className="text-xs">
                              Runtime: {s.runtime || "N/A"} | Memory: {s.memory || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          {expandedSubmissions.has(s.id) ? "▼" : "▶"}
                        </div>
                      </div>
                    </button>
                    {expandedSubmissions.has(s.id) && (
                      <div className="border-t border-border p-4">
                        <div className="mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openFullscreen(
                                  s.code,
                                  "python",
                                  `Submission ${formatSubmissionTime(s.submitted_at)}`
                                )
                              }
                            >
                              Fullscreen
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs md:text-sm font-mono whitespace-pre overflow-x-auto bg-background p-3 rounded border">
                          {s.code}
                        </pre>
                        {s.test_results && (
                          <div className="mt-3">
                            <div className="prose prose-sm max-w-none text-muted-foreground">
                              <p className="text-xs font-medium">Test Results:</p>
                            </div>
                            <pre className="text-xs font-mono whitespace-pre overflow-x-auto bg-muted p-2 rounded mt-1">
                              {JSON.stringify(s.test_results, null, 2)}
                            </pre>
                          </div>
                        )}
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