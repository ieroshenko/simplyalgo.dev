import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AlertTriangle, CheckCircle, CircleX, ChevronDown, Lightbulb, Zap } from 'lucide-react';
import { BlurredSection } from './BlurredSection';
import { OverlayState, OverlayValidationResult } from './types';

interface OverlayContentProps {
    overlayState: OverlayState;
    shouldShowQuestion: boolean;
    question?: string;
    hint?: string;
    validationResult?: OverlayValidationResult | null;
    studentExplanation: string;
    setStudentExplanation: (val: string) => void;
    showTextInput: boolean;
    setShowTextInput: (val: boolean) => void;
    hasError: boolean;
    isSessionCompleted: boolean;
}

export const OverlayContent: React.FC<OverlayContentProps> = ({
    overlayState,
    shouldShowQuestion,
    question,
    hint,
    validationResult,
    studentExplanation,
    setStudentExplanation,
    showTextInput,
    setShowTextInput,
    hasError,
    isSessionCompleted,
}) => {
    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {/* Question section */}
            {shouldShowQuestion && (
                <div className="p-4">
                    <div className="text-sm font-medium mb-2 text-foreground leading-relaxed">
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                em: ({ children, ...props }) => <strong {...props}>{children}</strong>,
                                strong: ({ children, ...props }) => <strong {...props}>{children}</strong>,
                                code: ({ className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || "");
                                    if (!match) {
                                        return <em className="text-blue-600 dark:text-blue-400 font-medium" {...props}>{children}</em>;
                                    }
                                    return <code className={className} {...props}>{children}</code>;
                                }
                            }}
                        >
                            {question || ''}
                        </ReactMarkdown>
                    </div>
                    {hint && (
                        <div className="mt-3">
                            <BlurredSection
                                content={hint}
                                label="Hint"
                                icon={<Lightbulb className="w-3 h-3 text-yellow-500" />}
                                className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-600"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Validation Result - Correct */}
            {overlayState === 'correct' && (
                <div className="p-4 bg-green-50/50 dark:bg-green-950/10">
                    <div className="flex gap-3">
                        <div className="mt-0.5">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-green-700 dark:text-green-300 text-sm mb-1">
                                Great work!
                            </h3>
                            <div className="text-sm text-foreground/90 leading-relaxed">
                                <ReactMarkdown>{validationResult?.feedback || ''}</ReactMarkdown>
                            </div>

                            {/* Show optimization analysis if available */}
                            {validationResult?.optimizationAnalysis && (
                                <div className="mt-3 bg-white/50 dark:bg-black/20 rounded-md p-3 border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-300 text-xs font-semibold uppercase tracking-wider">
                                        <Zap className="w-3 h-3" />
                                        Complexity Analysis
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Time:</span>
                                            <span className="ml-1 font-mono font-medium">
                                                {validationResult.optimizationAnalysis.currentComplexity?.time || "O(n)"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Space:</span>
                                            <span className="ml-1 font-mono font-medium">
                                                {validationResult.optimizationAnalysis.currentComplexity?.space || "O(1)"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Result - Incorrect */}
            {overlayState === 'incorrect' && (
                <div className="p-4">
                    <div className="flex gap-3">
                        <div className="mt-0.5">
                            <CircleX className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-700 dark:text-red-300 text-sm mb-1">
                                Not quite right
                            </h3>
                            <div className="text-sm text-foreground/90 leading-relaxed mb-3">
                                <ReactMarkdown>{validationResult?.feedback || ''}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion State */}
            {overlayState === 'completed' && (
                <div className="p-4">
                    <div className="text-center py-2">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">🎉</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Problem Solved!</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            You've successfully completed this challenge.
                        </p>

                        {/* Show next step hint or question if available */}
                        {validationResult?.nextStep && (
                            <div className="text-left mt-4 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                {(() => {
                                    const qRaw = validationResult.nextStep.question || '';
                                    // Extract solution if embedded in format "Question? Solution: answer"
                                    // Simple regex heuristic for now
                                    const match = qRaw.match(/Solution:\s*(.*)/s);
                                    const q = match && match.index !== undefined ? qRaw.substring(0, match.index).trim() : qRaw;
                                    const sol = match ? match[1].trim() : null;

                                    return (
                                        <>
                                            {q && (
                                                <div className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap mb-2">
                                                    {q}
                                                </div>
                                            )}

                                            {sol && (
                                                <div className="mt-2">
                                                    <BlurredSection
                                                        content={sol}
                                                        label="Solution"
                                                        icon="✅"
                                                        className="bg-white/50 dark:bg-black/20 border-blue-300 dark:border-blue-500"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                {validationResult.nextStep?.hint?.trim() && (
                                    <div className="mt-2">
                                        <BlurredSection
                                            content={validationResult.nextStep.hint}
                                            className="bg-white/50 dark:bg-black/20 border-blue-300 dark:border-blue-500"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Instructions section - Initial State */}
            {overlayState === 'initial' && (
                <div className="px-4 py-3 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-3">
                        Write your code in the highlighted area above, then click <strong>Check Code</strong> to validate.
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => setShowTextInput(!showTextInput)}
                            className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                            <ChevronDown className={`w-3 h-3 transition-transform ${showTextInput ? 'rotate-180' : ''}`} />
                            {showTextInput ? 'Hide explanation' : 'Add explanation (optional)'}
                        </button>

                        {showTextInput && (
                            <div className="space-y-2">
                                <textarea
                                    value={studentExplanation}
                                    onChange={(e) => setStudentExplanation(e.target.value)}
                                    placeholder="Explain what you're trying to do or what you're stuck on..."
                                    className="w-full px-3 py-2 text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground placeholder:text-muted-foreground"
                                    rows={3}
                                />
                                <div className="text-xs text-muted-foreground">
                                    💡 This helps the AI coach provide more targeted feedback
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Loading state */}
            {overlayState === 'validating' && (
                <div className="px-4 py-3 border-t border-border bg-blue-50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                                Analyzing your code...
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                AI coach is reviewing your implementation and preparing feedback.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error state AI Unavailable */}
            {hasError && !isSessionCompleted && (
                <div className="px-4 py-3 border-t border-border bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                AI Coach Unavailable
                            </div>
                            <div className="text-sm text-red-700 dark:text-red-300 mb-3">
                                The AI coaching service is temporarily down. You can continue coding on your own or exit coach mode.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
