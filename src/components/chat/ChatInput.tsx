import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  isTyping: boolean;
  // Speech-to-text props
  isListening: boolean;
  isProcessing: boolean;
  hasNativeSupport: boolean;
  onToggleMicrophone: () => void;
  speechError?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isTyping,
  isListening,
  isProcessing,
  hasNativeSupport,
  onToggleMicrophone,
  speechError,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex-shrink-0 p-4 border-t border-border">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <TextareaAutosize
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? " Listening..."
                : isProcessing
                  ? "🔄 Processing audio..."
                  : "Ask your AI coach anything..."
            }
            disabled={disabled || isTyping}
            className={`w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              hasNativeSupport ? "pr-10" : "pr-3"
            }`}
            minRows={1}
            maxRows={6}
          />
          {hasNativeSupport && (
            <button
              type="button"
              onClick={onToggleMicrophone}
              disabled={disabled || isTyping}
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
          onClick={onSend}
          disabled={!value.trim() || isTyping || disabled}
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
  );
}
