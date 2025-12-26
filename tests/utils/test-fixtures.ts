import { test as base, type Page, type BrowserContext } from '@playwright/test';

// Supabase project ref from the URL
const SUPABASE_PROJECT_REF = 'fmdhrylburlniimoaokq';
const AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

// Mock user data
export const TEST_USER = {
  id: 'test-user-id-12345',
  email: 'test@example.com',
  name: 'Test User',
};

// Create mock auth session that mimics Supabase's stored session
function createMockAuthSession(user = TEST_USER) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour from now

  return {
    access_token: 'mock-access-token-for-testing',
    refresh_token: 'mock-refresh-token-for-testing',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
      user_metadata: {
        email: user.email,
        name: user.name,
        full_name: user.name,
        avatar_url: '',
      },
      identities: [
        {
          id: user.id,
          user_id: user.id,
          identity_data: {
            email: user.email,
            sub: user.id,
          },
          provider: 'google',
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

// Define custom fixtures
export interface TestFixtures {
  authenticatedPage: Page;
  authContext: BrowserContext;
}

// Helper to inject auth into a page context
export async function injectAuth(context: BrowserContext, user = TEST_USER) {
  const session = createMockAuthSession(user);

  await context.addInitScript(({ storageKey, sessionData }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(sessionData));
  }, { storageKey: AUTH_STORAGE_KEY, sessionData: session });
}

// Helper to clear auth from a page
export async function clearAuth(page: Page) {
  await page.evaluate(({ storageKey }) => {
    window.localStorage.removeItem(storageKey);
  }, { storageKey: AUTH_STORAGE_KEY });
}

// Extend base test with custom fixtures
export const test = base.extend<TestFixtures>({
  // Provides a page that's already authenticated
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await injectAuth(context);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Provides an authenticated browser context
  authContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await injectAuth(context);
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
export type { Page, BrowserContext } from '@playwright/test';
export { AUTH_STORAGE_KEY, createMockAuthSession };
