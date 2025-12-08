import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock data
const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
};

const mockAdminUser = {
    id: 'admin-user-id',
    email: 'tazigrigolia@gmail.com',
};

const mockCategories = [
    { name: 'Arrays', solved: 5, total: 10 },
    { name: 'Strings', solved: 3, total: 8 },
    { name: 'Trees', solved: 0, total: 5 },
];

const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: mockUser,
        signOut: vi.fn(),
    })),
}));

// Mock useProblems
vi.mock('@/hooks/useProblems', () => ({
    useProblems: () => ({
        categories: mockCategories,
    }),
}));

// Mock FeedbackModal
vi.mock('@/components/FeedbackModal', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="feedback-modal-trigger">{children}</div>
    ),
}));

import Sidebar from '../Sidebar';
import { useAuth } from '@/hooks/useAuth';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const renderWithRouter = (component: React.ReactElement, initialPath = '/dashboard') => {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            {component}
        </MemoryRouter>
    );
};

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: mockUser,
            signOut: vi.fn(),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the logo', () => {
            renderWithRouter(<Sidebar />);

            expect(screen.getByAltText('SimplyAlgo Logo')).toBeInTheDocument();
        });

        it('should render the app name', () => {
            renderWithRouter(<Sidebar />);

            expect(screen.getByText('SimplyAlgo.dev')).toBeInTheDocument();
        });

        it('should render Dashboard navigation item', () => {
            renderWithRouter(<Sidebar />);

            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });

        it('should render Settings navigation item', () => {
            renderWithRouter(<Sidebar />);

            expect(screen.getByText('Settings')).toBeInTheDocument();
        });

        it('should render Leave Feedback button', () => {
            renderWithRouter(<Sidebar />);

            expect(screen.getByText('Leave Feedback')).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should navigate to dashboard when Dashboard clicked', async () => {
            renderWithRouter(<Sidebar />);

            const dashboardButton = screen.getByText('Dashboard');
            await userEvent.click(dashboardButton);

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });

        it('should navigate to settings when Settings clicked', async () => {
            renderWithRouter(<Sidebar />);

            const settingsButton = screen.getByText('Settings');
            await userEvent.click(settingsButton);

            expect(mockNavigate).toHaveBeenCalledWith('/settings');
        });
    });

    describe('Admin Button', () => {
        it('should not show Admin button for regular users', () => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                signOut: vi.fn(),
            });

            renderWithRouter(<Sidebar />);

            expect(screen.queryByText('Admin')).not.toBeInTheDocument();
        });

        it('should show Admin button for admin users', () => {
            mockUseAuth.mockReturnValue({
                user: mockAdminUser,
                signOut: vi.fn(),
            });

            renderWithRouter(<Sidebar />);

            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        it('should navigate to admin when Admin clicked by admin user', async () => {
            mockUseAuth.mockReturnValue({
                user: mockAdminUser,
                signOut: vi.fn(),
            });

            renderWithRouter(<Sidebar />);

            const adminButton = screen.getByText('Admin');
            await userEvent.click(adminButton);

            expect(mockNavigate).toHaveBeenCalledWith('/admin');
        });
    });

    describe('Category Progress', () => {
        it('should show category progress on /problems page', () => {
            renderWithRouter(<Sidebar />, '/problems');

            expect(screen.getByText('Category Progress')).toBeInTheDocument();
        });

        it('should show category progress on /arena page', () => {
            renderWithRouter(<Sidebar />, '/arena');

            expect(screen.getByText('Category Progress')).toBeInTheDocument();
        });

        it('should not show category progress on /dashboard page', () => {
            renderWithRouter(<Sidebar />, '/dashboard');

            expect(screen.queryByText('Category Progress')).not.toBeInTheDocument();
        });

        it('should show category names on problems page', () => {
            renderWithRouter(<Sidebar />, '/problems');

            expect(screen.getByText('Arrays')).toBeInTheDocument();
            expect(screen.getByText('Strings')).toBeInTheDocument();
            expect(screen.getByText('Trees')).toBeInTheDocument();
        });

        it('should show solved/total counts', () => {
            renderWithRouter(<Sidebar />, '/problems');

            expect(screen.getByText('5/10')).toBeInTheDocument();
            expect(screen.getByText('3/8')).toBeInTheDocument();
            expect(screen.getByText('0/5')).toBeInTheDocument();
        });
    });

    describe('Active State', () => {
        it('should highlight Dashboard when on dashboard path', () => {
            renderWithRouter(<Sidebar />, '/dashboard');

            const dashboardButton = screen.getByText('Dashboard').closest('button');
            expect(dashboardButton).toHaveClass('bg-primary');
        });

        it('should highlight Settings when on settings path', () => {
            renderWithRouter(<Sidebar />, '/settings');

            const settingsButton = screen.getByText('Settings').closest('button');
            expect(settingsButton).toHaveClass('bg-primary');
        });
    });

    describe('Feedback Modal', () => {
        it('should render feedback modal trigger', () => {
            renderWithRouter(<Sidebar />);

            expect(screen.getByTestId('feedback-modal-trigger')).toBeInTheDocument();
        });
    });

    describe('Without User', () => {
        it('should handle null user gracefully', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                signOut: vi.fn(),
            });

            renderWithRouter(<Sidebar />);

            // Should still render navigation
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.queryByText('Admin')).not.toBeInTheDocument();
        });
    });
});
