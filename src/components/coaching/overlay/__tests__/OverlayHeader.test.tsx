import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OverlayHeader } from '../OverlayHeader';

describe('OverlayHeader', () => {
    const defaultProps = {
        positionPreset: 'auto' as const,
        onApplyPreset: vi.fn(),
        isMinimized: false,
        onToggleMinimize: vi.fn(),
    };

    it('renders correctly', () => {
        render(<OverlayHeader {...defaultProps} />);
        expect(screen.getByText('AI Coach')).toBeInTheDocument();
        expect(screen.getByTitle('Minimize')).toBeInTheDocument();
        expect(screen.getByTitle('Overlay position')).toBeInTheDocument();
    });

    it('toggles minimize state', () => {
        render(<OverlayHeader {...defaultProps} />);
        const minimizeBtn = screen.getByTitle('Minimize');
        fireEvent.click(minimizeBtn);
        expect(defaultProps.onToggleMinimize).toHaveBeenCalled();
    });

    it('shows expand button when minimized', () => {
        render(<OverlayHeader {...defaultProps} isMinimized={true} />);
        expect(screen.getByTitle('Expand')).toBeInTheDocument();
    });

    it('prevents drag on buttons', () => {
        const handleParentMouseDown = vi.fn();
        render(
            <div onMouseDown={handleParentMouseDown}>
                <OverlayHeader {...defaultProps} />
            </div>
        );
        const positionBtn = screen.getByTitle('Overlay position');

        fireEvent.mouseDown(positionBtn);

        expect(handleParentMouseDown).not.toHaveBeenCalled();
    });
});

