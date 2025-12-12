import { test, expect, type Page } from '../../utils/test-fixtures';
import { AuthHelper, NavigationHelper, TEST_USER } from '../../utils/test-helpers';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;
  let navHelper: NavigationHelper;

  test.beforeEach(async ({ page }: { page: Page }) => {
    authHelper = new AuthHelper(page);
    navHelper = new NavigationHelper(page);
  });

  test.describe('Auth Page', () => {
    test('should display OAuth login buttons', async ({ page }) => {
      // Auth page is at root /
      await page.goto('/');

      // Should show Google and GitHub OAuth buttons
      const googleButton = page.getByRole('button', { name: /google/i });
      const githubButton = page.getByRole('button', { name: /github/i });

      await expect(googleButton).toBeVisible();
      await expect(githubButton).toBeVisible();
    });

    test('should display branding and features', async ({ page }) => {
      await page.goto('/');

      // Should show logo and branding
      await expect(page.getByText('simplyalgo')).toBeVisible();
      await expect(page.getByText('Learn DSA with AI guidance')).toBeVisible();

      // Should show feature icons
      await expect(page.getByText('AI Tutoring')).toBeVisible();
      await expect(page.getByText('Progress Tracking')).toBeVisible();
      await expect(page.getByText('Blind 75')).toBeVisible();
    });

    test('should redirect authenticated users away from auth page', async ({ page }) => {
      // First go to the page so we can set localStorage
      await page.goto('/');

      // Inject auth
      await authHelper.mockSignIn();

      // Navigate to auth page (root)
      await page.goto('/');

      // Should be redirected away from auth page (to dashboard or survey)
      await page.waitForURL(/\/(dashboard|survey)/);
      const url = page.url();
      expect(url).toMatch(/\/(dashboard|survey)/);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to auth page (root)', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard');

      // Should redirect to root (auth page)
      await expect(page).toHaveURL('http://localhost:8080/');
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // First go to a page so we can set localStorage
      await page.goto('/');

      // Mock sign in
      await authHelper.mockSignIn();

      // Navigate to dashboard
      await page.goto('/dashboard');

      // Should go to either dashboard or survey (new users go to survey first)
      await page.waitForURL(/\/(dashboard|survey)/);
      const url = page.url();
      expect(url).toMatch(/\/(dashboard|survey)/);
    });

    test('should protect settings page', async ({ page }) => {
      // Try to access settings without authentication
      await page.goto('/settings');

      // Should redirect to root (auth page)
      await expect(page).toHaveURL('http://localhost:8080/');
    });
  });

  test.describe('Sign Out', () => {
    test('should allow user to sign out', async ({ page }) => {
      // Go to page first
      await page.goto('/');

      // Mock sign in
      await authHelper.mockSignIn();

      // Verify authenticated
      expect(await authHelper.isAuthenticated()).toBeTruthy();

      // Sign out
      await authHelper.signOut();

      // Should not be authenticated
      expect(await authHelper.isAuthenticated()).toBeFalsy();
    });

    test('should clear auth tokens on sign out', async ({ page }) => {
      // Go to page first
      await page.goto('/');

      // Mock sign in
      await authHelper.mockSignIn();

      // Get user email before sign out
      const emailBefore = await authHelper.getCurrentUserEmail();
      expect(emailBefore).toBe(TEST_USER.email);

      // Sign out
      await authHelper.signOut();

      // User email should be null
      const emailAfter = await authHelper.getCurrentUserEmail();
      expect(emailAfter).toBeNull();
    });
  });

  test.describe('Auth State Persistence', () => {
    test('should persist auth state across page reloads', async ({ page }) => {
      // Go to page first
      await page.goto('/');

      // Mock sign in
      await authHelper.mockSignIn();

      // Verify authenticated
      expect(await authHelper.isAuthenticated()).toBeTruthy();

      // Reload page
      await page.reload();

      // Should still be authenticated
      expect(await authHelper.isAuthenticated()).toBeTruthy();
    });

    test('should maintain user data after reload', async ({ page }) => {
      // Go to page first
      await page.goto('/');

      // Mock sign in
      await authHelper.mockSignIn();

      // Get user email
      const emailBefore = await authHelper.getCurrentUserEmail();

      // Reload
      await page.reload();

      // Email should be the same
      const emailAfter = await authHelper.getCurrentUserEmail();
      expect(emailAfter).toBe(emailBefore);
    });
  });
});

test.describe('Authentication with Fixtures', () => {
  test('should use authenticatedPage fixture', async ({ authenticatedPage }) => {
    // Navigate to dashboard with pre-authenticated page
    await authenticatedPage.goto('/dashboard');

    // Should go to dashboard or survey (authenticated)
    await authenticatedPage.waitForURL(/\/(dashboard|survey)/);
    const url = authenticatedPage.url();
    expect(url).toMatch(/\/(dashboard|survey)/);
  });
});
