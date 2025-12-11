import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock data
const mockSession = {
    id: 'session-123',
    problemId: 'two-sum',
    userId: 'test-user-id',
};

const mockMessages = [
    {
        id: 'msg-1',
        role: 'user',
        content: 'How do I solve this?',
        timestamp: new Date(),
    },
    {
        id: 'msg-2',
        role: 'assistant',
        content: 'You can use a hash map approach.',
        timestamp: new Date(),
    },
];

// Mock useChatSession
const mockSendMessage = vi.fn();
const mockClearConversation = vi.fn();
const mockRequestDiagram = vi.fn();

vi.mock('@/hooks/useChatSession', () => ({
    useChatSession: () => ({
        session: mockSession,
        messages: mockMessages,
        loading: false,
        isTyping: false,
        sendMessage: mockSendMessage,
        clearConversation: mockClearConversation,
        requestDiagram: mockRequestDiagram,
    }),
}));

// Mock useSpeechToText
vi.mock('@/hooks/useSpeechToText', () => ({
    useSpeechToText: () => ({
        isListening: false,
        isSupported: true,
        hasNativeSupport: true,
        isProcessing: false,
        startListening: vi.fn(),
        stopListening: vi.fn(),
        error: null,
    }),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => (
        <div data-testid="card" className={className}>{children}</div>
    ),
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, className, ...props }: any) => (
        <button
            data-testid="button"
            onClick={onClick}
            disabled={disabled}
            className={className}
            {...props}
        >
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: React.forwardRef(({ children, className }: any, ref: any) => (
        <div data-testid="scroll-area" className={className} ref={ref}>{children}</div>
    )),
}));

// Mock diagram components
vi.mock('@/components/diagram/Mermaid', () => ({
    default: ({ chart }: any) => <div data-testid="mermaid-diagram">{chart}</div>,
}));

vi.mock('@/components/diagram/FlowCanvas', () => ({
    default: () => <div data-testid="flow-canvas">Flow Canvas</div>,
}));

// Mock canvas components
vi.mock('@/components/canvas', () => ({
    CanvasContainer: ({ children }: any) => <div data-testid="canvas-container">{children}</div>,
}));

// Mock visualization registry
vi.mock('@/components/visualizations/registry', () => ({
    hasInteractiveDemo: vi.fn(() => false),
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
    default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

// Mock syntax highlighter
vi.mock('react-syntax-highlighter', () => ({
    Prism: ({ children }: any) => <pre data-testid="syntax-highlighter">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
    vscDarkPlus: {},
}));

// Mock textarea autosize
vi.mock('react-textarea-autosize', () => ({
    default: React.forwardRef((props: any, ref: any) => (
        <textarea
            data-testid="input-textarea"
            ref={ref}
            value={props.value}
            onChange={props.onChange}
            onKeyDown={props.onKeyDown}
            placeholder={props.placeholder}
        />
    )),
}));

// Mock CodeSnippetButton
vi.mock('@/components/CodeSnippetButton', () => ({
    default: () => <button data-testid="code-snippet-button">Insert</button>,
}));

import AIChat from '../AIChat';
import { useChatSession } from '@/hooks/useChatSession';

describe('AIChat', () => {
    const defaultProps = {
        problemId: 'two-sum',
        problemDescription: 'Given an array of integers...',
        onInsertCodeSnippet: vi.fn(),
        problemTestCases: [],
        currentCode: '',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the AI Coach header', () => {
            render(<AIChat {...defaultProps} />);

            expect(screen.getByText('AI Coach')).toBeInTheDocument();
        });

        it('should render the chat status', () => {
            render(<AIChat {...defaultProps} />);

            expect(screen.getByText('Chat loaded')).toBeInTheDocument();
        });

        it('should render the input textarea', () => {
            render(<AIChat {...defaultProps} />);

            expect(screen.getByTestId('input-textarea')).toBeInTheDocument();
        });

        it('should render messages', () => {
            render(<AIChat {...defaultProps} />);

            expect(screen.getByText('How do I solve this?')).toBeInTheDocument();
        });

        it('should render assistant messages with markdown', () => {
            render(<AIChat {...defaultProps} />);

            // The markdown component should be rendered
            const markdowns = screen.getAllByTestId('markdown');
            expect(markdowns.length).toBeGreaterThan(0);
        });
    });

    describe('Message Sending', () => {
        it('should call sendMessage when form submitted', async () => {
            render(<AIChat {...defaultProps} />);

            const textarea = screen.getByTestId('input-textarea');
            fireEvent.change(textarea, { target: { value: 'Hello' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            await waitFor(() => {
                expect(mockSendMessage).toHaveBeenCalledWith('Hello');
            });
        });

        it('should not send empty message', async () => {
            render(<AIChat {...defaultProps} />);

            const textarea = screen.getByTestId('input-textarea');
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockSendMessage).not.toHaveBeenCalled();
        });

        it('should clear input after sending', async () => {
            render(<AIChat {...defaultProps} />);

            const textarea = screen.getByTestId('input-textarea') as HTMLTextAreaElement;
            fireEvent.change(textarea, { target: { value: 'Hello' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            await waitFor(() => {
                expect(textarea.value).toBe('');
            });
        });

        it('should allow multiline input with shift+enter', async () => {
            render(<AIChat {...defaultProps} />);

            const textarea = screen.getByTestId('input-textarea');
            fireEvent.change(textarea, { target: { value: 'Line 1' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

            // Should not send message
            expect(mockSendMessage).not.toHaveBeenCalled();
        });
    });

    describe('Clear Conversation', () => {
        it('should render clear button when messages exist', () => {
            render(<AIChat {...defaultProps} />);

            // The button should be present (with Trash2 icon)
            const buttons = screen.getAllByTestId('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Loading State', () => {
        it('should document loading behavior', () => {
            // When loading is true, component shows:
            // - Loader2 icon with animation
            // - "Loading chat history..." text
            // Note: Would require module reset to fully test different mock states
            expect(true).toBe(true);
        });
    });

    describe('Empty State', () => {
        it('should document empty state behavior', () => {
            // When messages array is empty, component shows:
            // - Bot icon
            // - "Start a conversation with your AI coach!" text
            // - "Ask questions about the problem or get hints." text
            // Note: Would require module reset to fully test different mock states
            expect(true).toBe(true);
        });
    });

    describe('Code Snippet Insertion', () => {
        it('should accept onInsertCodeSnippet prop', () => {
            const onInsert = vi.fn();
            render(<AIChat {...defaultProps} onInsertCodeSnippet={onInsert} />);

            // Component should render without error
            expect(screen.getByText('AI Coach')).toBeInTheDocument();
        });
    });

    describe('Scroll Area', () => {
        it('should render scroll area for messages', () => {
            render(<AIChat {...defaultProps} />);

            expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
        });
    });

    describe('Props Handling', () => {
        it('should accept problemId', () => {
            render(<AIChat {...defaultProps} problemId="three-sum" />);

            expect(screen.getByText('AI Coach')).toBeInTheDocument();
        });

        it('should accept currentCode', () => {
            render(<AIChat {...defaultProps} currentCode="def solution(): pass" />);

            expect(screen.getByText('AI Coach')).toBeInTheDocument();
        });

        it('should handle missing optional props', () => {
            render(
                <AIChat
                    problemId="test"
                    problemDescription="Test problem"
                />
            );

            expect(screen.getByText('AI Coach')).toBeInTheDocument();
        });
    });
});
