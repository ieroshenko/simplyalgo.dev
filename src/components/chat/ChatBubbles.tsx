import { Button } from "@/components/ui/button";
import {
  Send,
  Bot,
  User,
  Trash2,
  Loader2,
  Mic,
  MicOff,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useChatSession } from "@/hooks/useChatSession";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { CoachingMode } from "@/types";
import TextareaAutosize from "react-textarea-autosize";
import { CodeSnippet, Problem } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Mermaid from "@/components/diagram/Mermaid";
import FlowCanvas from "@/components/diagram/FlowCanvas";
import type { FlowGraph } from "@/types";
import { CanvasContainer } from "@/components/canvas";
import { hasInteractiveDemo } from "@/components/visualizations/registry";
import "katex/dist/katex.min.css";

interface ChatBubblesProps {
  problemId: string;
  problemDescription: string;
  onInsertCodeSnippet?: (snippet: CodeSnippet) => void;
  problemTestCases?: unknown[];
  problem?: Problem;
  currentCode?: string;
}

const ChatBubbles = ({
  problemId,
  problemDescription,
  onInsertCodeSnippet,
  problemTestCases,
  problem,
  currentCode,
}: ChatBubblesProps) => {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Diagram state
  type ActiveDiagram =
    | { engine: "mermaid"; code: string }
    | { engine: "reactflow"; graph: FlowGraph };
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<ActiveDiagram | null>(null);

  // Canvas state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("Interactive Component");

  // Single coaching mode: Socratic (toggle removed)
  const coachingMode: CoachingMode = 'socratic';

  const {
    session,
    messages,
    loading,
    isTyping,
    sendMessage,
    clearConversation,
  } = useChatSession({
    problemId,
    problemDescription,
    problemTestCases,
    currentCode,
    coachingMode,
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

  const toggleMicrophone = async () => {
    if (!hasNativeSupport) return;

    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Diagram functions
  const openDiagramDialog = (diagram: ActiveDiagram) => {
    setActiveDiagram(diagram);
    setIsDiagramOpen(true);
  };

  const openInteractiveDemo = () => {
    if (!problem?.id) return;
    setCanvasTitle(`${problem.title} - Interactive Demo`);
    setIsCanvasOpen(true);
  };

  // Auto-scroll to bottom when new messages arrive or typing updates
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      try {
        el.scrollTop = el.scrollHeight;
      } catch {
        // Ignore scroll errors
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, isTyping]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fix malformed Python code (semicolon-separated statements)
  const fixPythonCode = (code: string): string => {
    // If code contains semicolons and no newlines, it's likely malformed
    if (code.includes(';') && !code.includes('\n')) {
      console.log('Fixing malformed Python code:', code);

      // Split by semicolons and join with proper newlines
      const statements = code.split(';').map(s => s.trim()).filter(s => s.length > 0);
      const fixed = statements.join('\n');

      console.log('Fixed Python code:', fixed);
      return fixed;
    }

    return code;
  };

  // Extract trailing single-line "Hint: ..." outside of code fences
  const splitContentAndHint = (
    content: string,
  ): { body: string; hint?: string } => {
    const lines = content.split("\n");
    let inCode = false;
    let hint: string | undefined;
    const bodyLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track code fence state
      if (trimmed.startsWith("```") && (trimmed === "```" || /^```\w+/.test(trimmed))) {
        inCode = !inCode;
        bodyLines.push(line);
        continue;
      }

      // Look for hint pattern when not in code
      if (!inCode) {
        const hintMatch = trimmed.match(/^Hint\s*:\s*(.+)$/i);
        if (hintMatch) {
          hint = hintMatch[1];
          continue; // Don't add this line to body
        }
      }

      bodyLines.push(line);
    }

    return { body: bodyLines.join("\n").trim(), hint };
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

  return (
    <div className="h-full flex flex-col border-l border-border">
      {/* Chat Header */}
      <div className="flex-shrink-0 h-12 px-6 border-b border-border flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">AI Coach</div>
            <div className="text-xs text-muted-foreground truncate">
              {loading ? "Loading chat..." : session ? "Chat loaded" : "Online"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
      </div>

      {/* Messages - Using exact left panel pattern */}
      <div
        ref={scrollAreaRef}
        className="flex-1"
        style={{ height: "calc(100% - 49px)", overflow: "auto" }}
      >
        <div className="p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">
              Loading chat history...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Start a conversation with your AI coach!</p>
              <p className="text-xs mt-1">Ask questions about the problem or get hints.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="mb-6">
                  <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {/* Avatar for assistant (left side) */}
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className="max-w-[80%] min-w-0">
                      <div
                        className={`rounded-lg p-3 ${message.role === "user"
                            ? "border border-primary/60 bg-card text-foreground"
                            : "border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15"
                          }`}
                      >
                        <div className={`prose prose-sm max-w-none ${message.role === "user" ? "text-muted-foreground" : "text-foreground"}`}>
                          {message.role === "user" ? (
                            <p className="text-foreground font-medium">{message.content}</p>
                          ) : (
                            (() => {
                              const { body, hint } = splitContentAndHint(message.content);
                              return (
                                <div>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                      em({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
                                        // Convert italics to bold for better emphasis
                                        return <strong {...props}>{children}</strong>;
                                      },
                                      strong({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
                                        return <strong {...props}>{children}</strong>;
                                      },
                                      code({ className, children }) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const lang = match?.[1] || "python";
                                        // Strictly require a language match to treat as a block
                                        const isBlock = !!match;

                                        // Debug logging for code snippets
                                        console.log('Code snippet detected:', {
                                          isBlock,
                                          className,
                                          lang,
                                          children: String(children),
                                          childrenLength: String(children).length
                                        });

                                        if (isBlock) {
                                          return (
                                            <div className="relative group">
                                              <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={lang}
                                                PreTag="div"
                                                className="rounded-md !mt-2 !mb-2"
                                                customStyle={{
                                                  whiteSpace: "pre",
                                                  overflowX: "auto"
                                                }}
                                              >
                                                {fixPythonCode(String(children).replace(/\n$/, ""))}
                                              </SyntaxHighlighter>
                                              {onInsertCodeSnippet && (
                                                <button
                                                  onClick={() => {
                                                    const rawCode = String(children).replace(/\n$/, "");
                                                    const codeToInsert = fixPythonCode(rawCode);
                                                    console.log('Inserting code snippet:', {
                                                      originalChildren: String(children),
                                                      rawCode,
                                                      fixedCode: codeToInsert,
                                                      hasNewlines: codeToInsert.includes('\n'),
                                                      hasSemicolons: codeToInsert.includes(';')
                                                    });

                                                    const snippet: CodeSnippet = {
                                                      id: `direct-${Date.now()}`,
                                                      code: codeToInsert,
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
                                                  className="absolute top-2 right-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                  title="Add to Editor"
                                                >
                                                  Add
                                                </button>
                                              )}
                                            </div>
                                          );
                                        }
                                        return (
                                          <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">
                                            {children}
                                          </code>
                                        );
                                      },
                                      p: ({ children }) => <p>{children}</p>,
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

                        {/* Mermaid diagram - uses DB-attached diagram */}
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
                            return diag ? (
                              <div className="mt-3">
                                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
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
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View Full
                                    </button>
                                  </div>
                                  <Mermaid chart={diag.code} />
                                </div>
                              </div>
                            ) : null;
                          })()}

                        {/* React Flow diagram - uses DB-attached diagram */}
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
                            return diag ? (
                              <div className="mt-3">
                                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
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
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View Full
                                    </button>
                                  </div>
                                  <FlowCanvas graph={diag.graph} />
                                </div>
                              </div>
                            ) : null;
                          })()}

                        {/* Interactive Demo button - show only for problems with a registered interactive demo AND message has a diagram */}
                        {message.role === "assistant" && problem && hasInteractiveDemo(problem.id) && Boolean((message as unknown as { diagram?: unknown }).diagram) && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={openInteractiveDemo}
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
              ))}

              {isTyping && (
                <div className="mb-6">
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-[80%] min-w-0">
                      <div className="rounded-lg p-3 border border-accent/40 bg-accent/10 text-foreground dark:border-accent/30 dark:bg-accent/15">
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
                </div>
              )}
            </div>
          )}
        </div>
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
              className={`w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${hasNativeSupport ? "pr-10" : "pr-3"
                }`}
              minRows={1}
              maxRows={6}
            />
            {hasNativeSupport && (
              <button
                type="button"
                onClick={toggleMicrophone}
                disabled={loading || isTyping}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded ${isListening
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

      {/* Diagram Modal */}
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
      {problem && (
        <CanvasContainer
          isOpen={isCanvasOpen}
          onClose={() => setIsCanvasOpen(false)}
          title={canvasTitle}
          problemId={problem.id}
        />
      )}
    </div>
  );
};

export default ChatBubbles;
