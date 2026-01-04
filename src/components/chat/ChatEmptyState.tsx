/**
 * Empty state component for chat
 */
import { Bot } from "lucide-react";

export const ChatEmptyState: React.FC = () => {
    return (
        <div className="text-center text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Ask questions about the problem or get hints!</p>
            <p className="text-xs mt-1">(does not give away solutions unless asked explicitly)</p>
        </div>
    );
};
