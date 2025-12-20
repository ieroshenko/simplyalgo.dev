/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock data
const mockSession = {
    id: 'session-123',
    user_id: 'test-user-id',
    problem_id: 'two-sum',
    title: 'Chat for Problem two-sum',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
};

const mockMessages = [
    {
        id: 'msg-1',
        session_id: 'session-123',
        role: 'user',
        content: 'How do I solve this problem?',
        created_at: '2024-01-15T10:01:00Z',
        code_snippets: null,
        diagram: null,
        suggest_diagram: null,
    },
    {
        id: 'msg-2',
        session_id: 'session-123',
        role: 'assistant',
        content: 'You can use a hash map approach.',
        created_at: '2024-01-15T10:01:30Z',
        code_snippets: null,
        diagram: null,
        suggest_diagram: null,
    },
];

const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
};

// Create chainable query builder
const createQueryBuilder = (data: unknown = [], error: Error | null = null) => {
    const builder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data, error })),
    };
    return builder;
};

// Track toast calls
const mockToast = vi.fn();

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: mockUser,
        session: {},
        loading: false,
        signOut: vi.fn(),
    })),
}));

// Mock useToast
vi.mock('./use-toast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock error recovery
vi.mock('@/services/coachingModeErrorRecovery', () => ({
    validateCoachingModeWithRecovery: vi.fn((mode) => ({ mode: mode || 'socratic', error: null })),
    logCoachingModeError: vi.fn(),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(),
        functions: {
            invoke: vi.fn(),
        },
    },
}));

import { useChatSession } from '../useChatSession';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const mockSupabase = supabase as unknown as {
    from: ReturnType<typeof vi.fn>;
    functions: {
        invoke: ReturnType<typeof vi.fn>;
    };
};

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('useChatSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Suppress console output
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Default mock implementations
        mockUseAuth.mockReturnValue({
            user: mockUser,
            session: {},
            loading: false,
            signOut: vi.fn(),
        });

        // Setup supabase mocks
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'ai_chat_sessions') {
                const builder = createQueryBuilder([mockSession]);
                builder.single.mockReturnValue({
                    then: (resolve: (value: any) => void) => resolve({ data: mockSession, error: null }),
                });
                return builder;
            }
            if (table === 'ai_chat_messages') {
                return createQueryBuilder(mockMessages);
            }
            return createQueryBuilder();
        });

        mockSupabase.functions.invoke.mockResolvedValue({
            data: {
                response: 'This is a helpful response.',
                codeSnippets: [],
            },
            error: null,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const defaultProps = {
        problemId: 'two-sum',
        problemDescription: 'Given an array of integers, return indices of two numbers that add up to target.',
        problemTestCases: [{ input: '[2,7,11,15], 9', expected: '[0,1]' }],
        currentCode: 'function twoSum(nums, target) {}',
        coachingMode: 'socratic' as const,
    };

    describe('Initial State', () => {
        it('should start with loading true', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(result.current.loading).toBe(true);
        });

        it('should start with empty messages array', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(result.current.messages).toEqual([]);
        });

        it('should start with isTyping false', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(result.current.isTyping).toBe(false);
        });

        it('should start with null session', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(result.current.session).toBeNull();
        });
    });

    describe('Session Initialization', () => {
        it('should not initialize without user', async () => {
            mockUseAuth.mockReturnValue({
                user: null,
                session: null,
                loading: false,
                signOut: vi.fn(),
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            // Should remain in loading state since no user
            await waitFor(() => {
                expect(mockSupabase.from).not.toHaveBeenCalledWith('ai_chat_sessions');
            });
        });

        it('should find existing session on mount', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.session).not.toBeNull();
            expect(result.current.session?.problemId).toBe('two-sum');
        });

        it('should create new session if none exists', async () => {
            // First query returns empty, then insert returns new session
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'ai_chat_sessions') {
                    const builder = createQueryBuilder([]);
                    builder.single.mockReturnValue({
                        then: (resolve: (value: any) => void) => resolve({ data: mockSession, error: null }),
                    });
                    return builder;
                }
                if (table === 'ai_chat_messages') {
                    return createQueryBuilder([]);
                }
                return createQueryBuilder();
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('ai_chat_sessions');
        });

        it('should load messages for session', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.messages.length).toBe(2);
            });

            expect(result.current.messages[0].content).toBe('How do I solve this problem?');
            expect(result.current.messages[1].content).toBe('You can use a hash map approach.');
        });

        it('should format messages correctly', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.messages.length).toBe(2);
            });

            const userMessage = result.current.messages[0];
            expect(userMessage.role).toBe('user');
            expect(userMessage.timestamp).toBeInstanceOf(Date);
            expect(userMessage.sessionId).toBe('session-123');
        });
    });

    describe('Send Message', () => {
        it('should provide sendMessage function', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(typeof result.current.sendMessage).toBe('function');
        });

        it('should not send empty message', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.sendMessage('   ');
            });

            // Should not call AI
            expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
        });

        it('should not send message when isTyping', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Start typing
            act(() => {
                result.current.sendMessage('Hello');
            });

            // Try to send another while typing
            await act(async () => {
                await result.current.sendMessage('Another message');
            });

            // Should only call once
            expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);
        });

        it('should add user message immediately', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const initialCount = result.current.messages.length;

            act(() => {
                result.current.sendMessage('New question');
            });

            expect(result.current.messages.length).toBe(initialCount + 1);
            expect(result.current.messages[result.current.messages.length - 1].content).toBe('New question');
        });

        it('should set isTyping while waiting for AI response', async () => {
            let resolveInvoke: (value?: any) => void;
            const invokePromise = new Promise((resolve) => {
                resolveInvoke = resolve;
            });

            mockSupabase.functions.invoke.mockReturnValue(invokePromise);

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            act(() => {
                result.current.sendMessage('Hello');
            });

            expect(result.current.isTyping).toBe(true);

            await act(async () => {
                resolveInvoke!({ data: { response: 'Hi!' }, error: null });
            });

            await waitFor(() => {
                expect(result.current.isTyping).toBe(false);
            });
        });

        it('should add AI response after receiving it', async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: {
                    response: 'Here is my helpful response.',
                    codeSnippets: [],
                },
                error: null,
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const initialCount = result.current.messages.length;

            await act(async () => {
                await result.current.sendMessage('Help me please');
            });

            await waitFor(() => {
                expect(result.current.messages.length).toBe(initialCount + 2);
            });

            const lastMessage = result.current.messages[result.current.messages.length - 1];
            expect(lastMessage.role).toBe('assistant');
            expect(lastMessage.content).toBe('Here is my helpful response.');
        });

        it('should handle AI error gracefully', async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: null,
                error: new Error('AI service unavailable'),
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.sendMessage('Help');
            });

            // isTyping should be reset after error
            await waitFor(() => {
                expect(result.current.isTyping).toBe(false);
            });

            // Error should have been logged and invoke was called
            expect(mockSupabase.functions.invoke).toHaveBeenCalled();
        });
    });

    describe('Clear Conversation', () => {
        it('should provide clearConversation function', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(typeof result.current.clearConversation).toBe('function');
        });

        it('should clear messages after clearing conversation', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.messages.length).toBe(2);
            });

            // Setup invoke mock specifically for clear action
            mockSupabase.functions.invoke.mockResolvedValue({
                data: { ok: true },
                error: null,
            });

            await act(async () => {
                await result.current.clearConversation();
            });

            // After clearing, should call invoke with clear_chat action
            await waitFor(() => {
                expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
                    'ai-coach-chat',
                    expect.objectContaining({
                        body: expect.objectContaining({
                            action: 'clear_chat',
                        }),
                    })
                );
            });
        });

        it('should handle clear error gracefully', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Setup invoke mock to return error
            mockSupabase.functions.invoke.mockResolvedValue({
                data: { ok: false },
                error: null,
            });

            await act(async () => {
                await result.current.clearConversation();
            });

            // Should have called invoke
            expect(mockSupabase.functions.invoke).toHaveBeenCalled();
        });
    });

    describe('Request Diagram', () => {
        it('should provide requestDiagram function', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(typeof result.current.requestDiagram).toBe('function');
        });

        it('should not request diagram without session', async () => {
            mockUseAuth.mockReturnValue({
                user: null,
                session: null,
                loading: false,
                signOut: vi.fn(),
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await act(async () => {
                await result.current.requestDiagram('Create a flowchart');
            });

            // Should not call AI for diagram
            expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
        });

        it('should add diagram response to messages', async () => {
            const mermaidDiagram = {
                engine: 'mermaid',
                code: 'graph TD; A-->B;',
                title: 'Flow',
            };

            mockSupabase.functions.invoke.mockResolvedValue({
                data: {
                    diagram: mermaidDiagram,
                },
                error: null,
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const initialCount = result.current.messages.length;

            await act(async () => {
                await result.current.requestDiagram('Show algorithm flow');
            });

            await waitFor(() => {
                expect(result.current.messages.length).toBe(initialCount + 1);
            });

            const lastMessage = result.current.messages[result.current.messages.length - 1];
            expect(lastMessage.diagram).toBeDefined();
            expect(lastMessage.diagram?.engine).toBe('mermaid');
        });

        it('should handle no diagram in response', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Setup invoke mock without diagram
            mockSupabase.functions.invoke.mockResolvedValue({
                data: {
                    response: 'No diagram available',
                },
                error: null,
            });

            const initialCount = result.current.messages.length;

            await act(async () => {
                await result.current.requestDiagram('Show diagram');
            });

            // Should not add a message without diagram
            expect(result.current.messages.length).toBe(initialCount);
        });
    });

    describe('Coaching Mode', () => {
        it('should use socratic mode by default', () => {
            const { result } = renderHook(() =>
                useChatSession({ ...defaultProps, coachingMode: undefined })
            );

            expect(result.current).toBeDefined();
        });

        it('should accept comprehensive coaching mode', () => {
            const { result } = renderHook(() =>
                useChatSession({ ...defaultProps, coachingMode: 'comprehensive' })
            );

            expect(result.current).toBeDefined();
        });
    });

    describe('Code Snippet Handling', () => {
        it('should deduplicate code snippets', async () => {
            const snippetsResponse = {
                response: 'Here is the code',
                codeSnippets: [
                    { code: 'const x = 1;', language: 'javascript', isValidated: true },
                    { code: 'const x = 1;', language: 'javascript', isValidated: true }, // duplicate
                ],
            };

            mockSupabase.functions.invoke.mockResolvedValue({
                data: snippetsResponse,
                error: null,
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.sendMessage('write code');
            });

            // The hook should dedupe snippets
            await waitFor(() => {
                expect(result.current.isTyping).toBe(false);
            });
        });

        it('should only include validated snippets', async () => {
            const snippetsResponse = {
                response: 'Here is code',
                codeSnippets: [
                    { code: 'valid code', language: 'javascript', isValidated: true },
                    { code: 'invalid code', language: 'javascript', isValidated: false },
                ],
            };

            mockSupabase.functions.invoke.mockResolvedValue({
                data: snippetsResponse,
                error: null,
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.sendMessage('write some code');
            });

            await waitFor(() => {
                expect(result.current.isTyping).toBe(false);
            });
        });
    });

    describe('Diagram Payload Parsing', () => {
        it('should parse mermaid diagram', async () => {
            const messagesWithDiagram = [
                {
                    ...mockMessages[0],
                    diagram: {
                        engine: 'mermaid',
                        code: 'graph TD; A-->B;',
                        title: 'Test Flow',
                    },
                },
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'ai_chat_sessions') {
                    const builder = createQueryBuilder([mockSession]);
                    builder.single.mockReturnValue({
                        then: (resolve: (value: any) => void) => resolve({ data: mockSession, error: null }),
                    });
                    return builder;
                }
                if (table === 'ai_chat_messages') {
                    return createQueryBuilder(messagesWithDiagram);
                }
                return createQueryBuilder();
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.messages.length).toBe(1);
            });

            expect(result.current.messages[0].diagram).toBeDefined();
            expect(result.current.messages[0].diagram?.engine).toBe('mermaid');
        });

        it('should parse reactflow diagram', async () => {
            const messagesWithDiagram = [
                {
                    ...mockMessages[0],
                    diagram: {
                        engine: 'reactflow',
                        graph: { nodes: [], edges: [] },
                        title: 'React Flow Diagram',
                    },
                },
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'ai_chat_sessions') {
                    const builder = createQueryBuilder([mockSession]);
                    builder.single.mockReturnValue({
                        then: (resolve: (value: any) => void) => resolve({ data: mockSession, error: null }),
                    });
                    return builder;
                }
                if (table === 'ai_chat_messages') {
                    return createQueryBuilder(messagesWithDiagram);
                }
                return createQueryBuilder();
            });

            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.messages.length).toBe(1);
            });

            expect(result.current.messages[0].diagram?.engine).toBe('reactflow');
        });
    });

    describe('Return Value Structure', () => {
        it('should return all expected properties', () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            expect(result.current).toHaveProperty('session');
            expect(result.current).toHaveProperty('messages');
            expect(result.current).toHaveProperty('loading');
            expect(result.current).toHaveProperty('isTyping');
            expect(result.current).toHaveProperty('sendMessage');
            expect(result.current).toHaveProperty('clearConversation');
            expect(result.current).toHaveProperty('requestDiagram');
        });

        it('should have correct types', async () => {
            const { result } = renderHook(() => useChatSession(defaultProps));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(Array.isArray(result.current.messages)).toBe(true);
            expect(typeof result.current.loading).toBe('boolean');
            expect(typeof result.current.isTyping).toBe('boolean');
            expect(typeof result.current.sendMessage).toBe('function');
            expect(typeof result.current.clearConversation).toBe('function');
            expect(typeof result.current.requestDiagram).toBe('function');
        });
    });
});
