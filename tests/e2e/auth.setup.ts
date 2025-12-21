import { test as setup, expect } from '@playwright/test';

const authFile = './tests/playwright/.auth/user.json';

// Test user credentials (created in Supabase Dashboard)
const TEST_USER_EMAIL = 'test-e2e@simplyalgo.dev';
const TEST_USER_PASSWORD = 'TestPassword123!';

/**
 * This setup script authenticates with the test user via the Supabase API
 * and saves the auth state for reuse across all tests.
 */
setup('authenticate with test user', async ({ page }) => {
    console.log('🔐 Starting authentication with test user...');

    // Navigate to your app first to set up the origin
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('domcontentloaded');

    console.log('📧 Signing in via Supabase API...');

    // Use Supabase client in the browser to sign in
    const loginResult = await page.evaluate(async ({ email, password }) => {
        // Wait a bit for Supabase client to be available
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the Supabase URL and anon key from the page
        const SUPABASE_URL = 'https://fmdhrylburlniimoaokq.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZGhyeWxidXJsbmlpbW9hb2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NzAwMDQsImV4cCI6MjA2OTA0NjAwNH0.oMdyCL05_NAFRlpiiUDCB4fW6vgA6hkMOKtvpp075pw';

        try {
            // Call Supabase Auth API directly
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error_description || data.message || 'Login failed' };
            }

            // Store the session in localStorage (same format Supabase client uses)
            const storageKey = 'sb-fmdhrylburlniimoaokq-auth-token';
            const session = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
                token_type: data.token_type,
                user: data.user,
            };

            window.localStorage.setItem(storageKey, JSON.stringify(session));

            return { success: true, userId: data.user?.id, email: data.user?.email };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }, { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD });

    if (!loginResult.success) {
        console.error('❌ Login failed:', loginResult.error);
        throw new Error(`Authentication failed: ${loginResult.error}`);
    }

    console.log('✅ Login successful!');
    console.log('   User ID:', loginResult.userId);
    console.log('   Email:', loginResult.email);

    // Navigate directly to dashboard (auth is already in localStorage)
    await page.goto('http://localhost:8080/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('✅ Navigated to:', page.url());

    // Verify we're on dashboard or a protected page (not redirected to auth)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/problems') || currentUrl.includes('/survey')) {
        console.log('✅ Successfully authenticated and on protected page');
    } else {
        console.log('⚠️ May have been redirected to:', currentUrl);
    }

    // Save signed-in state to file
    await page.context().storageState({ path: authFile });

    console.log('💾 Auth state saved to:', authFile);
    console.log('✅ Setup complete! You can now run tests with --project=chromium');
});
