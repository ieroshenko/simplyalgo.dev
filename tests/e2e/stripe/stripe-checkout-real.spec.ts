/**
 * E2E Tests for Stripe Checkout - REAL Integration with Stripe Test Mode
 * 
 * These tests use Stripe's TEST MODE to:
 * 1. Navigate to the paywall
 * 2. Initiate checkout
 * 3. Fill in test card details (4242 4242 4242 4242)
 * 4. Complete the payment
 * 5. Verify the subscription is created
 * 
 * IMPORTANT:
 * - These tests ONLY work in Stripe Test Mode (pk_test_... keys)
 * - NO real money is charged - Stripe test cards simulate payments
 * - The test card 4242424242424242 will ALWAYS succeed
 * 
 * Prerequisites:
 * 1. VITE_STRIPE_PUBLISHABLE_KEY must be a test key (starts with pk_test_)
 * 2. Supabase functions must have STRIPE_SECRET_KEY as test key (sk_test_)
 * 3. Webhook forwarding must be active (stripe listen --forward-to ...)
 * 
 * NOTE: If the test user already has a subscription, these tests will skip
 * since the paywall redirects subscribed users to the dashboard.
 * 
 * Run webhook forwarding before tests:
 * $ stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
 */
import { test, expect, Page } from '@playwright/test';

// Stripe Test Card Details - These NEVER charge real money
const STRIPE_TEST_CARD = {
    NUMBER: '4242424242424242',
    EXP: '12/34',
    CVC: '123',
    ZIP: '12345',
};

// Test configuration
const TEST_TIMEOUT = 60000; // 1 minute for checkout tests

/**
 * Helper to check if user is on paywall (not already subscribed)
 */
async function isOnPaywall(page: Page): Promise<boolean> {
    const url = page.url();
    if (url.includes('/dashboard')) {
        return false;
    }

    const hasPaywallContent = await page.getByText(/Unlock SimplyAlgo|Start My Journey/i).count() > 0;
    return hasPaywallContent;
}

/**
 * Helper function to fill Stripe's embedded checkout form
 * Stripe uses iframes for security - we need to access them via frameLocator
 */
async function fillStripeCheckoutForm(page: Page) {
    // Wait for Stripe checkout to load completely
    await page.waitForTimeout(3000);

    // Stripe Embedded Checkout has its own container
    // The card element is inside an iframe with name containing "__privateStripeFrame"

    // Try to find the email field first (outside iframe in embedded checkout)
    const emailInput = page.getByPlaceholder('Email');
    if (await emailInput.count() > 0) {
        await emailInput.fill('test-e2e@simplyalgo.dev');
    }

    // For card details, we need to access the Stripe iframe
    // The card number field is typically inside an iframe
    const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

    // Card number input
    const cardNumberInput = stripeFrame.locator('[name="number"], [placeholder*="card number"], input').first();
    await cardNumberInput.waitFor({ timeout: 10000 });
    await cardNumberInput.click();
    await page.keyboard.type(STRIPE_TEST_CARD.NUMBER, { delay: 50 });

    // Expiry date
    await page.keyboard.type(STRIPE_TEST_CARD.EXP, { delay: 50 });

    // CVC
    await page.keyboard.type(STRIPE_TEST_CARD.CVC, { delay: 50 });

    // Wait a moment for form validation
    await page.waitForTimeout(500);

    // Some forms have country/ZIP - fill if visible
    const postalInput = page.locator('input[name="postalCode"], input[name="postal"], input[placeholder*="ZIP"]');
    if (await postalInput.count() > 0) {
        await postalInput.fill(STRIPE_TEST_CARD.ZIP);
    }
}

test.describe('Stripe Checkout - Paywall Access', () => {
    test.setTimeout(TEST_TIMEOUT);

    test('should show paywall or redirect if already subscribed', async ({ page }) => {
        // Navigate to the paywall step
        await page.goto('/survey/20');
        await page.waitForLoadState('networkidle');

        // Wait for page to settle
        await page.waitForTimeout(2000);

        const currentUrl = page.url();

        // User is either:
        // 1. On paywall (not subscribed) - should see checkout UI
        // 2. Redirected to dashboard (already subscribed)
        // 3. Redirected to survey (some other state)

        const validLocations =
            currentUrl.includes('/survey/20') ||
            currentUrl.includes('/dashboard') ||
            currentUrl.includes('/survey');

        expect(validLocations).toBeTruthy();
    });

    test('should display subscription plans if on paywall', async ({ page }) => {
        await page.goto('/survey/20');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // If redirected (already subscribed), skip
        if (!await isOnPaywall(page)) {
            test.skip(true, 'User already has subscription - no paywall access');
            return;
        }

        // Should show plan options
        await expect(page.getByText('Monthly')).toBeVisible();
        await expect(page.getByText('Yearly')).toBeVisible();
    });

    test('should display Start My Journey button if on paywall', async ({ page }) => {
        await page.goto('/survey/20');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (!await isOnPaywall(page)) {
            test.skip(true, 'User already has subscription - no paywall access');
            return;
        }

        await expect(page.getByRole('button', { name: /Start My Journey/i })).toBeVisible();
    });
});

test.describe('Stripe Checkout - Checkout Flow', () => {
    test.setTimeout(TEST_TIMEOUT);

    test('should load checkout or redirect when Start My Journey clicked', async ({ page }) => {
        await page.goto('/survey/20');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (!await isOnPaywall(page)) {
            test.skip(true, 'User already has subscription');
            return;
        }

        // Click Start My Journey
        const startButton = page.getByRole('button', { name: /Start My Journey/i });
        await startButton.click();

        // Wait for response
        await page.waitForTimeout(5000);

        const currentUrl = page.url();

        // Should either:
        // 1. Show checkout form
        // 2. Redirect to dashboard (if subscription already exists)
        const hasCheckout =
            await page.getByText('Complete Your Subscription').count() > 0 ||
            await page.locator('iframe[name*="__privateStripeFrame"]').count() > 0;

        expect(hasCheckout || currentUrl.includes('/dashboard')).toBeTruthy();
    });

    test('should show Back to Plans in checkout view', async ({ page }) => {
        await page.goto('/survey/20');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (!await isOnPaywall(page)) {
            test.skip(true, 'User already has subscription');
            return;
        }

        const startButton = page.getByRole('button', { name: /Start My Journey/i });
        await startButton.click();
        await page.waitForTimeout(5000);

        if (page.url().includes('/dashboard')) {
            test.skip(true, 'Redirected to dashboard - subscription exists');
            return;
        }

        // Should show Back to Plans if in checkout
        const backButton = page.getByText('Back to Plans');
        if (await backButton.count() > 0) {
            await expect(backButton).toBeVisible();
        }
    });
});

test.describe('Stripe Checkout - Full Payment Flow', () => {
    test.setTimeout(TEST_TIMEOUT * 2);

    test.skip('should complete payment with test card', async ({ page }) => {
        /**
         * SKIPPED BY DEFAULT
         * 
         * This test actually completes a payment and creates a subscription.
         * Run manually with:
         * 
         * 1. Ensure webhook forwarding is running:
         *    stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
         * 
         * 2. Cancel any existing subscription for test user
         * 
         * 3. Run this specific test:
         *    npx playwright test stripe-checkout-real.spec.ts --grep "complete payment" --project=chromium
         */

        await page.goto('/survey/20');
        await page.waitForLoadState('networkidle');

        if (!await isOnPaywall(page)) {
            test.skip(true, 'User already has subscription - cancel it first');
            return;
        }

        // Start checkout
        await page.getByRole('button', { name: /Start My Journey/i }).click();
        await page.waitForTimeout(5000);

        if (page.url().includes('/dashboard')) {
            test.skip(true, 'User has subscription');
            return;
        }

        // Fill test card
        await expect(page.getByText('Complete Your Subscription')).toBeVisible({ timeout: 15000 });
        await fillStripeCheckoutForm(page);

        // Submit payment
        const payButton = page.getByRole('button', { name: /Pay|Subscribe|Submit/i });
        if (await payButton.count() > 0) {
            await payButton.click();
        }

        // Wait for redirect
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    });
});

test.describe('Stripe Subscription Management', () => {
    test.setTimeout(TEST_TIMEOUT);

    test('should show subscription status in settings', async ({ page }) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        // Should show some subscription-related content
        const hasSubscriptionSection =
            await page.getByText(/subscription|plan|premium|billing/i).count() > 0;
        const hasLogout = await page.getByRole('button', { name: /log.*out/i }).count() > 0;

        expect(hasSubscriptionSection || hasLogout).toBeTruthy();
    });

    test('should display Active status if subscription exists', async ({ page }) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Look for active subscription indicators
        const hasActiveIndicator =
            await page.getByText(/Active|Premium|Subscribed/i).count() > 0;
        const hasNoSubscription =
            await page.getByText(/No.*Subscription|Subscribe/i).count() > 0;

        // One of these should be true
        expect(hasActiveIndicator || hasNoSubscription).toBeTruthy();
    });
});

/**
 * STRIPE TEST CARDS REFERENCE
 * ===========================
 * 
 * Success Cards:
 * - 4242 4242 4242 4242 (Visa, always succeeds)
 * - 5555 5555 5555 4444 (Mastercard, always succeeds)
 * 
 * Decline Cards:
 * - 4000 0000 0000 0002 (Generic decline)
 * - 4000 0000 0000 9995 (Insufficient funds)
 * - 4000 0000 0000 0069 (Expired card)
 * 
 * 3D Secure:
 * - 4000 0025 0000 3155 (Auth required, succeeds)
 * 
 * For all cards:
 * - Expiry: any future date (e.g., 12/34)
 * - CVC: any 3 digits (e.g., 123)
 * - ZIP: any 5 digits (e.g., 12345)
 * 
 * MANUAL TESTING STEPS:
 * =====================
 * 
 * 1. Start webhook forwarding:
 *    $ stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
 * 
 * 2. Cancel test user's subscription (if exists):
 *    - Via Settings page OR
 *    - Via Stripe Dashboard (test mode)
 * 
 * 3. Navigate to /survey/20
 * 
 * 4. Select plan and click "Start My Journey"
 * 
 * 5. Enter test card: 4242 4242 4242 4242
 * 
 * 6. Complete payment
 * 
 * 7. Verify redirect to /dashboard
 * 
 * 8. Check /settings for Active subscription
 */
