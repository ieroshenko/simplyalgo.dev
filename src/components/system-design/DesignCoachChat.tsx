import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Trash2, Loader2, Mic, MicOff } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface DesignCoachChatProps {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  session: { id: string } | null;
  loading: boolean;
  isTyping: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onClearConversation: () => void;
  onEvaluate: () => void;
  isEvaluating: boolean;
}

const DesignCoachChat = ({
  messages,
  session,
  loading,
  isTyping,
  error,
  onSendMessage,
  onClearConversation,
  onEvaluate,
  isEvaluating,
}: DesignCoachChatProps) => {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
      console.error("Speech recognition error:", error);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    await onSendMessage(input);
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        // Try multiple selectors for the scrollable element
        const scrollElement = 
          scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") ||
          scrollAreaRef.current.querySelector("[data-radix-scroll-area-content]") ||
          scrollAreaRef.current;

        if (scrollElement) {
          // Use requestAnimationFrame to ensure DOM has updated
          requestAnimationFrame(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          });
        }
      }
    };

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="h-full flex flex-col border-l border-border rounded-none shadow-none min-w-0">
      {/* Chat Header */}
      <div className="flex-shrink-0 h-12 px-4 border-b border-border flex items-center justify-between min-w-0">
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
              onClick={onClearConversation}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

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
                      Ask questions about the system design or get feedback.
                    </p>
                  </div>
                </div>
              )}
              <div className={messages.length === 0 ? "" : "flex-1 space-y-4"}>
                {messages.map((message, idx) => (
                  <div key={idx} className="mb-6 min-w-0">
                    <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {/* Avatar for assistant (left side) */}
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="max-w-[80%] min-w-0">
                        <div 
                          className={`rounded-lg p-3 ${
                            message.role === "user"
                              ? "border border-primary/60 bg-card text-foreground"
                              : "border-l-4 border-accent/60 bg-accent/10 dark:bg-accent/15"
                          }`}
                        >
                          {message.role === "user" ? (
                            <p className="text-sm text-foreground">{message.content}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none text-muted-foreground">
                              <ReactMarkdown
                                components={{
                                code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const lang = match?.[1] || "python";
                                  if (!inline) {
                                    return (
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
                                        {String(children).replace(/\n$/, "")}
                                      </SyntaxHighlighter>
                                    );
                                  }
                                  return (
                                    <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                                  );
                                },
                                p: ({ children }) => (
                                  <p>{children}</p>
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

                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground mt-2 text-left">
                          {formatTime(message.timestamp)}
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
                  <div className="flex justify-start gap-3">
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

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 mt-2">
            {error}
          </div>
        )}

        {/* Evaluate Design Button */}
        <div className="mt-2">
          <Button
            onClick={onEvaluate}
            disabled={isEvaluating || messages.length === 0}
            className="w-full"
            variant="outline"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                Evaluate Design
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DesignCoachChat;
