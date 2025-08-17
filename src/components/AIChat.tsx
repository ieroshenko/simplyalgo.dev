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
import { supabase } from "@/integrations/supabase/client";
// Removed complex visualization import - using direct component now

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
  } = useChatSession({ problemId, problemDescription, problemTestCases, currentCode });

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
      (m) => m.role === "assistant" && Boolean((m as unknown as { diagram?: unknown }).diagram),
    );
    if (anyDiagramExists) return;

    // Only consider the latest assistant message for auto-request
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const userAsked = /(visualize|diagram|draw|flowchart|mermaid)/i.test(lastUserMsg);
    const hasDiagram = Boolean((lastAssistant as unknown as { diagram?: unknown }).diagram);
    const assistantSuggests =
      (lastAssistant as unknown as { suggestDiagram?: boolean }).suggestDiagram === true;
    const id = lastAssistant.id;
    const shouldRequest = !hasDiagram && (userAsked || assistantSuggests) && !autoRequestedRef.current.has(id);
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
      console.error(
        "No problem context available for visualization",
      );
      return;
    }

    // Simply open the modal with our direct component
    setCanvasTitle(`${problem.title} - Interactive Demo`);
    setIsCanvasOpen(true);
    console.debug("[InteractiveDemo] Opening visualization for:", problem.title);
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
                        >
                          {message.role === "user" ? (
                            <p className="text-sm whitespace-pre-wrap break-words text-left">
                              {message.content}
                            </p>
                          ) : (
                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown
                                components={{
                                  code({
                                    inline,
                                    className,
                                    children,
                                    ...props
                                  }: {
                                    inline?: boolean;
                                    className?: string;
                                    children?: React.ReactNode;
                                  }) {
                                    const match = /language-(\w+)/.exec(
                                      className || "",
                                    );
                                    if (
                                      !inline &&
                                      match &&
                                      match[1] === "mermaid"
                                    ) {
                                      return (
                                        <Mermaid chart={String(children)} />
                                      );
                                    }
                                    return !inline && match ? (
                                      <div className="relative group">
                                        <SyntaxHighlighter
                                          style={vscDarkPlus}
                                          language={match[1]}
                                          PreTag="div"
                                          className="rounded-md !mt-2 !mb-2"
                                          {...props}
                                        >
                                          {String(children).replace(/\n$/, "")}
                                        </SyntaxHighlighter>
                                        {match[1] === "python" && onInsertCodeSnippet && (
                                          <button
                                            onClick={() => {
                                              const codeContent = String(children).replace(/\n$/, "");
                                              const snippet: CodeSnippet = {
                                                id: `direct-${Date.now()}`,
                                                code: codeContent,
                                                language: "python",
                                                isValidated: true,
                                                insertionType: "smart",
                                                insertionHint: {
                                                  type: "statement",
                                                  scope: "function",
                                                  description: "Code snippet from AI response"
                                                }
                                              };
                                              onInsertCodeSnippet(snippet);
                                            }}
                                            className="absolute top-2 right-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add to Editor
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <code
                                        className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono"
                                        {...props}
                                      >
                                        {children}
                                      </code>
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
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* Mermaid diagram bubble - uses DB-attached diagram */}
                        {message.role === "assistant" && (() => {
                          const attached = (message as unknown as { diagram?: { engine: "mermaid"; code: string } | { engine: "reactflow"; graph: FlowGraph } }).diagram;
                          const diag: { engine: "mermaid"; code: string } | null = attached && attached.engine === "mermaid" ? (attached as { engine: "mermaid"; code: string }) : null;
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
                                <Mermaid
                                  chart={diag.code}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* React Flow diagram bubble - uses DB-attached diagram */}
                        {message.role === "assistant" && (() => {
                          const attached = (message as unknown as { diagram?: { engine: "mermaid"; code: string } | { engine: "reactflow"; graph: FlowGraph } }).diagram;
                          const diag: { engine: "reactflow"; graph: FlowGraph } | null = attached && attached.engine === "reactflow" ? (attached as { engine: "reactflow"; graph: FlowGraph }) : null;
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
                                <FlowCanvas
                                  graph={diag.graph}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action: Interactive Demo button only when a diagram exists */}
                        {message.role === "assistant" && Boolean((message as unknown as { diagram?: unknown }).diagram) && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 gap-1.5 text-foreground border-accent/40 hover:bg-accent/10"
                                onClick={() => handleGenerateComponent(message.content)}
                                title="Generate an interactive component demo"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm">Interactive Demo</span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Code snippets: render whenever present on assistant messages */}
                        {message.role === "assistant" && message.codeSnippets && message.codeSnippets.length > 0 && (
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
                  ? "🎤 Listening..."
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
      />
    </Card>
  );
};

export default AIChat;
