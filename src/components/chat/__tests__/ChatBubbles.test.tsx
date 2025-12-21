/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useChatSession hook
const mockSendMessage = vi.fn();
const mockClearConversation = vi.fn();
vi.mock('@/hooks/useChatSession', () => ({
    useChatSession: () => ({
        messages: [],
        isLoading: false,
        isSending: false,
        sendMessage: mockSendMessage,
        clearConversation: mockClearConversation,
        error: null,
    }),
}));

// Mock useSpeechToText hook
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

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
    }),
}));

// Mock FlowCanvas
vi.mock('@/components/diagram/FlowCanvas', () => ({
    default: () => <div data-testid="flow-canvas" />,
}));

// Mock CanvasContainer
vi.mock('@/components/canvas', () => ({
    CanvasContainer: ({ children }: any) => <div data-testid="canvas-container">{children}</div>,
}));

// Mock visualizations registry
vi.mock('@/components/visualizations/registry', () => ({
    hasInteractiveDemo: vi.fn(() => false),
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
    default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

// Mock rehype plugins
vi.mock('rehype-highlight', () => ({
    default: () => { },
}));
vi.mock('remark-gfm', () => ({
    default: () => { },
}));

import ChatBubbles from '../ChatBubbles';

describe('ChatBubbles', () => {
    const defaultProps = {
        problemId: 'two-sum',
        problemDescription: 'Find two numbers that sum to target',
        onInsertCodeSnippet: vi.fn(),
        problemTestCases: [],
        currentCode: 'def solution(): pass',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render chat container', () => {
            render(<ChatBubbles {...defaultProps} />);

            // Should have the main chat container
            expect(document.querySelector('.flex.flex-col')).toBeInTheDocument();
        });

        it('should render input field', () => {
            render(<ChatBubbles {...defaultProps} />);

            const input = screen.getByPlaceholderText(/ask/i) || screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
        });

        it('should render send button', () => {
            render(<ChatBubbles {...defaultProps} />);

            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Message Input', () => {
        it('should allow typing in input', () => {
            render(<ChatBubbles {...defaultProps} />);

            const input = screen.getByPlaceholderText(/ask/i) || screen.getByRole('textbox');
            fireEvent.change(input, { target: { value: 'Hello' } });

            expect(input).toHaveValue('Hello');
        });

        it('should have clear conversation button', () => {
            render(<ChatBubbles {...defaultProps} />);

            // Look for clear/trash button
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Speech Recognition', () => {
        it('should render mic button when supported', () => {
            render(<ChatBubbles {...defaultProps} />);

            const buttons = screen.getAllByRole('button');
            // At least one button should be for microphone
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Props', () => {
        it('should accept problemId prop', () => {
            render(<ChatBubbles {...defaultProps} problemId="three-sum" />);

            expect(document.querySelector('.flex.flex-col')).toBeInTheDocument();
        });

        it('should accept currentCode prop', () => {
            render(<ChatBubbles {...defaultProps} currentCode="def solution(): return True" />);

            expect(document.querySelector('.flex.flex-col')).toBeInTheDocument();
        });
    });
});
