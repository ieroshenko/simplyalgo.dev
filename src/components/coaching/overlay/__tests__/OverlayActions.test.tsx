import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { OverlayActions } from '../OverlayActions';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('OverlayActions', () => {
    const defaultProps = {
        overlayState: 'initial' as const,
        onValidate: vi.fn(),
        onCancel: vi.fn(),
        onFinish: vi.fn(),
        onExitCoach: vi.fn(),
        onStartOptimization: vi.fn(),
        isValidating: false,
        isInserting: false,
        setIsInserting: vi.fn(),
        validationResult: null,
        onInsertCorrectCode: vi.fn(),
        hasError: false
    };

    beforeAll(() => {
        // Mock dialog methods which are not implemented in JSDOM
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Check Code button in initial state', () => {
        render(<OverlayActions {...defaultProps} />);
        expect(screen.getByRole('button', { name: /check code/i })).toBeInTheDocument();
    });

    it('renders loading state when validating', () => {
        render(<OverlayActions {...defaultProps} overlayState="validating" isValidating={true} />);
        expect(screen.getByRole('button', { name: /checking code/i })).toBeDisabled();
    });

    it('renders Try Again and View Code in incorrect state', () => {
        render(<OverlayActions {...defaultProps} overlayState="incorrect" validationResult={{ isCorrect: false, feedback: 'fail', codeToAdd: 'solution' }} />);
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /view code/i })).toBeInTheDocument();
    });

    it('renders Continue in correct state', () => {
        render(<OverlayActions {...defaultProps} overlayState="correct" />);
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('renders Finish and Optimize in completed state', () => {
        render(<OverlayActions {...defaultProps} overlayState="completed" isOptimizable={true} />);
        expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /optimize/i })).toBeInTheDocument();
    });

    it('renders Error actions when hasError is true', () => {
        render(<OverlayActions {...defaultProps} hasError={true} />);
        expect(screen.getByRole('button', { name: /continue coding/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /exit coach mode/i })).toBeInTheDocument();
    });

    it('calls onValidate when Check Code is clicked', () => {
        render(<OverlayActions {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /check code/i }));
        expect(defaultProps.onValidate).toHaveBeenCalled();
    });
});
