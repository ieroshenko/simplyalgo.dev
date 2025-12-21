import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Editor from "@monaco-editor/react";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import { notifications } from "@/shared/services/notificationService";
import { FlashcardButton } from "@/components/flashcards/FlashcardButton";
import { logger } from "@/utils/logger";
import { formatRelativeTime } from "./utils";
import type { Submission, ComplexityAnalysis } from "./types";
import type { Problem } from "@/types";

interface SubmissionsTabProps {
    problem: Problem;
    problemId: string;
    userId?: string;
    submissions: Submission[];
    submissionsLoading: boolean;
    submissionsError: Error | null;
    onFullscreenCode?: (code: string, lang: string, title: string) => void;
}

export const SubmissionsTab = ({
    problem,
    problemId,
    userId,
    submissions,
    submissionsLoading,
    submissionsError,
    onFullscreenCode,
}: SubmissionsTabProps) => {
    const { currentTheme, defineCustomThemes } = useEditorTheme();
    const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
    const [complexityResults, setComplexityResults] = useState<Record<string, ComplexityAnalysis>>({});
    const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<string | null>(null);

    // Load existing complexity analysis from submissions
    useState(() => {
        if (submissions && submissions.length > 0) {
            const results: Record<string, ComplexityAnalysis> = {};
            submissions.forEach(submission => {
                if (submission.complexity_analysis) {
                    results[submission.id] = submission.complexity_analysis;
                }
            });
            if (Object.keys(results).length > 0) {
                setComplexityResults(results);
            }
        }
    });

    const toggleSubmission = (id: string) => {
        setExpandedSubmissionId((prev) => (prev === id ? null : id));
    };

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

    const handleAnalyzeComplexity = async (code: string, submissionId: string) => {
        if (!problem || !userId) {
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
                    user_id: userId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.status}`);
            }

            const result = await response.json();
            const analysis = result.complexityAnalysis || result;

            const analysisData: ComplexityAnalysis = {
                time_complexity: analysis.timeComplexity || '',
                time_explanation: analysis.timeExplanation || '',
                space_complexity: analysis.spaceComplexity || '',
                space_explanation: analysis.spaceExplanation || '',
                analysis: analysis.overallAnalysis || ''
            };

            // Save to state for immediate display
            setComplexityResults(prev => ({
                ...prev,
                [submissionId]: analysisData
            }));

            // Save to database for persistence
            const { UserAttemptsService } = await import("@/services/userAttempts");

            // Create a properly typed object for the service
            const analysisForDb = {
                time_complexity: analysisData.time_complexity || '',
                time_explanation: analysisData.time_explanation || '',
                space_complexity: analysisData.space_complexity || '',
                space_explanation: analysisData.space_explanation || '',
                analysis: analysisData.analysis || ''
            };

            const saved = await UserAttemptsService.saveComplexityAnalysis(submissionId, analysisForDb);

            if (!saved) {
                logger.error('[SubmissionsTab] Failed to save analysis to database');
            }

            notifications.success("Complexity analysis complete!");
        } catch (error) {
            logger.error("[SubmissionsTab] Complexity analysis error", { error });
            notifications.error("Failed to analyze complexity. Please try again.");
        } finally {
            setAnalyzingSubmissionId(null);
        }
    };

    return (
        <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
                Submissions
            </h2>
            {submissionsLoading && (
                <div className="text-sm text-muted-foreground">
                    Loading submissions...
                </div>
            )}
            {!submissionsLoading && submissionsError && (
                <div className="text-sm text-red-600">{submissionsError.message}</div>
            )}
            {!submissionsLoading &&
                !submissionsError &&
                submissions.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                        No submissions yet.
                    </div>
                )}
            {!submissionsLoading &&
                !submissionsError &&
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
    );
};
