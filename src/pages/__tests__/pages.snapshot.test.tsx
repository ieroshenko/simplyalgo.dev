/**
 * Snapshot tests for pages
 * These tests ensure page layout consistency across changes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

// Mock hooks and services that pages depend on
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
    }),
}));

vi.mock('@/hooks/useProblems', () => ({
    useProblems: () => ({
        problems: [],
        loading: false,
        error: null,
    }),
}));

vi.mock('@/hooks/useBehavioralStats', () => ({
    useBehavioralStats: () => ({
        stats: { storiesCount: 0, practiceCount: 0, mockInterviewCount: 0 },
        loading: false,
    }),
}));

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                }),
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
        }),
    },
}));

// Import pages
import NotFound from '@/pages/NotFound';
import Index from '@/pages/Index';

// Wrapper for pages that need router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
);

describe('Pages Snapshot Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('NotFound Page', () => {
        it('should match snapshot', () => {
            const { container } = render(
                <RouterWrapper>
                    <NotFound />
                </RouterWrapper>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Index Page', () => {
        it('should match snapshot', () => {
            const { container } = render(
                <RouterWrapper>
                    <Index />
                </RouterWrapper>
            );
            expect(container).toMatchSnapshot();
        });
    });
});
