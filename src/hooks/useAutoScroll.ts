import { useEffect, RefObject, useCallback } from 'react';
import { ChatMessage } from '@/types';

interface UseAutoScrollOptions {
  enabled?: boolean;
}

/**
 * Custom hook for automatically scrolling to bottom of a scroll area when messages change
 * @param scrollAreaRef - Ref to the ScrollArea component
 * @param messages - Array of chat messages that triggers scroll
 * @param options - Configuration options
 */
export const useAutoScroll = (
  scrollAreaRef: RefObject<HTMLDivElement>,
  messages: ChatMessage[],
  options: UseAutoScrollOptions = {}
) => {
  const { enabled = true } = options;

  // Create a stable scroll function using useCallback
  const scrollToBottom = useCallback(() => {
    if (!scrollAreaRef.current) return;

    const scrollElement = scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [scrollAreaRef]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (!enabled) return;
    scrollToBottom();
  }, [messages, enabled, scrollToBottom]);

  return { 
    scrollToBottom
  };
};