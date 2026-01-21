import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  Save,
  AlertCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useLeetCodeImport } from "../hooks/useLeetCodeImport";
import { getDifficultyColorClass } from "../utils/leetcode-mapper";
import type { Problem } from "./AdminProblemDialog";

interface LeetCodeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (problem: Problem) => void;
}

export function LeetCodeImportDialog({
  open,
  onOpenChange,
  onImported,
}: LeetCodeImportDialogProps) {
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  const {
    state,
    fetchProblem,
    saveProblem,
    resetState,
    updatePreviewProblem,
    updatePreviewTestCase,
    updatePreviewSolution,
    removePreviewTestCase,
    removePreviewSolution,
  } = useLeetCodeImport();

  const handleClose = () => {
    setUrl("");
    setActiveTab("details");
    resetState();
    onOpenChange(false);
  };

  const handleFetch = async () => {
    await fetchProblem(url);
  };

  const handleSave = async () => {
    if (!state.previewData) return;

    const success = await saveProblem(
      state.previewData.problem,
      state.previewData.testCases,
      state.previewData.solutions
    );

    if (success) {
      const savedProblem: Problem = {
        id: state.previewData.problem.id,
        title: state.previewData.problem.title,
        difficulty: state.previewData.problem.difficulty,
        category_id: state.previewData.problem.category_id || "",
        description: state.previewData.problem.description,
        function_signature: state.previewData.problem.function_signature,
        companies: state.previewData.problem.companies,
        examples: state.previewData.problem.examples,
        constraints: state.previewData.problem.constraints,
        hints: state.previewData.problem.hints,
        recommended_time_complexity:
          state.previewData.problem.recommended_time_complexity || "",
        recommended_space_complexity:
          state.previewData.problem.recommended_space_complexity || "",
      };
      onImported(savedProblem);
      handleClose();
    }
  };

  const problem = state.previewData?.problem;
  const testCases = state.previewData?.testCases || [];
  const solutions = state.previewData?.solutions || [];
  const categories = state.previewData?.categories || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import from LeetCode</DialogTitle>
          <DialogDescription>
            Paste a LeetCode problem URL to fetch and import the problem with
            AI-generated test cases and solutions.
          </DialogDescription>
        </DialogHeader>

        {!state.previewData ? (
          // URL Input Phase
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leetcode-url">LeetCode Problem URL</Label>
              <div className="flex gap-2">
                <Input
                  id="leetcode-url"
                  placeholder="https://leetcode.com/problems/two-sum/"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={state.fetchingProblem}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !state.fetchingProblem) {
                      handleFetch();
                    }
                  }}
                />
                <Button
                  onClick={handleFetch}
                  disabled={state.fetchingProblem || !url.trim()}
                >
                  {state.fetchingProblem ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Example: https://leetcode.com/problems/reverse-integer/
              </p>
            </div>

            {state.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state.fetchingProblem && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Fetching problem from LeetCode and generating test cases &
                  solutions...
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This may take a moment
                </p>
              </div>
            )}
          </div>
        ) : (
          // Preview/Edit Phase
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="testcases">
                  Test Cases ({testCases.length})
                </TabsTrigger>
                <TabsTrigger value="solutions">
                  Solutions ({solutions.length})
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Badge className={getDifficultyColorClass(problem?.difficulty || "")}>
                  {problem?.difficulty}
                </Badge>
                <a
                  href={`https://leetcode.com/problems/${problem?.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View on LeetCode
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {state.error && (
              <Alert variant="destructive" className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1">
              <TabsContent value="details" className="space-y-4 mt-0 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID (Slug)</Label>
                    <Input value={problem?.id || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={problem?.title || ""}
                      onChange={(e) =>
                        updatePreviewProblem({ title: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={problem?.difficulty || "Easy"}
                      onValueChange={(v) =>
                        updatePreviewProblem({
                          difficulty: v as "Easy" | "Medium" | "Hard",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Category{" "}
                      {!problem?.category_id && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Select
                      value={problem?.category_id || ""}
                      onValueChange={(v) =>
                        updatePreviewProblem({ category_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Markdown)</Label>
                  <Textarea
                    className="min-h-[200px] font-mono text-sm"
                    value={problem?.description || ""}
                    onChange={(e) =>
                      updatePreviewProblem({ description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Function Signature</Label>
                  <Textarea
                    className="font-mono text-sm"
                    value={problem?.function_signature || ""}
                    onChange={(e) =>
                      updatePreviewProblem({ function_signature: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Companies (comma-separated)</Label>
                    <Input
                      value={problem?.companies?.join(", ") || ""}
                      onChange={(e) =>
                        updatePreviewProblem({
                          companies: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Google, Amazon, Meta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hints (one per line)</Label>
                    <Textarea
                      className="font-mono text-xs h-20"
                      value={problem?.hints?.join("\n") || ""}
                      onChange={(e) =>
                        updatePreviewProblem({
                          hints: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Constraints (one per line)</Label>
                  <Textarea
                    className="font-mono text-xs h-20"
                    value={problem?.constraints?.join("\n") || ""}
                    onChange={(e) =>
                      updatePreviewProblem({
                        constraints: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Examples ({problem?.examples?.length || 0})
                  </Label>
                  <div className="space-y-2">
                    {problem?.examples?.map((ex, idx) => (
                      <Card key={idx} className="bg-muted/50">
                        <CardContent className="p-3 space-y-1">
                          <div className="text-xs">
                            <span className="font-semibold">Input:</span> {ex.input}
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold">Output:</span> {ex.output}
                          </div>
                          {ex.explanation && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Explanation:</span>{" "}
                              {ex.explanation}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="testcases" className="space-y-4 mt-0 pr-4">
                <p className="text-sm text-muted-foreground">
                  These test cases were generated by AI. Review and edit as needed
                  before importing.
                </p>
                {testCases.map((tc, idx) => (
                  <Card key={idx}>
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium">
                        Generated Test Case {idx + 1}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePreviewTestCase(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Input</Label>
                          <Textarea
                            className="font-mono text-xs h-20"
                            value={tc.input}
                            onChange={(e) =>
                              updatePreviewTestCase(idx, { input: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Expected Output</Label>
                          <Textarea
                            className="font-mono text-xs h-20"
                            value={tc.expected_output}
                            onChange={(e) =>
                              updatePreviewTestCase(idx, {
                                expected_output: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      {tc.explanation && (
                        <div>
                          <Label className="text-xs">Explanation</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tc.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {testCases.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No test cases were generated. You can add them manually after
                    importing.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="solutions" className="space-y-4 mt-0 pr-4">
                <p className="text-sm text-muted-foreground">
                  These solutions were generated by AI. Review and edit as needed
                  before importing.
                </p>
                {solutions.map((sol, idx) => (
                  <Card key={idx}>
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-2">
                        <Input
                          value={sol.title}
                          onChange={(e) =>
                            updatePreviewSolution(idx, { title: e.target.value })
                          }
                          className="h-8 w-48"
                        />
                        <Badge variant="outline" className="text-xs">
                          {sol.approach_type}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePreviewSolution(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Time: {sol.time_complexity}</span>
                        <span>Space: {sol.space_complexity}</span>
                      </div>
                      <div>
                        <Label className="text-xs">Code (Python)</Label>
                        <Textarea
                          className="font-mono text-xs h-40"
                          value={sol.code}
                          onChange={(e) =>
                            updatePreviewSolution(idx, { code: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Explanation</Label>
                        <Textarea
                          className="text-xs h-20"
                          value={sol.explanation}
                          onChange={(e) =>
                            updatePreviewSolution(idx, {
                              explanation: e.target.value,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {solutions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No solutions were generated. You can add them manually after
                    importing.
                  </div>
                )}
              </TabsContent>
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t mt-auto">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUrl("");
                    resetState();
                  }}
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={state.savingProblem || !problem?.category_id}
                >
                  {state.savingProblem ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Import Problem
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
