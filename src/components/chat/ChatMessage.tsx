/**
 * Chat Message component for rendering individual chat messages
 */
import { useState } from "react";
import { Bot, User, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import Mermaid from "@/components/diagram/Mermaid";
import FlowCanvas from "@/components/diagram/FlowCanvas";
import { BlurredHint } from "./BlurredHint";
import type { FlowGraph, CodeSnippet, Problem, ChatMessage as ChatMessageType } from "@/types";
import { hasInteractiveDemo } from "@/components/visualizations/registry";
import { logger } from "@/utils/logger";
import { splitContentAndHint, formatTime } from "./utils/chatUtils";
import "katex/dist/katex.min.css";

// Theme configurations
const customDarkTheme = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
        ...vscDarkPlus['pre[class*="language-"]'],
        background: 'transparent',
        textShadow: 'none',
    },
    'code[class*="language-"]': {
        ...vscDarkPlus['code[class*="language-"]'],
        background: 'transparent',
        textShadow: 'none',
    },
};

const customLightTheme = {
    ...oneLight,
    'pre[class*="language-"]': {
        ...oneLight['pre[class*="language-"]'],
        background: 'transparent',
    },
    'code[class*="language-"]': {
        ...oneLight['code[class*="language-"]'],
        background: 'transparent',
    },
};

type ActiveDiagram =
    | { engine: "mermaid"; code: string }
    | { engine: "reactflow"; graph: FlowGraph };

interface ChatMessageProps {
    message: ChatMessageType;
    isDarkMode: boolean;
    problem?: Problem;
    onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
    onOpenDiagramDialog: (diagram: ActiveDiagram) => void;
    onOpenInteractiveDemo: () => void;
}

/**
 * Fix malformed Python code (semicolon-separated statements)
 */
const fixPythonCode = (code: string): string => {
    if (code.includes(';') && !code.includes('\n')) {
        logger.debug('[ChatMessage] Fixing malformed Python code:', { code });
        const statements = code.split(';').map(s => s.trim()).filter(s => s.length > 0);
        const fixed = statements.join('\n');
        logger.debug('[ChatMessage] Fixed Python code:', { fixed });
        return fixed;
    }
    return code;
};

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
    message,
    isDarkMode,
    problem,
    onInsertCodeSnippet,
    onOpenDiagramDialog,
    onOpenInteractiveDemo,
}) => {
    const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

    const handleCopyCode = async (codeText: string, snippetId: string) => {
        try {
            await navigator.clipboard.writeText(codeText);
            setCopiedSnippetId(snippetId);
            setTimeout(() => setCopiedSnippetId(null), 2000);
        } catch (err) {
            logger.error('Failed to copy code:', { error: err });
        }
    };

    const renderDiagram = () => {
        const attached = (
            message as unknown as {
                diagram?:
                | { engine: "mermaid"; code: string }
                | { engine: "reactflow"; graph: FlowGraph };
            }
        ).diagram;

        if (!attached) return null;

        if (attached.engine === "mermaid") {
            return (
                <div className="mt-3">
                    <div className="p-3 bg-chat-accent/5 border border-chat-accent/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-muted-foreground">
                                Diagram{" "}
                                <span className="ml-1 inline-block px-1.5 py-0.5 rounded border border-accent/40 text-[10px] uppercase tracking-wide">
                                    Mermaid
                                </span>
                            </div>
                            <button
                                type="button"
                                className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => onOpenDiagramDialog({ engine: "mermaid", code: attached.code })}
                            >
                                <ExternalLink className="w-3 h-3" />
                                View Full
                            </button>
                        </div>
                        <Mermaid chart={attached.code} />
                    </div>
                </div>
            );
        }

        if (attached.engine === "reactflow") {
            return (
                <div className="mt-3">
                    <div className="p-3 bg-chat-accent/5 border border-chat-accent/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-muted-foreground">
                                Diagram{" "}
                                <span className="ml-1 inline-block px-1.5 py-0.5 rounded border border-accent/40 text-[10px] uppercase tracking-wide">
                                    React Flow
                                </span>
                            </div>
                            <button
                                type="button"
                                className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => onOpenDiagramDialog({ engine: "reactflow", graph: attached.graph })}
                            >
                                <ExternalLink className="w-3 h-3" />
                                View Full
                            </button>
                        </div>
                        <FlowCanvas graph={attached.graph} />
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderCodeBlock = (className: string | undefined, children: React.ReactNode) => {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match?.[1] || "python";
        const isBlock = !!match;

        logger.debug('Code snippet detected:', { children, lang, isBlock });

        if (isBlock) {
            const codeText = fixPythonCode(String(children).replace(/\n$/, ""));
            const snippetId = `snippet-${message.id}-${codeText.slice(0, 20)}`;
            const isCopied = copiedSnippetId === snippetId;

            return (
                <div className="relative group">
                    <div
                        className={`rounded-xl overflow-hidden my-3 ${isDarkMode
                                ? 'bg-stone-800/80 border border-stone-700/30'
                                : 'bg-stone-50 border border-stone-200/60'
                            }`}
                    >
                        <SyntaxHighlighter
                            style={isDarkMode ? customDarkTheme : customLightTheme}
                            language={lang}
                            PreTag="div"
                            customStyle={{
                                margin: 0,
                                padding: '1rem 1.25rem',
                                background: 'transparent',
                                fontSize: '13px',
                                lineHeight: '1.6',
                            }}
                            codeTagProps={{
                                style: {
                                    background: 'transparent',
                                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                                }
                            }}
                        >
                            {codeText}
                        </SyntaxHighlighter>
                    </div>
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {/* Copy button */}
                        <button
                            onClick={() => handleCopyCode(codeText, snippetId)}
                            className={`p-1.5 rounded shadow text-xs ${isCopied
                                    ? 'bg-green-500 text-white'
                                    : isDarkMode
                                        ? 'bg-stone-700 hover:bg-stone-600 text-stone-200'
                                        : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
                                }`}
                            title={isCopied ? "Copied!" : "Copy code"}
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {/* Add to Editor button */}
                        {onInsertCodeSnippet && (
                            <button
                                onClick={() => {
                                    logger.debug('Inserting code snippet:', {
                                        codeText,
                                        hasNewlines: codeText.includes('\n'),
                                        hasSemicolons: codeText.includes(';')
                                    });

                                    const snippet: CodeSnippet = {
                                        id: `direct-${Date.now()}`,
                                        code: codeText,
                                        language: "python",
                                        isValidated: true,
                                        insertionType: "smart",
                                        insertionHint: {
                                            type: "statement",
                                            scope: "function",
                                            description: "Code snippet from AI response",
                                        },
                                    };
                                    onInsertCodeSnippet(snippet);
                                }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded shadow"
                                title="Add to Editor"
                            >
                                Add
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <em className="text-blue-600 dark:text-blue-400 font-medium">
                {children}
            </em>
        );
    };

    const { body, hint } = splitContentAndHint(message.content);
    const hasDiagram = Boolean((message as unknown as { diagram?: unknown }).diagram);

    return (
        <div className="mb-6">
            <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {/* Avatar for assistant (left side) */}
                {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-chat-accent text-chat-accent-foreground">
                        <Bot className="w-4 h-4" />
                    </div>
                )}

                {/* Message Bubble */}
                <div className="max-w-[80%] min-w-0">
                    <div
                        className={`rounded-lg p-3 ${message.role === "user"
                                ? "border border-primary/60 bg-card text-foreground"
                                : "border border-chat-accent/40 bg-chat-accent/10 text-foreground dark:border-chat-accent/30 dark:bg-chat-accent/15"
                            }`}
                    >
                        <div className={`prose prose-sm max-w-none prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-code:bg-transparent prose-code:before:content-none prose-code:after:content-none ${message.role === "user" ? "text-muted-foreground" : "text-foreground"}`}>
                            {message.role === "user" ? (
                                <p className="text-foreground font-medium">{message.content}</p>
                            ) : (
                                <div>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            em: ({ children }) => (
                                                <strong className="text-foreground font-semibold">{children}</strong>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="text-foreground font-semibold">{children}</strong>
                                            ),
                                            code: ({ className, children }) => renderCodeBlock(className, children),
                                            p: ({ children }) => <p>{children}</p>,
                                        }}
                                    >
                                        {body}
                                    </ReactMarkdown>
                                    {hint && <BlurredHint text={hint} />}
                                </div>
                            )}
                        </div>

                        {/* Diagrams */}
                        {message.role === "assistant" && renderDiagram()}

                        {/* Interactive Demo button */}
                        {message.role === "assistant" && problem && hasInteractiveDemo(problem.id) && hasDiagram && (
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onOpenInteractiveDemo}
                                        className="text-xs"
                                    >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Interactive Demo
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground mt-2">
                            {formatTime(message.timestamp)}
                        </div>
                    </div>
                </div>

                {/* Avatar for user (right side) */}
                {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
                        <User className="w-4 h-4" />
                    </div>
                )}
            </div>
        </div>
    );
};
