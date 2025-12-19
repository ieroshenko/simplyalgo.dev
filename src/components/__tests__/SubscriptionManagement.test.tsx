/**
 * Unit tests for SubscriptionManagement component
 * Tests subscription display and Stripe portal integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock hooks
const mockUseSubscription = vi.fn();
vi.mock('@/hooks/useSubscription', () => ({
    useSubscription: () => mockUseSubscription(),
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => mockUseAuth(),
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

// Mock Supabase
let mockInvokeResponse: any = { data: null, error: null };

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        functions: {
            invoke: vi.fn(() => Promise.resolve(mockInvokeResponse)),
        },
    },
}));

import { SubscriptionManagement } from '@/components/SubscriptionManagement';

describe('SubscriptionManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInvokeResponse = { data: null, error: null };

        // Default mock values
        mockUseAuth.mockReturnValue({
            user: { id: 'user-123', email: 'test@example.com' },
        });

        mockUseSubscription.mockReturnValue({
            subscription: null,
            hasActiveSubscription: false,
            isLoading: false,
        });
    });

    describe('Loading State', () => {
        it('should show loading spinner when subscription is loading', () => {
            mockUseSubscription.mockReturnValue({
                subscription: null,
                hasActiveSubscription: false,
                isLoading: true,
            });

            render(<SubscriptionManagement />);

            // Should show subscription title
            expect(screen.getByText('Subscription')).toBeInTheDocument();
            // Should have a spinner (animated element)
            const spinner = document.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('No Subscription State', () => {
        it('should show no subscription message when user has no subscription', () => {
            mockUseSubscription.mockReturnValue({
                subscription: null,
                hasActiveSubscription: false,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByText(/don't have an active subscription/i)).toBeInTheDocument();
        });

        it('should show upgrade button when no subscription', () => {
            mockUseSubscription.mockReturnValue({
                subscription: null,
                hasActiveSubscription: false,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByText(/Upgrade to Premium/i)).toBeInTheDocument();
        });
    });

    describe('Active Subscription Display', () => {
        const activeSubscription = {
            id: 'sub-123',
            user_id: 'user-123',
            stripe_customer_id: 'cus_123',
            stripe_subscription_id: 'sub_123',
            plan: 'yearly',
            status: 'active',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
        };

        it('should display subscription status when active', () => {
            mockUseSubscription.mockReturnValue({
                subscription: activeSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByText(/active/i)).toBeInTheDocument();
        });

        it('should display plan type', () => {
            mockUseSubscription.mockReturnValue({
                subscription: activeSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByText(/yearly/i)).toBeInTheDocument();
        });

        it('should show manage billing button', () => {
            mockUseSubscription.mockReturnValue({
                subscription: activeSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByRole('button', { name: /Manage Billing/i })).toBeInTheDocument();
        });

        it('should display current plan section', () => {
            mockUseSubscription.mockReturnValue({
                subscription: activeSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByText(/Current Plan/i)).toBeInTheDocument();
        });
    });

    describe('Trialing Subscription Display', () => {
        const trialingSubscription = {
            id: 'sub-456',
            user_id: 'user-123',
            stripe_customer_id: 'cus_456',
            stripe_subscription_id: 'sub_456',
            plan: 'yearly',
            status: 'trialing',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
        };

        it('should show trialing status badge', () => {
            mockUseSubscription.mockReturnValue({
                subscription: trialingSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            expect(screen.getByText(/trialing/i)).toBeInTheDocument();
        });
    });

    describe('Manage Subscription', () => {
        const activeSubscription = {
            id: 'sub-123',
            user_id: 'user-123',
            stripe_customer_id: 'cus_123',
            stripe_subscription_id: 'sub_123',
            plan: 'yearly',
            status: 'active',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
        };

        it('should call stripe-customer-portal when manage clicked', async () => {
            const { supabase } = await import('@/integrations/supabase/client');
            mockInvokeResponse = {
                data: { url: 'https://billing.stripe.com/session/test' },
                error: null
            };

            mockUseSubscription.mockReturnValue({
                subscription: activeSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            const manageButton = screen.getByRole('button', { name: /Manage Billing/i });
            fireEvent.click(manageButton);

            await waitFor(() => {
                expect(supabase.functions.invoke).toHaveBeenCalledWith('stripe-customer-portal', expect.anything());
            });
        });

        it('should show error on portal creation failure', async () => {
            mockInvokeResponse = {
                data: null,
                error: { message: 'Failed to create portal session' }
            };

            mockUseSubscription.mockReturnValue({
                subscription: activeSubscription,
                hasActiveSubscription: true,
                isLoading: false,
            });

            render(<SubscriptionManagement />);

            const manageButton = screen.getByRole('button', { name: /Manage Billing/i });
            fireEvent.click(manageButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to open subscription management/i)).toBeInTheDocument();
            });
        });
    });
});

describe('Subscription Status Mapping', () => {
    /**
     * Documents how Stripe statuses map to our UI display
     */
    const statusMappings = {
        'active': { display: 'Active', color: 'green', hasAccess: true },
        'trialing': { display: 'Active', color: 'blue', hasAccess: true },
        'past_due': { display: 'Past Due', color: 'yellow', hasAccess: true }, // Still has access briefly
        'canceled': { display: 'Cancelled', color: 'red', hasAccess: false },
        'incomplete': { display: 'Incomplete', color: 'gray', hasAccess: false },
        'incomplete_expired': { display: 'Expired', color: 'gray', hasAccess: false },
        'unpaid': { display: 'Unpaid', color: 'red', hasAccess: false },
    };

    it('should map statuses correctly for access decisions', () => {
        const activeStatuses = ['active', 'trialing'];

        Object.entries(statusMappings).forEach(([status, config]) => {
            const hasAccess = activeStatuses.includes(status) || status === 'past_due';
            expect(config.hasAccess).toBe(hasAccess);
        });
    });
});
