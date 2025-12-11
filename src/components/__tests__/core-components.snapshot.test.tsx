/**
 * Snapshot tests for core components
 * These tests ensure UI consistency across changes
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Import components (only those that work well in isolation)
import LoadingSpinner from '@/components/LoadingSpinner';
import Timer from '@/components/Timer';
import BehavioralHeader from '@/components/BehavioralHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import MissionStrip from '@/components/MissionStrip';
import ShortcutsHelp from '@/components/ShortcutsHelp';

// Wrapper for components that need router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
);

describe('Core Components Snapshot Tests', () => {
    describe('LoadingSpinner', () => {
        it('should match snapshot - default', () => {
            const { container } = render(<LoadingSpinner />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - with message', () => {
            const { container } = render(<LoadingSpinner message="Loading data..." />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - fullScreen', () => {
            const { container } = render(<LoadingSpinner fullScreen />);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Timer', () => {
        it('should match snapshot - default state', () => {
            const { container } = render(
                <Timer
                    isRunning={false}
                    onStart={() => { }}
                    onPause={() => { }}
                    onReset={() => { }}
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - running state', () => {
            const { container } = render(
                <Timer
                    isRunning={true}
                    onStart={() => { }}
                    onPause={() => { }}
                    onReset={() => { }}
                />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('BehavioralHeader', () => {
        it('should match snapshot', () => {
            const { container } = render(
                <RouterWrapper>
                    <BehavioralHeader />
                </RouterWrapper>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('ShortcutsHelp', () => {
        it('should match snapshot', () => {
            const { container } = render(
                <RouterWrapper>
                    <ShortcutsHelp />
                </RouterWrapper>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('ConfirmDialog', () => {
        it('should match snapshot - closed', () => {
            const { container } = render(
                <ConfirmDialog
                    open={false}
                    onOpenChange={() => { }}
                    title="Confirm Action"
                    description="Are you sure you want to proceed?"
                    onConfirm={() => { }}
                />
            );
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - open', () => {
            const { container } = render(
                <ConfirmDialog
                    open={true}
                    onOpenChange={() => { }}
                    title="Delete Item"
                    description="This action cannot be undone."
                    onConfirm={() => { }}
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('MissionStrip', () => {
        it('should match snapshot', () => {
            const { container } = render(<MissionStrip />);
            expect(container).toMatchSnapshot();
        });
    });
});
