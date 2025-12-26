/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stripe Test Utilities
 *
 * This file provides utilities for testing Stripe integration without making real API calls.
 * Use these mocks and helpers in unit and integration tests.
 */

/**
 * Stripe Test Card Numbers
 * Official Stripe test cards for different scenarios
 */
export const STRIPE_TEST_CARDS = {
    // Successful payments
    SUCCESS: {
        number: '4242424242424242',
        brand: 'visa',
        description: 'Visa - Succeeds and immediately processes payment',
    },
    SUCCESS_MASTERCARD: {
        number: '5555555555554444',
        brand: 'mastercard',
        description: 'Mastercard - Succeeds',
    },
    SUCCESS_AMEX: {
        number: '378282246310005',
        brand: 'amex',
        description: 'American Express - Succeeds',
    },

    // 3D Secure test cards
    REQUIRES_3DS: {
        number: '4000002500003155',
        brand: 'visa',
        description: '3D Secure required - authentication modal appears',
    },
    REQUIRES_3DS_FAIL: {
        number: '4000008260003178',
        brand: 'visa',
        description: '3D Secure fails authentication',
    },

    // Declined cards
    DECLINED: {
        number: '4000000000000002',
        brand: 'visa',
        description: 'Declined - Generic decline',
    },
    DECLINED_INSUFFICIENT_FUNDS: {
        number: '4000000000009995',
        brand: 'visa',
        description: 'Declined - Insufficient funds',
    },
    DECLINED_LOST_CARD: {
        number: '4000000000009987',
        brand: 'visa',
        description: 'Declined - Lost card',
    },
    DECLINED_STOLEN_CARD: {
        number: '4000000000009979',
        brand: 'visa',
        description: 'Declined - Stolen card',
    },
    DECLINED_EXPIRED: {
        number: '4000000000000069',
        brand: 'visa',
        description: 'Declined - Expired card',
    },
    DECLINED_PROCESSING_ERROR: {
        number: '4000000000000119',
        brand: 'visa',
        description: 'Declined - Processing error',
    },

    // Special scenarios
    ATTACH_FAIL_ON_CHARGE: {
        number: '4000000000000341',
        brand: 'visa',
        description: 'Attaches successfully, fails later on charge',
    },
    DISPUTES_FRAUD: {
        number: '4000000000000259',
        brand: 'visa',
        description: 'Charge succeeds, leads to early fraud warning',
    },
} as const;

/**
 * Default test expiry and CVC values
 */
export const STRIPE_TEST_DEFAULTS = {
    EXP_MONTH: '12',
    EXP_YEAR: '34',
    CVC: '123',
    ZIP: '12345',
};

/**
 * Mock Stripe Checkout Session
 */
export interface MockCheckoutSession {
    id: string;
    client_secret: string;
    customer: string;
    subscription: string;
    payment_status: 'paid' | 'unpaid' | 'no_payment_required';
    status: 'complete' | 'open' | 'expired';
    metadata: {
        supabase_user_id: string;
        plan: 'monthly' | 'yearly';
    };
}

export const createMockCheckoutSession = (overrides: Partial<MockCheckoutSession> = {}): MockCheckoutSession => ({
    id: `cs_test_${Date.now()}`,
    client_secret: `cs_test_secret_${Date.now()}`,
    customer: `cus_test_${Date.now()}`,
    subscription: `sub_test_${Date.now()}`,
    payment_status: 'paid',
    status: 'complete',
    metadata: {
        supabase_user_id: 'user-test-123',
        plan: 'yearly',
    },
    ...overrides,
});

/**
 * Mock Stripe Subscription
 */
export interface MockSubscription {
    id: string;
    customer: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
    current_period_start: number;
    current_period_end: number;
    trial_start: number | null;
    trial_end: number | null;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    plan: {
        id: string;
        amount: number;
        interval: 'month' | 'year';
    };
}

export const createMockSubscription = (overrides: Partial<MockSubscription> = {}): MockSubscription => {
    const now = Math.floor(Date.now() / 1000);
    const monthInSeconds = 30 * 24 * 60 * 60;

    return {
        id: `sub_test_${Date.now()}`,
        customer: `cus_test_${Date.now()}`,
        status: 'active',
        current_period_start: now,
        current_period_end: now + monthInSeconds,
        trial_start: null,
        trial_end: null,
        cancel_at_period_end: false,
        canceled_at: null,
        plan: {
            id: 'price_test_monthly',
            amount: 4900, // $49.00
            interval: 'month',
        },
        ...overrides,
    };
};

/**
 * Mock Stripe Webhook Event
 */
export interface MockWebhookEvent<T = any> {
    id: string;
    type: string;
    created: number;
    data: {
        object: T;
    };
}

export const createMockWebhookEvent = <T>(
    type: string,
    data: T
): MockWebhookEvent<T> => ({
    id: `evt_test_${Date.now()}`,
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object: data },
});

/**
 * Mock Supabase function responses for Stripe operations
 */
export const mockStripeResponses = {
    checkoutSuccess: {
        data: {
            sessionId: 'cs_test_123',
            clientSecret: 'cs_test_secret_123',
            hasTrial: true,
            trialDays: 3,
        },
        error: null,
    },
    checkoutAlreadySubscribed: {
        data: null,
        error: { message: 'User already has an active subscription' },
    },
    checkoutMissingParams: {
        data: null,
        error: { message: 'Missing required parameters' },
    },
    portalSuccess: {
        data: { url: 'https://billing.stripe.com/session/test_123' },
        error: null,
    },
    portalNoSubscription: {
        data: null,
        error: { message: 'No active subscription found' },
    },
    cancelSuccess: {
        data: { success: true },
        error: null,
    },
    cancelFailed: {
        data: null,
        error: { message: 'Failed to cancel subscription' },
    },
};

/**
 * Subscription plan details for testing
 */
export const TEST_PLANS = {
    monthly: {
        id: 'monthly',
        name: 'Monthly',
        price: 49,
        priceInCents: 4900,
        interval: 'month' as const,
        hasTrial: false,
    },
    yearly: {
        id: 'yearly',
        name: 'Yearly',
        price: 15.99,
        priceInCents: 1599,
        priceTotal: 191.88,
        interval: 'year' as const,
        hasTrial: true,
        trialDays: 3,
    },
};

/**
 * Helper to simulate subscription status changes
 */
export const subscriptionStatusFlow = {
    newUserYearly: ['trialing', 'active', 'cancelled'] as const,
    newUserMonthly: ['active', 'cancelled'] as const,
    paymentFailed: ['active', 'past_due', 'active'] as const,
    paymentChurned: ['active', 'past_due', 'cancelled'] as const,
};

/**
 * Vitest mock setup for Stripe modules
 */
export const setupStripeMocks = (vi: typeof import('vitest').vi) => {
    // Mock @stripe/stripe-js
    vi.mock('@stripe/stripe-js', () => ({
        loadStripe: vi.fn(() => Promise.resolve({
            redirectToCheckout: vi.fn(() => Promise.resolve({ error: null })),
            confirmCardPayment: vi.fn(() => Promise.resolve({ error: null, paymentIntent: { status: 'succeeded' } })),
        })),
    }));

    // Mock @stripe/react-stripe-js
    vi.mock('@stripe/react-stripe-js', () => ({
        Elements: ({ children }: any) => children,
        EmbeddedCheckoutProvider: ({ children }: any) => children,
        EmbeddedCheckout: () => null,
        CardElement: () => null,
        useStripe: () => ({ confirmCardPayment: vi.fn() }),
        useElements: () => ({ getElement: vi.fn() }),
    }));
};

/**
 * Helper to fill Stripe test card in E2E tests
 * Note: This works with Stripe's test mode iframe
 */
export const E2E_STRIPE_CARD_FILL = {
    /**
     * Instructions for filling Stripe card element in Playwright
     * Stripe uses iframes, so you need to:
     * 1. Wait for iframe to load
     * 2. Fill within iframe context
     */
    example: `
        // Get the Stripe card iframe
        const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
        
        // Fill card number
        await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
        
        // Fill expiry
        await stripeFrame.locator('[name="exp-date"]').fill('12/34');
        
        // Fill CVC
        await stripeFrame.locator('[name="cvc"]').fill('123');
    `,
};
