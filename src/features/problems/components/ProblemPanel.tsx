import { SimpleTabs, TabPanel } from "@/components/ui/simple-tabs";
import { Button } from "@/components/ui/button";
import { Problem } from "@/types";
import Notes, { NotesHandle } from "@/components/Notes";
import { useSolutions } from "@/features/problems/hooks/useSolutions";
import React from "react";
import Editor from "@monaco-editor/react";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { notifications } from "@/shared/services/notificationService";

// Tab components
import { DescriptionTab } from "./problem-tabs/DescriptionTab";
import { SubmissionsTab } from "./problem-tabs/SubmissionsTab";
import { NotesTab } from "./problem-tabs/NotesTab";

// Types
import type { Submission } from "./problem-tabs/types";

interface ProblemPanelProps {
  problem: Problem;
  problemId: string;
  userId?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  leftPanelTabs: Array<{ id: string; label: string }>;
  notesRef: React.RefObject<NotesHandle>;
  onFullscreenCode?: (code: string, lang: string, title: string) => void;
  submissions: Submission[];
  submissionsLoading: boolean;
  submissionsError: Error | null;
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
  submissionsLoading,
  submissionsError,
}: ProblemPanelProps) => {
  const {
    solutions,
    loading: solutionsLoading,
  } = useSolutions(problemId);
  const { currentTheme, defineCustomThemes } = useEditorTheme();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notifications.success("Copied to clipboard");
    } catch {
      notifications.error("Failed to copy");
    }
  };

  const openFullscreen = (code: string, lang: string, title: string) => {
    if (onFullscreenCode) {
      onFullscreenCode(code, lang, title);
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
        <DescriptionTab problem={problem} />
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
        <SubmissionsTab
          problem={problem}
          problemId={problemId}
          userId={userId}
          submissions={submissions}
          submissionsLoading={submissionsLoading}
          submissionsError={submissionsError}
          onFullscreenCode={onFullscreenCode}
        />
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel value="notes" activeTab={activeTab}>
        <NotesTab problemId={problemId} notesRef={notesRef} />
      </TabPanel>
    </SimpleTabs>
  );
};

export default ProblemPanel;
