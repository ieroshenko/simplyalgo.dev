import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Loader2, Maximize2, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useChatSession } from "@/hooks/useChatSession";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { CoachingMode } from "@/types";
import Mermaid from "@/components/diagram/Mermaid";
import FlowCanvas from "@/components/diagram/FlowCanvas";
import type { FlowGraph } from "@/types";
import CodeSnippetButton from "@/components/CodeSnippetButton";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CanvasContainer } from "@/components/canvas";
import { hasInteractiveDemo } from "@/components/visualizations/registry";
import "katex/dist/katex.min.css";
import { logger } from "@/utils/logger";
import { useTrackFeatureTime, Features } from "@/hooks/useFeatureTracking";
import { trackEvent, AnalyticsEvents } from "@/services/analytics";

// Extracted components
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInput } from "./chat/ChatInput";
import { BlurredHint } from "./chat/BlurredHint";
import { BlurredSection } from "./chat/BlurredSection";
import { CodeBlockWithInsert } from "./chat/CodeBlockWithInsert";
import { splitContentAndHint, formatTime } from "./chat/utils/chatUtils";
import type { AIChatProps, ActiveDiagram } from "./chat/types";

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
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<ActiveDiagram | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const autoRequestedRef = useRef<Set<string>>(new Set());

  // Canvas state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("Interactive Component");

  // Single coaching mode: Socratic
  const coachingMode: CoachingMode = "socratic";

  // Track AI Chat feature usage
  useTrackFeatureTime(Features.AI_CHAT, { problemId });

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
    coachingMode,
  });

  // Speech-to-text functionality
  const {
    isListening,
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
      logger.error("[AIChat] Speech recognition error", { error });
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;
    trackEvent(AnalyticsEvents.AI_CHAT_MESSAGE_SENT, {
      problemId,
      messageLength: input.length,
    });
    await sendMessage(input);
    setInput("");
  };

  const toggleMicrophone = async () => {
    if (!hasNativeSupport) return;
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Auto-request diagrams when conditions are met
  useEffect(() => {
    if (!messages.length) return;
    const anyDiagramExists = messages.some(
      (m) =>
        m.role === "assistant" &&
        Boolean((m as unknown as { diagram?: unknown }).diagram)
    );
    if (anyDiagramExists) return;

    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const userAsked = /(visualize|diagram|draw|flowchart|mermaid)/i.test(
      lastUserMsg
    );
    const hasDiagram = Boolean(
      (lastAssistant as unknown as { diagram?: unknown }).diagram
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

  const handleGenerateComponent = async () => {
    if (!problem) {
      logger.error("[AIChat] No problem context available for visualization");
      return;
    }
    setCanvasTitle(`${problem.title} - Interactive Demo`);
    setIsCanvasOpen(true);
    logger.debug("[AIChat] Opening visualization", {
      problemTitle: problem.title,
    });
  };

  const openDiagramDialog = (diagram: ActiveDiagram) => {
    setActiveDiagram(diagram);
    setIsDiagramOpen(true);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement =
          scrollAreaRef.current.querySelector(
            "[data-radix-scroll-area-viewport]"
          ) ||
          scrollAreaRef.current.querySelector(
            "[data-radix-scroll-area-content]"
          ) ||
          scrollAreaRef.current;

        if (scrollElement) {
          requestAnimationFrame(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          });
        }
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  return (
    <Card className="h-full flex flex-col border-l border-border rounded-none shadow-none min-w-0">
      {/* Chat Header */}
      <ChatHeader
        loading={loading}
        hasSession={!!session}
        hasMessages={messages.length > 0}
        onClearConversation={clearConversation}
      />

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden min-w-0">
        <ScrollArea
          className="h-full min-h-[200px] p-4 min-w-0"
          ref={scrollAreaRef}
          style={{ minWidth: 0 }}
        >
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
                  <div key={message.id} className="mb-6 min-w-0">
                    <div
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Avatar for assistant */}
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-chat-accent text-chat-accent-foreground">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="max-w-[80%] min-w-0">
                        <div
                          className={`rounded-lg p-3 ${
                            message.role === "user"
                              ? "border-l-4 border-primary/60 bg-card pl-4"
                              : "border-l-4 border-chat-accent/60 bg-chat-accent/10 dark:bg-chat-accent/15 pl-4"
                          }`}
                          onMouseEnter={() => {
                            if (message.role === "assistant")
                              setHoveredMessageId(message.id);
                          }}
                          onMouseLeave={() => {
                            if (message.role === "assistant")
                              setHoveredMessageId(null);
                          }}
                        >
                          {message.role === "user" ? (
                            <p className="text-foreground font-medium mb-2">
                              {message.content}
                            </p>
                          ) : (
                            (() => {
                              const { body, hint, hintsForNextStep, solution } =
                                splitContentAndHint(message.content);
                              return (
                                <div>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                      em({ children, ...props }) {
                                        return <strong {...props}>{children}</strong>;
                                      },
                                      strong({ children, ...props }) {
                                        return <strong {...props}>{children}</strong>;
                                      },
                                      code({ className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(
                                          className || ""
                                        );
                                        const lang = match?.[1] || "python";
                                        const isBlock = !!match;

                                        if (isBlock) {
                                          const hovered =
                                            hoveredMessageId === message.id;
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
                                          <em
                                            className="text-blue-600 dark:text-blue-400 font-medium"
                                            {...props}
                                          >
                                            {children}
                                          </em>
                                        );
                                      },
                                      p: ({ children }) => <p>{children}</p>,
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
                                      li: ({ children }) => (
                                        <li className="mb-1">{children}</li>
                                      ),
                                    }}
                                  >
                                    {body}
                                  </ReactMarkdown>
                                  {hint && <BlurredHint text={hint} />}
                                  {hintsForNextStep && (
                                    <BlurredSection
                                      title="Hints for Next Step"
                                      content={hintsForNextStep}
                                      icon="💡"
                                      color="amber"
                                    />
                                  )}
                                  {solution && (
                                    <BlurredSection
                                      title="Solution"
                                      content={solution}
                                      icon="✅"
                                      color="green"
                                    />
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </div>

                        {/* Mermaid diagram bubble */}
                        {message.role === "assistant" &&
                          (() => {
                            const attached = (
                              message as unknown as {
                                diagram?:
                                  | { engine: "mermaid"; code: string }
                                  | { engine: "reactflow"; graph: FlowGraph };
                              }
                            ).diagram;
                            const diag =
                              attached && attached.engine === "mermaid"
                                ? (attached as { engine: "mermaid"; code: string })
                                : null;
                            if (!diag) return null;
                            return (
                              <div className="mt-3">
                                <div className="border border-chat-accent/40 bg-chat-accent/10 text-foreground dark:border-chat-accent/30 dark:bg-chat-accent/15 rounded-lg p-3">
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

                        {/* React Flow diagram bubble */}
                        {message.role === "assistant" &&
                          (() => {
                            const attached = (
                              message as unknown as {
                                diagram?:
                                  | { engine: "mermaid"; code: string }
                                  | { engine: "reactflow"; graph: FlowGraph };
                              }
                            ).diagram;
                            const diag =
                              attached && attached.engine === "reactflow"
                                ? (attached as {
                                    engine: "reactflow";
                                    graph: FlowGraph;
                                  })
                                : null;
                            if (!diag) return null;
                            return (
                              <div className="mt-3">
                                <div className="border border-chat-accent/40 bg-chat-accent/10 text-foreground dark:border-chat-accent/30 dark:bg-chat-accent/15 rounded-lg p-3">
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

                        {/* Interactive Demo button */}
                        {message.role === "assistant" &&
                          hasInteractiveDemo(problem?.id) &&
                          Boolean(
                            (message as unknown as { diagram?: unknown }).diagram
                          ) && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 gap-1.5 text-foreground border-chat-accent/40 hover:bg-chat-accent/10"
                                  onClick={handleGenerateComponent}
                                  title="Generate an interactive component demo"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  <span className="text-sm">Interactive Demo</span>
                                </Button>
                              </div>
                            </div>
                          )}

                        {/* Code snippets */}
                        {message.role === "assistant" &&
                          message.codeSnippets &&
                          message.codeSnippets.length > 0 &&
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
                                        whiteSpace: "pre",
                                        overflowX: "auto",
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

                      {/* Avatar for user */}
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-chat-accent text-chat-accent-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="border border-chat-accent/40 bg-chat-accent/10 text-foreground dark:border-chat-accent/30 dark:bg-chat-accent/15 rounded-lg p-3">
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
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={loading}
        isTyping={isTyping}
        isListening={isListening}
        isProcessing={isProcessing}
        hasNativeSupport={hasNativeSupport}
        onToggleMicrophone={toggleMicrophone}
        speechError={speechError}
      />

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
