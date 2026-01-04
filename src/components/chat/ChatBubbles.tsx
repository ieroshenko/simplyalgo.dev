/**
 * ChatBubbles - Main chat interface component
 * Refactored to use extracted components
 */
import { Button } from "@/components/ui/button";
import { logger } from "@/utils/logger";
import { Send, Bot, Trash2, Loader2, Mic, MicOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useChatSession } from "@/hooks/useChatSession";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { CoachingMode, FlowGraph, CodeSnippet, Problem } from "@/types";
import TextareaAutosize from "react-textarea-autosize";
import { useTheme } from "@/hooks/useTheme";
import { CanvasContainer } from "@/components/canvas";

// Extracted components
import { ChatMessageComponent } from "./ChatMessage";
import { ChatTypingIndicator } from "./ChatTypingIndicator";
import { ChatEmptyState } from "./ChatEmptyState";
import { DiagramModal } from "./DiagramModal";

type ActiveDiagram =
  | { engine: "mermaid"; code: string }
  | { engine: "reactflow"; graph: FlowGraph };

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
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Diagram state
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<ActiveDiagram | null>(null);

  // Canvas state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("Interactive Component");

  // Single coaching mode: Socratic
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
      logger.error("[ChatBubbles] Speech recognition error", { error });
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

  return (
    <div className="h-full flex flex-col border-l border-border">
      {/* Chat Header */}
      <div className="flex-shrink-0 h-12 px-6 border-b border-border flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">Chat</div>
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

      {/* Messages */}
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
            <ChatEmptyState />
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ChatMessageComponent
                  key={message.id}
                  message={message}
                  isDarkMode={isDarkMode}
                  problem={problem}
                  onInsertCodeSnippet={onInsertCodeSnippet}
                  onOpenDiagramDialog={openDiagramDialog}
                  onOpenInteractiveDemo={openInteractiveDemo}
                />
              ))}
              {isTyping && <ChatTypingIndicator />}
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
                    : "Ask anything..."
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
      <DiagramModal
        isOpen={isDiagramOpen}
        onClose={() => setIsDiagramOpen(false)}
        diagram={activeDiagram}
      />

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
