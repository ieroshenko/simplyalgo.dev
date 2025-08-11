import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, ChatSession, CodeSnippet } from '@/types';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// --- Code snippet dedup helpers ---
const normalizeSnippet = (s: CodeSnippet): string => {
  const type = s.insertionHint?.type || '';
  const scope = s.insertionHint?.scope || '';
  const code = (s.code || '').replace(/\s+/g, ' ').trim();
  const language = (s.language || '').toLowerCase();
  const insertionType = (s.insertionType || '').toString().toLowerCase();
  return `${language}|${insertionType}|${type}|${scope}|${code}`;
};

const getSeenSnippetKeys = (existingMessages: ChatMessage[]): Set<string> => {
  const seen = new Set<string>();
  for (const m of existingMessages) {
    if (Array.isArray(m.codeSnippets)) {
      for (const s of m.codeSnippets) {
        seen.add(normalizeSnippet(s));
      }
    }
  }
  return seen;
};

const dedupeSnippets = (
  incoming: CodeSnippet[] | undefined,
  existingMessages: ChatMessage[]
): CodeSnippet[] | undefined => {
  if (!incoming || incoming.length === 0) return undefined;
  const seen = getSeenSnippetKeys(existingMessages);
  const unique: CodeSnippet[] = [];
  for (const s of incoming) {
    if (!s?.isValidated) continue; // guard and ensure only validated snippets
    const key = normalizeSnippet(s);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  return unique.length ? unique : undefined;
};

interface UseChatSessionProps {
  problemId: string;
  problemDescription: string;
  problemTestCases?: unknown[];
}

export const useChatSession = ({ problemId, problemDescription, problemTestCases }: UseChatSessionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Find or create session
  const initializeSession = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Try to find existing session
      const { data: existingSessions, error: sessionError } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_id', problemId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      let currentSession: ChatSession;

      if (existingSessions && existingSessions.length > 0) {
        // Use existing session
        const dbSession = existingSessions[0];
        currentSession = {
          id: dbSession.id,
          userId: dbSession.user_id,
          problemId: dbSession.problem_id,
          title: dbSession.title,
          createdAt: new Date(dbSession.created_at),
          updatedAt: new Date(dbSession.updated_at)
        };
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('ai_chat_sessions')
          .insert({
            user_id: user.id,
            problem_id: problemId,
            title: `Chat for Problem ${problemId}`
          })
          .select()
          .single();

        if (createError) throw createError;

        currentSession = {
          id: newSession.id,
          userId: newSession.user_id,
          problemId: newSession.problem_id,
          title: newSession.title,
          createdAt: new Date(newSession.created_at),
          updatedAt: new Date(newSession.updated_at)
        };
      }

      setSession(currentSession);

      // Load messages for this session
      const { data: sessionMessages, error: messagesError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', currentSession.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      type DbMessage = {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        created_at: string;
        session_id: string;
        code_snippets?: CodeSnippet[] | null;
      };
      const formattedMessages: ChatMessage[] = (sessionMessages as DbMessage[]).map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        sessionId: msg.session_id,
        codeSnippets: msg.code_snippets || undefined
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error initializing chat session:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, problemId, toast]);

  // Save message to database
  const saveMessage = useCallback(async (message: ChatMessage) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: session.id,
          role: message.role,
          content: message.content,
          code_snippets: message.codeSnippets || null
        });

      if (error) throw error;

      // Update session timestamp
      await supabase
        .from('ai_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id);

    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: "Error",
        description: "Failed to save message. Please try again.",
        variant: "destructive"
      });
    }
  }, [session, toast]);

  // Send message to AI and save both user and AI messages
  const sendMessage = useCallback(async (content: string, options?: { action?: 'diagram' }) => {
    if (!content.trim() || !session || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      sessionId: session.id
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Save user message to database
    await saveMessage(userMessage);

    try {
      // Prepare conversation history for AI
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call AI function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: content,
          problemDescription,
          conversationHistory,
          testCases: problemTestCases,
          diagram: options?.action === 'diagram'
        }
      });

      if (error) throw error;

      // Parse AI response with code snippets from LLM analysis
      const aiResponseContent = data.response;
      const rawSnippets: CodeSnippet[] | undefined =
        data.codeSnippets && Array.isArray(data.codeSnippets) ? data.codeSnippets : undefined;

      // Gate snippet visibility: only when user explicitly asks for code or pasted code
      const lastUserMsg = content;
      const hasExplicitCode = /```[\s\S]*?```|`[^`]+`/m.test(lastUserMsg);
      const explicitAsk = /\b(write|show|give|provide|insert|add|implement|code|import|define|declare|create)\b/i.test(lastUserMsg);
      const allowSnippets = hasExplicitCode || explicitAsk;

      // Dedupe snippets against entire session and within this response
      let dedupedSnippets = allowSnippets ? dedupeSnippets(rawSnippets, messages) : undefined;

      // Additional guard: drop import suggestions unless the user explicitly asked about imports
      const explicitImportAsk = /\b(import|from\s+\w+\s+import|how\s+to\s+import)\b/i.test(lastUserMsg);
      if (dedupedSnippets && !explicitImportAsk) {
        dedupedSnippets = dedupedSnippets.filter(s => {
          const isImport = (s.insertionHint?.type === 'import') || /^(\s*)(from\s+\S+\s+import\s+\S+|import\s+\S+)/.test(s.code || '');
          return !isImport;
        });
        if (dedupedSnippets.length === 0) dedupedSnippets = undefined;
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date(),
        sessionId: session.id,
        codeSnippets: dedupedSnippets,
        diagram: data.diagram && data.diagram.engine === 'mermaid' && typeof data.diagram.code === 'string'
          ? { engine: 'mermaid', code: data.diagram.code, title: data.diagram.title }
          : undefined,
        suggestDiagram: typeof data.suggestDiagram === 'boolean' ? data.suggestDiagram : undefined
      };

      // Add AI response to UI
      setMessages(prev => [...prev, aiResponse]);

      // Save AI response to database
      await saveMessage(aiResponse);

    } catch (error) {
      console.error('Error calling AI:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  }, [session, messages, problemDescription, problemTestCases, isTyping, saveMessage, toast]);

  // Clear conversation
  const clearConversation = useCallback(async () => {
    if (!session) return;

    try {
      // Delete all messages for this session
      const { error } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('session_id', session.id);

      if (error) throw error;

      setMessages([]);
      
      toast({
        title: "Success",
        description: "Conversation cleared successfully."
      });

    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: "Error",
        description: "Failed to clear conversation. Please try again.",
        variant: "destructive"
      });
    }
  }, [session, toast]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Generate diagram without posting a user message
  const requestDiagram = useCallback(async (sourceText: string) => {
    if (!session || isTyping) return;
    setIsTyping(true);
    try {
      const conversationHistory = messages.map(msg => ({ role: msg.role, content: msg.content }));
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: sourceText,
          problemDescription,
          conversationHistory,
          diagram: true
        }
      });
      if (error) throw error;

      const diagramPayload = data?.diagram && data.diagram.engine === 'mermaid' && typeof data.diagram.code === 'string'
        ? { engine: 'mermaid' as const, code: data.diagram.code, title: data.diagram.title as string | undefined }
        : undefined;

      if (!diagramPayload) {
        toast({ title: 'No diagram', description: 'The model did not return a diagram for this request.' });
        return;
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        sessionId: session.id,
        diagram: diagramPayload
      };

      setMessages(prev => [...prev, aiResponse]);
      await saveMessage(aiResponse);
    } catch (error) {
      console.error('Error generating diagram:', error);
      toast({
        title: 'Diagram error',
        description: 'Failed to generate diagram. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsTyping(false);
    }
  }, [session, isTyping, messages, problemDescription, saveMessage, toast]);

  return {
    session,
    messages,
    loading,
    isTyping,
    sendMessage,
    clearConversation,
    requestDiagram
  };
};