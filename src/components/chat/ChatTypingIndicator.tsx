/**
 * Typing indicator component for chat
 */
import { Bot } from "lucide-react";

export const ChatTypingIndicator: React.FC = () => {
    return (
        <div className="mb-6">
            <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-chat-accent text-chat-accent-foreground">
                    <Bot className="w-4 h-4" />
                </div>
                <div className="max-w-[80%] min-w-0">
                    <div className="rounded-lg p-3 border border-chat-accent/40 bg-chat-accent/10 text-foreground dark:border-chat-accent/30 dark:bg-chat-accent/15">
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
    );
};
