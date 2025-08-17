import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, ChatSession, CodeSnippet, FlowGraph } from '@/types';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// --- Diagram payload helper & types ---
type DiagramPayload =
  | { engine: 'mermaid'; code: string; title?: string }
  | { engine: 'reactflow'; graph: FlowGraph; title?: string };

type MaybeMermaid = { engine?: unknown; code?: unknown; title?: unknown } | null | undefined;
type MaybeReactflow = { engine?: unknown; graph?: { nodes?: unknown; edges?: unknown } | unknown; title?: unknown } | null | undefined;

const isMermaidDiagram = (d: unknown): d is { engine: 'mermaid'; code: string; title?: string } => {
  const m = d as MaybeMermaid;
  return !!m && m.engine === 'mermaid' && typeof m.code === 'string';
};

const isReactflowDiagram = (
  d: unknown
): d is { engine: 'reactflow'; graph: { nodes: unknown[]; edges: unknown[] }; title?: string } => {
  const r = d as MaybeReactflow;
  const hasGraph = !!r && typeof r === 'object' && 'graph' in (r as object);
  const graph = hasGraph ? (r as { graph: unknown }).graph as { nodes?: unknown; edges?: unknown } : undefined;
  const hasEngine = !!r && typeof r === 'object' && 'engine' in (r as object);
  const engine = hasEngine ? (r as { engine: unknown }).engine : undefined;
  return (
    engine === 'reactflow' &&
    !!graph &&
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges)
  );
};

const getDiagramPayload = (diagram: unknown): DiagramPayload | undefined => {
  if (isMermaidDiagram(diagram)) {
    return { engine: 'mermaid', code: diagram.code, title: diagram.title };
  }
  if (isReactflowDiagram(diagram)) {
    const g = diagram.graph as unknown as FlowGraph;
    const t = diagram.title as string | undefined;
    return { engine: 'reactflow', graph: g, title: t };
  }
  return undefined;
};

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
  currentCode?: string;
}

export const useChatSession = ({ problemId, problemDescription, problemTestCases, currentCode }: UseChatSessionProps) => {
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
        diagram?: unknown | null;
        suggest_diagram?: boolean | null;
      };
      const formattedMessages: ChatMessage[] = (sessionMessages as DbMessage[]).map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        sessionId: msg.session_id,
        codeSnippets: msg.code_snippets || undefined,
        diagram: getDiagramPayload(msg.diagram),
        suggestDiagram: typeof msg.suggest_diagram === 'boolean' ? msg.suggest_diagram : undefined
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
          code_snippets: message.codeSnippets || null,
          diagram: message.diagram ? message.diagram : null,
          suggest_diagram: typeof message.suggestDiagram === 'boolean' ? message.suggestDiagram : null
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
          diagram: options?.action === 'diagram',
          currentCode: currentCode
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
        diagram: getDiagramPayload(data?.diagram),
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
      // Enter loading state to block UI interactions during reset
      setLoading(true);
      setIsTyping(false);

      // Call edge function to clear chat (messages + session)
      const { error, data } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'clear_chat',
          sessionId: session.id,
          userId: user?.id,
        },
      });

      if (error || (data && data.ok === false)) {
        throw error || new Error('Failed to clear chat');
      }

      // Reset local state
      setMessages([]);
      setSession(null);

      // Immediately create a fresh session so sendMessage can proceed without page reload
      await initializeSession();

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
    } finally {
      setLoading(false);
    }
  }, [session, user?.id, toast, initializeSession]);

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
          diagram: true,
          preferredEngines: ['reactflow', 'mermaid']
        }
      });
      if (error) throw error;

      const diagramPayload = getDiagramPayload(data?.diagram ?? data);

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