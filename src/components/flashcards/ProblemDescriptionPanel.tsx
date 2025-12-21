import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Lightbulb } from "lucide-react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { logger } from "@/utils/logger";
import type { ProblemData, ReviewSession } from "./types";
import type { FlashcardDeck } from "@/types/api";

interface ProblemDescriptionPanelProps {
    session: ReviewSession | null;
    problemData: ProblemData | null;
    currentCard: FlashcardDeck | null;
    currentCardIndex: number;
    showSolution: boolean;
    onToggleSolution: () => void;
    editorTheme: string;
    syntaxTheme: typeof vscDarkPlus | typeof vs;
    defineCustomThemes: (monaco: unknown) => void;
    onEditorReady: () => void;
}

export const ProblemDescriptionPanel = ({
    session,
    problemData,
    currentCard,
    currentCardIndex,
    showSolution,
    onToggleSolution,
    editorTheme,
    syntaxTheme,
    defineCustomThemes,
    onEditorReady,
}: ProblemDescriptionPanelProps) => {
    return (
        <div className="w-1/2 p-6 border-r bg-muted/20 overflow-y-auto">
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-lg mb-2">
                        {session?.problemTitle}
                    </h3>
                    <Badge variant="outline" className="mb-4">
                        {session?.solutionTitle}
                    </Badge>
                </div>

                {/* Problem Description */}
                {problemData ? (
                    <div className="space-y-4">
                        <div className="prose prose-sm max-w-none text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:bg-transparent prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:border prose-img:border-border prose-strong:text-foreground prose-strong:font-semibold prose-headings:text-foreground">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
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
                                    img({ src, alt }: { src?: string; alt?: string }) {
                                        return (
                                            <div className="my-4 p-3 bg-white dark:bg-gray-100 rounded-lg border border-border">
                                                <img
                                                    src={src}
                                                    alt={alt || "Problem illustration"}
                                                    className="max-w-full h-auto rounded shadow-sm mx-auto"
                                                    style={{
                                                        maxHeight: "300px",
                                                        objectFit: "contain",
                                                    }}
                                                    loading="lazy"
                                                />
                                            </div>
                                        );
                                    },
                                }}
                            >
                                {problemData.description}
                            </ReactMarkdown>
                        </div>

                        {/* Examples */}
                        {problemData.examples && problemData.examples.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm mb-2">Examples:</h4>
                                <div className="space-y-2">
                                    {problemData.examples.slice(0, 2).map((example, idx: number) => (
                                        <div key={idx} className="bg-muted/50 p-3 rounded text-sm font-mono">
                                            <div><strong>Input:</strong> {example.input}</div>
                                            <div><strong>Output:</strong> {example.output}</div>
                                            {example.explanation && (
                                                <div><strong>Explanation:</strong> {example.explanation}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>
                )}

                {/* Solution Code Display */}
                {currentCard && (currentCard.solution_code || currentCard.solution_title) && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                <h4 className="font-medium text-sm">Your Solution</h4>
                                {currentCard.is_custom_solution && (
                                    <Badge variant="secondary" className="text-xs">Custom</Badge>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    logger.debug('Toggling solution visibility', {
                                        component: 'FlashcardReview',
                                        showSolution: !showSolution,
                                        problemId: currentCard?.problem_id
                                    });
                                    onToggleSolution();
                                }}
                                className="text-xs"
                            >
                                {showSolution ? "Hide Solution" : "Show Solution"}
                            </Button>
                        </div>

                        {!showSolution ? (
                            <div className="rounded border bg-muted/20 p-8 text-center">
                                <div className="text-muted-foreground">
                                    <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Try to recall your solution first</p>
                                    <p className="text-xs mt-1">Click "Show Solution" when ready</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {currentCard.solution_code ? (
                                    <div className="rounded overflow-hidden border">
                                        <Editor
                                            key={`${currentCard.problem_id}-${currentCardIndex}`}
                                            height="300px"
                                            language="python"
                                            theme={editorTheme}
                                            value={currentCard.solution_code}
                                            loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
                                            options={{
                                                readOnly: true,
                                                minimap: { enabled: false },
                                                lineNumbers: 'on',
                                                folding: false,
                                                wordWrap: 'on',
                                                scrollBeyondLastLine: false,
                                                renderWhitespace: 'none',
                                                fontSize: 12,
                                                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                                            }}
                                            onMount={(editor, monaco) => {
                                                defineCustomThemes(monaco);
                                                onEditorReady();
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="rounded border p-4 bg-red-50 dark:bg-red-950">
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            No solution code available for this card.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                        <Lightbulb className="h-4 w-4" />
                        <span className="font-medium">Review Tip</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        Think through each question carefully. You can check your solution code to help remember the details.
                    </p>
                </div>
            </div>
        </div>
    );
};
