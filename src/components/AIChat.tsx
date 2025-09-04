import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Trash2,
  Loader2,
  Mic,
  MicOff,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
// Using a lightweight custom fullscreen overlay instead of Radix Dialog to avoid MIME issues in some dev setups
import { useChatSession } from "@/hooks/useChatSession";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import TextareaAutosize from "react-textarea-autosize";
import { CodeSnippet, Problem } from "@/types";
import Mermaid from "@/components/diagram/Mermaid";
import FlowCanvas from "@/components/diagram/FlowCanvas";
import type { FlowGraph } from "@/types";
import CodeSnippetButton from "@/components/CodeSnippetButton";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CanvasContainer } from "@/components/canvas";
import { hasInteractiveDemo } from "@/components/visualizations/registry";

interface AIChatProps {
  problemId: string;
  problemDescription: string;
  onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
  problemTestCases?: unknown[];
  problem?: Problem;
  currentCode?: string;
}

const AIChat = ({
  problemId,
  problemDescription,
  onInsertCodeSnippet,
  problemTestCases,
  problem,
  currentCode,
}: AIChatProps) => {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  type ActiveDiagram =
    | { engine: "mermaid"; code: string }
    | { engine: "reactflow"; graph: FlowGraph };
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<ActiveDiagram | null>(
    null,
  );
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  // Track message IDs we've already auto-requested diagrams for (avoid loops)
  const autoRequestedRef = useRef<Set<string>>(new Set());

  // Canvas state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("Interactive Component");
  const {
    session,
    messages,
    loading,
    isTyping,
    sendMessage,
    clearConversation,
    requestDiagram,
  } = useChatSession({
    problemId,
    problemDescription,
    problemTestCases,
    currentCode,
  });

  // Speech-to-text functionality
  const {
    isListening,
    isSupported: speechSupported,
    hasNativeSupport,
    isProcessing,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechToText({
    onResult: (transcript) => {
      setInput((prev) => {
        const currentText = prev.trim();
        return currentText ? `${currentText} ${transcript}` : transcript;
      });
    },
    onError: (error) => {
      console.error("Speech recognition error:", error);
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-request diagrams when conditions are met; no manual Visualize button
  useEffect(() => {
    if (!messages.length) return;
    // If any assistant message already has a diagram, do not auto-request again on reload
    const anyDiagramExists = messages.some(
      (m) =>
        m.role === "assistant" &&
        Boolean((m as unknown as { diagram?: unknown }).diagram),
    );
    if (anyDiagramExists) return;

    // Only consider the latest assistant message for auto-request
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const userAsked = /(visualize|diagram|draw|flowchart|mermaid)/i.test(
      lastUserMsg,
    );
    const hasDiagram = Boolean(
      (lastAssistant as unknown as { diagram?: unknown }).diagram,
    );
    const assistantSuggests =
      (lastAssistant as unknown as { suggestDiagram?: boolean })
        .suggestDiagram === true;
    const id = lastAssistant.id;
    const shouldRequest =
      !hasDiagram &&
      (userAsked || assistantSuggests) &&
      !autoRequestedRef.current.has(id);
    if (shouldRequest) {
      autoRequestedRef.current.add(id);
      requestDiagram(lastAssistant.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Reset auto diagram request tracker when conversation is cleared
  useEffect(() => {
    if (messages.length === 0) {
      autoRequestedRef.current = new Set();
    }
  }, [messages.length]);

  const handleGenerateComponent = async (messageContent: string) => {
    if (!problem) {
      console.error("No problem context available for visualization");
      return;
    }

    // Simply open the modal with our direct component
    setCanvasTitle(`${problem.title} - Interactive Demo`);
    setIsCanvasOpen(true);
    console.debug(
      "[InteractiveDemo] Opening visualization for:",
      problem.title,
    );
  };

  const openDiagramDialog = (diagram: ActiveDiagram) => {
    setActiveDiagram(diagram);
    setIsDiagramOpen(true);
  };

  const toggleMicrophone = async () => {
    if (!hasNativeSupport) return;

    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Extract trailing single-line "Hint: ..." outside of code fences
  const splitContentAndHint = (
    content: string,
  ): { body: string; hint?: string } => {
    const lines = content.split("\n");
    let inCode = false;
    let hint: string | undefined;
    const bodyLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("```") &&
        (trimmed === "```" || /^```\w+/.test(trimmed))
      ) {
        inCode = !inCode;
        bodyLines.push(line);
        continue;
      }
      if (!inCode && hint === undefined) {
        const m = trimmed.match(/^Hint\s*:\s*(.+)$/i);
        if (m) {
          hint = m[1];
          continue;
        }
      }
      bodyLines.push(line);
    }
    return { body: bodyLines.join("\n"), hint };
  };

  const BlurredHint: React.FC<{ text: string }> = ({ text }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    return (
      <div
        className="mt-2 cursor-pointer text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border-l-4 border-blue-200 dark:border-blue-600"
        onClick={() => setIsRevealed((v) => !v)}
        role="button"
        aria-label={isRevealed ? "Hide hint" : "Click to reveal hint"}
      >
        <div className="flex items-center gap-2">
          {isRevealed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M3.53 2.47a.75.75 0 1 0-1.06 1.06l2.026 2.026C2.835 6.73 1.651 8.164.88 9.53a1.77 1.77 0 0 0 0 1.94C2.51 14.503 6.04 18 12 18c2.095 0 3.898-.437 5.393-1.152l3.077 3.077a.75.75 0 1 0 1.06-1.06L3.53 2.47ZM12 16.5c-5.18 0-8.317-3.1-9.72-5.53a.27.27 0 0 1 0-.29c.64-1.08 1.63-2.32 2.996-3.37l2.022 2.022A4.5 4.5 0 0 0 12 16.5Z" />
              <path d="M7.94 8.5 9.4 9.96A3 3 0 0 0 14.04 14.6l1.46 1.46A4.5 4.5 0 0 1 7.94 8.5Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M12 6c-5.96 0-9.49 3.497-11.12 6.53a1.77 1.77 0 0 0 0 1.94C2.51 17.503 6.04 21 12 21s9.49-3.497 11.12-6.53a1.77 1.77 0 0 0 0-1.94C21.49 9.497 17.96 6 12 6Zm0 12c-4.69 0-7.67-2.804-9.28-5.47A.27.27 0 0 1 2.7 12c1.61-2.666 4.59-5.47 9.3-5.47 4.69 0 7.67 2.804 9.28 5.47a.27.27 0 0 1 0 .53C19.67 15.196 16.69 18 12 18Zm0-9a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 9Z" />
            </svg>
          )}
          <span className="text-xs font-medium">
            {isRevealed ? "Hide Hint" : "Click to reveal hint"}
          </span>
        </div>
        {isRevealed ? (
          <div className="mt-2 text-foreground">💡 {text}</div>
        ) : (
          <div className="mt-2 select-none filter blur-sm text-muted-foreground text-xs">
            This hint will help guide you to the solution...
          </div>
        )}
      </div>
    );
  };

  const CodeBlockWithInsert: React.FC<{
    code: string;
    lang: string;
    onInsert?: (snippet: CodeSnippet) => void;
    showOverride?: boolean;
  }> = ({ code, lang, onInsert, showOverride }) => {
    const [showLocal, setShowLocal] = useState(false);
    const isMermaid = lang === "mermaid";
    const visible = showOverride !== undefined ? showOverride : showLocal;
    return (
      <div
        className="relative"
        onMouseEnter={() => setShowLocal(true)}
        onMouseLeave={() => setShowLocal(false)}
      >
        {isMermaid ? (
          <Mermaid chart={code} />
        ) : (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={lang || "python"}
            PreTag="div"
            className="rounded-md !mt-2 !mb-2"
          >
            {code.replace(/\n$/, "")}
          </SyntaxHighlighter>
        )}
        {onInsert && !isMermaid && (
          <button
            onClick={() => {
              const snippet: CodeSnippet = {
                id: `direct-${Date.now()}`,
                code: code.replace(/\n$/, ""),
                language: "python",
                isValidated: true,
                insertionType: "smart",
                insertionHint: {
                  type: "statement",
                  scope: "function",
                  description: "Code snippet from AI response",
                },
              };
              onInsert(snippet);
            }}
            className={`absolute top-2 right-2 z-20 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded shadow pointer-events-auto transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
            title="Add to Editor"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        )}
      </div>
    );
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="h-full flex flex-col border-l border-border rounded-none shadow-none">
      {/* Chat Header */}
      <div className="flex-shrink-0 h-12 px-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-medium text-foreground">AI Coach</div>
            <div className="text-xs text-muted-foreground">
              {loading ? "Loading chat..." : session ? "Chat loaded" : "Online"}
            </div>
          </div>
        </div>
        {session && messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConversation}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full min-h-[400px] p-4" ref={scrollAreaRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading chat history...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 min-h-full flex flex-col">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      Start a conversation with your AI coach!
                    </p>
                    <p className="text-xs mt-1">
                      Ask questions about the problem or get hints.
                    </p>
                  </div>
                </div>
              )}
              <div className={messages.length === 0 ? "" : "flex-1 space-y-4"}>
                {messages.map((message) => (
                  <div key={message.id} className="mb-6">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`inline-block max-w-[85%] rounded-lg px-4 py-3 ${
                            message.role === "user"
                              ? "border border-primary/40 bg-primary/10 text-foreground dark:border-primary/30 dark:bg-primary/15"
                              : "border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15"
                          }`}
                          onMouseEnter={() => {
                            if (message.role === 'assistant') setHoveredMessageId(message.id);
                          }}
                          onMouseLeave={() => {
                            if (message.role === 'assistant') setHoveredMessageId(null);
                          }}
                        >
                          {message.role === "user" ? (
                            <p className="text-sm whitespace-pre-wrap break-words text-left">
                              {message.content}
                            </p>
                          ) : (
                            (() => {
                              const { body, hint } = splitContentAndHint(
                                message.content,
                              );
                              return (
                                <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown
                                  components={{
                                  code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                    const match = /language-(\w+)/.exec(className || "");
                                    const lang = match?.[1] || "python";
                                    if (!inline) {
                                      // Determine visibility from message hover flag
                                      const hovered = hoveredMessageId === message.id;
                                      return (
                                        <CodeBlockWithInsert
                                          code={String(children)}
                                          lang={lang}
                                          onInsert={onInsertCodeSnippet}
                                          showOverride={hovered}
                                        />
                                      );
                                    }
                                    return (
                                      <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                                    );
                                  },
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc list-outside pl-5 mb-2">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal list-outside pl-5 mb-2">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({
                                    children,
                                  }: {
                                    children?: React.ReactNode;
                                  }) => <li className="mb-1">{children}</li>,
                                }}
                              >
                                    {body}
                                  </ReactMarkdown>
                                  {hint && <BlurredHint text={hint} />}
                                </div>
                              );
                            })()
                          )}
                        </div>

                        {/* Mermaid diagram bubble - uses DB-attached diagram */}
                        {message.role === "assistant" &&
                          (() => {
                            const attached = (
                              message as unknown as {
                                diagram?:
                                  | { engine: "mermaid"; code: string }
                                  | { engine: "reactflow"; graph: FlowGraph };
                              }
                            ).diagram;
                            const diag: {
                              engine: "mermaid";
                              code: string;
                            } | null =
                              attached && attached.engine === "mermaid"
                                ? (attached as {
                                    engine: "mermaid";
                                    code: string;
                                  })
                                : null;
                            if (!diag) return null;
                            return (
                              <div className="mt-3">
                                <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
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
                                      onClick={() =>
                                        openDiagramDialog({
                                          engine: "mermaid",
                                          code: diag.code,
                                        })
                                      }
                                      title="View full screen"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                      Expand
                                    </button>
                                  </div>
                                  <Mermaid chart={diag.code} />
                                </div>
                              </div>
                            );
                          })()}

                        {/* React Flow diagram bubble - uses DB-attached diagram */}
                        {message.role === "assistant" &&
                          (() => {
                            const attached = (
                              message as unknown as {
                                diagram?:
                                  | { engine: "mermaid"; code: string }
                                  | { engine: "reactflow"; graph: FlowGraph };
                              }
                            ).diagram;
                            const diag: {
                              engine: "reactflow";
                              graph: FlowGraph;
                            } | null =
                              attached && attached.engine === "reactflow"
                                ? (attached as {
                                    engine: "reactflow";
                                    graph: FlowGraph;
                                  })
                                : null;
                            if (!diag) return null;
                            return (
                              <div className="mt-3">
                                <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
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
                                      onClick={() =>
                                        openDiagramDialog({
                                          engine: "reactflow",
                                          graph: diag.graph,
                                        })
                                      }
                                      title="View full screen"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                      Expand
                                    </button>
                                  </div>
                                  <FlowCanvas graph={diag.graph} />
                                </div>
                              </div>
                            );
                          })()}

                        {/* Action: Interactive Demo button - show only for problems with a registered interactive demo AND message has a diagram */}
                        {message.role === "assistant" && hasInteractiveDemo(problem?.id) && Boolean((message as unknown as { diagram?: unknown }).diagram) && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 gap-1.5 text-foreground border-accent/40 hover:bg-accent/10"
                                onClick={() =>
                                  handleGenerateComponent(message.content)
                                }
                                title="Generate an interactive component demo"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm">
                                  Interactive Demo
                                </span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Code snippets: render whenever present on assistant messages */}
                        {message.role === "assistant" &&
                          message.codeSnippets &&
                          message.codeSnippets.length > 0 &&
                          // Avoid duplicate UI: if markdown code blocks exist, prefer inline with overlay
                          !/```/.test(message.content) && (
                            <div className="mt-3 space-y-3">
                              {message.codeSnippets.map((snippet) => (
                                <div
                                  key={snippet.id}
                                  className="bg-card border rounded-lg p-4 shadow-sm"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {snippet.insertionHint?.type || "Code"}
                                      </span>
                                    </div>
                                    {onInsertCodeSnippet && (
                                      <CodeSnippetButton
                                        snippet={snippet}
                                        onInsert={onInsertCodeSnippet}
                                        className="shadow-sm"
                                      />
                                    )}
                                  </div>

                                  <div className="bg-slate-900 rounded-md p-3 mb-3">
                                    <SyntaxHighlighter
                                      language={snippet.language}
                                      style={vscDarkPlus}
                                      customStyle={{
                                        margin: 0,
                                        padding: 0,
                                        background: "transparent",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      {snippet.code}
                                    </SyntaxHighlighter>
                                  </div>

                                  {snippet.insertionHint?.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {snippet.insertionHint.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground mt-2 text-left">
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex space-x-2 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15 rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <TextareaAutosize
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? " Listening..."
                  : isProcessing
                    ? "🔄 Processing audio..."
                    : "Ask your AI coach anything..."
              }
              disabled={loading || isTyping}
              className={`w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                hasNativeSupport ? "pr-10" : "pr-3"
              }`}
              minRows={1}
              maxRows={6}
            />
            {hasNativeSupport && (
              <button
                type="button"
                onClick={toggleMicrophone}
                disabled={loading || isTyping}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded ${
                  isListening
                    ? "text-red-500 animate-pulse"
                    : isProcessing
                      ? "text-blue-500"
                      : "text-gray-500 hover:text-gray-700"
                }`}
                title={
                  isListening
                    ? "Stop listening"
                    : isProcessing
                      ? "Processing..."
                      : "Start voice input"
                }
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
            {speechError && (
              <div
                className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-red-500 opacity-80"
                title={speechError}
              >
                ⚠️
              </div>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || loading}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4"
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      {isDiagramOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setIsDiagramOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] bg-background border rounded-lg shadow-lg p-4 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Diagram</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDiagramOpen(false)}
              >
                Close
              </Button>
            </div>
            {activeDiagram &&
              (activeDiagram.engine === "mermaid" ? (
                <Mermaid chart={activeDiagram.code} />
              ) : (
                <FlowCanvas graph={activeDiagram.graph} height="80vh" />
              ))}
          </div>
        </div>
      )}

      {/* Canvas Modal for Interactive Components */}
      <CanvasContainer
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        title={canvasTitle}
        problemId={problem?.id}
      />
    </Card>
  );
};

export default AIChat;
