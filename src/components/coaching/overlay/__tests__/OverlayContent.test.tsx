import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OverlayContent } from '../OverlayContent';

describe('OverlayContent', () => {
    const defaultProps = {
        overlayState: 'initial' as const,
        shouldShowQuestion: true,
        question: 'Main Question',
        hint: 'Some hint',
        validationResult: null,
        studentExplanation: '',
        setStudentExplanation: vi.fn(),
        showTextInput: false,
        setShowTextInput: vi.fn(),
        hasError: false,
        isSessionCompleted: false,
    };

    it('renders question and hint in initial state', () => {
        render(<OverlayContent {...defaultProps} />);
        expect(screen.getByText('Main Question')).toBeInTheDocument();
        // Hint uses BlurredSection which renders "Click to reveal Hint" or similar
        expect(screen.getByText(/click to reveal hint/i)).toBeInTheDocument();
    });

    it('renders instructions and explanation input toggle', () => {
        render(<OverlayContent {...defaultProps} />);
        expect(screen.getByText(/add explanation/i)).toBeInTheDocument();
        // Text area should be hidden initially
        expect(screen.queryByPlaceholderText(/explain what you/i)).not.toBeInTheDocument();
    });

    it('toggles explanation input', () => {
        const setShowTextInput = vi.fn();
        render(<OverlayContent {...defaultProps} setShowTextInput={setShowTextInput} />);
        fireEvent.click(screen.getByText(/add explanation/i));
        expect(setShowTextInput).toHaveBeenCalledWith(true);
    });

    it('renders input field when showTextInput is true', () => {
        render(<OverlayContent {...defaultProps} showTextInput={true} />);
        expect(screen.getByPlaceholderText(/explain what you/i)).toBeInTheDocument();
    });

    it('renders validation feedback (correct)', () => {
        render(<OverlayContent {...defaultProps} overlayState="correct" validationResult={{ isCorrect: true, feedback: 'Well done!' }} />);
        expect(screen.getByText('Well done!')).toBeInTheDocument();
        expect(screen.getByText('Great work!')).toBeInTheDocument();
    });

    it('renders validation feedback (incorrect)', () => {
        render(<OverlayContent {...defaultProps} overlayState="incorrect" validationResult={{ isCorrect: false, feedback: 'Try again.' }} />);
        expect(screen.getByText('Try again.')).toBeInTheDocument();
        expect(screen.getByText('Not quite right')).toBeInTheDocument();
    });

    it('renders session completed state', () => {
        render(<OverlayContent {...defaultProps} overlayState="completed" isSessionCompleted={true} />);
        expect(screen.getByText('Problem Solved!')).toBeInTheDocument();
    });

    it('renders error state', () => {
        render(<OverlayContent {...defaultProps} hasError={true} />);
        expect(screen.getByText('AI Coach Unavailable')).toBeInTheDocument();
    });
});
