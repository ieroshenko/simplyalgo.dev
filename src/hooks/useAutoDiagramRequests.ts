import { useEffect, useRef } from 'react';
import { ChatMessage, FlowGraph } from '@/types';

interface MessageWithDiagram extends Omit<ChatMessage, 'diagram'> {
  diagram?: 
    | { engine: "mermaid"; code: string; title?: string }
    | { engine: "reactflow"; graph: FlowGraph; title?: string };
  suggestDiagram?: boolean;
}

/**
 * Hook to manage automatic diagram requests based on chat messages
 * @param messages - Array of chat messages
 * @param requestDiagram - Function to request a diagram
 */
export const useAutoDiagramRequests = (
  messages: ChatMessage[],
  requestDiagram: (content: string) => Promise<void>
) => {
  // Track message IDs we've already auto-requested diagrams for (avoid loops)
  const autoRequestedRef = useRef<Set<string>>(new Set());

  // Auto-request diagrams when conditions are met
  useEffect(() => {
    if (!messages.length) return;

    // If any assistant message already has a diagram, do not auto-request again on reload
    const anyDiagramExists = messages.some(
      (m) =>
        m.role === "assistant" &&
        Boolean((m as MessageWithDiagram).diagram)
    );
    if (anyDiagramExists) return;

    // Only consider the latest assistant message for auto-request
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant") as MessageWithDiagram | undefined;
    if (!lastAssistant) return;

    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    
    const userAsked = /(visualize|diagram|draw|flowchart|mermaid)/i.test(
      lastUserMsg
    );
    
    const hasDiagram = Boolean(lastAssistant.diagram);
    const assistantSuggests = lastAssistant.suggestDiagram === true;
    const id = lastAssistant.id;
    
    const shouldRequest =
      !hasDiagram &&
      (userAsked || assistantSuggests) &&
      !autoRequestedRef.current.has(id);

    if (shouldRequest) {
      autoRequestedRef.current.add(id);
      requestDiagram(lastAssistant.content);
    }
  }, [messages, requestDiagram]);

  // Reset auto diagram request tracker when conversation is cleared
  useEffect(() => {
    if (messages.length === 0) {
      autoRequestedRef.current = new Set();
    }
  }, [messages.length]);

  return {
    // Could add methods to manually manage the request state if needed
    hasAutoRequested: (messageId: string) => autoRequestedRef.current.has(messageId),
    clearAutoRequestHistory: () => {
      autoRequestedRef.current = new Set();
    }
  };
};