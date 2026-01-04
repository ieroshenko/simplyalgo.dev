import { Button } from "@/components/ui/button";
import { Bot, Trash2 } from "lucide-react";

interface ChatHeaderProps {
  loading: boolean;
  hasSession: boolean;
  hasMessages: boolean;
  onClearConversation: () => void;
}

export function ChatHeader({
  loading,
  hasSession,
  hasMessages,
  onClearConversation,
}: ChatHeaderProps) {
  return (
    <div className="flex-shrink-0 h-12 px-6 border-b border-border flex items-center justify-between min-w-0">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">Chat</div>
          <div className="text-xs text-muted-foreground truncate">
            {loading ? "Loading chat..." : hasSession ? "Chat loaded" : "Online"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hasSession && hasMessages && (
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
  );
}
