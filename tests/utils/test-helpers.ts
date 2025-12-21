import { Page, expect, BrowserContext } from '@playwright/test';
import { injectAuth, clearAuth, AUTH_STORAGE_KEY, TEST_USER } from './test-fixtures';

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Mock sign in by injecting auth tokens into localStorage
   * This simulates a successful OAuth flow without actually going through Google/GitHub
   */
  async mockSignIn(user = TEST_USER) {
    const context = this.page.context();

    // Create mock session
    const now = Math.floor(Date.now() / 1000);
    const session = {
      access_token: 'mock-access-token-for-testing',
      refresh_token: 'mock-refresh-token-for-testing',
      expires_in: 3600,
      expires_at: now + 3600,
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
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: { email: user.email, name: user.name, full_name: user.name },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Inject into current page's localStorage
    await this.page.evaluate(({ storageKey, sessionData }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(sessionData));
    }, { storageKey: AUTH_STORAGE_KEY, sessionData: session });

    // Reload to pick up the auth state
    await this.page.reload();
  }

  /**
   * Sign out by clearing auth tokens from localStorage
   */
  async signOut() {
    await clearAuth(this.page);
    await this.page.reload();
    // Wait for redirect to auth page (root /)
    await this.page.waitForURL(/^http:\/\/localhost:\d+\/$/);
  }

  /**
   * Check if user is authenticated by checking localStorage
   */
  async isAuthenticated(): Promise<boolean> {
    const hasToken = await this.page.evaluate(({ storageKey }) => {
      const token = window.localStorage.getItem(storageKey);
      if (!token) return false;
      try {
        const parsed = JSON.parse(token);
        return !!parsed.access_token && !!parsed.user;
      } catch {
        return false;
      }
    }, { storageKey: AUTH_STORAGE_KEY });

    return hasToken;
  }

  /**
   * Navigate to auth page
   */
  async goToAuthPage() {
    await this.page.goto('/auth');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if OAuth buttons are visible on auth page
   */
  async areOAuthButtonsVisible(): Promise<boolean> {
    const googleButton = this.page.getByRole('button', { name: /google/i });
    const githubButton = this.page.getByRole('button', { name: /github/i });

    const googleVisible = await googleButton.isVisible().catch(() => false);
    const githubVisible = await githubButton.isVisible().catch(() => false);

    return googleVisible && githubVisible;
  }

  /**
   * Get current user email from localStorage
   */
  async getCurrentUserEmail(): Promise<string | null> {
    return this.page.evaluate(({ storageKey }) => {
      const token = window.localStorage.getItem(storageKey);
      if (!token) return null;
      try {
        const parsed = JSON.parse(token);
        return parsed.user?.email || null;
      } catch {
        return null;
      }
    }, { storageKey: AUTH_STORAGE_KEY });
  }
}

export class NavigationHelper {
  constructor(private page: Page) {}

  async navigateToSurvey(step?: number) {
    const stepNumber = step || 1;
    await this.page.goto(`/survey/${stepNumber}`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToProblems() {
    await this.page.goto('/problems');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToDashboard() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToFlashcards() {
    await this.page.goto('/flashcards');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToSettings() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentPath(): Promise<string> {
    const url = new URL(this.page.url());
    return url.pathname;
  }
}

export class SurveyHelper {
  constructor(private page: Page) {}

  async getCurrentStep() {
    const stepElement = this.page.locator('[data-testid="current-step"]');
    return await stepElement.textContent();
  }

  async selectOption(optionText: string) {
    await this.page.getByText(optionText).click();
  }

  async nextStep() {
    await this.page.getByRole('button', { name: /next|continue/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async previousStep() {
    await this.page.getByRole('button', { name: /previous|back/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async isStepComplete(stepNumber: number) {
    const stepIndicator = this.page.locator(`[data-testid="step-${stepNumber}"]`);
    const classList = await stepIndicator.getAttribute('class') || '';
    return classList.includes('completed');
  }
}

export class ProblemHelper {
  constructor(private page: Page) {}

  async selectProblem(problemTitle: string) {
    await this.page.getByText(problemTitle).click();
    await this.page.waitForLoadState('networkidle');
  }

  async writeCode(code: string) {
    const editor = this.page.locator('.monaco-editor').first();
    await editor.click();
    await this.page.keyboard.type(code);
  }

  async runCode() {
    await this.page.getByRole('button', { name: /run|execute/i }).click();
    await this.page.waitForSelector('[data-testid="test-results"]', { timeout: 10000 });
  }

  async getTestResults() {
    const resultsElement = this.page.locator('[data-testid="test-results"]');
    return await resultsElement.textContent();
  }

  async isCodeCorrect() {
    const results = await this.getTestResults();
    return results?.includes('All tests passed') || false;
  }
}

export class ChatHelper {
  constructor(private page: Page) {}

  async openChat() {
    await this.page.getByRole('button', { name: /chat|ai/i }).click();
    await this.page.waitForSelector('[data-testid="chat-input"]');
  }

  async sendMessage(message: string) {
    const input = this.page.locator('[data-testid="chat-input"]');
    await input.fill(message);
    await this.page.keyboard.press('Enter');
    await this.page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
  }

  async getLastAIMessage() {
    const aiResponse = this.page.locator('[data-testid="ai-response"]').last();
    return await aiResponse.textContent();
  }

  async isChatOpen() {
    return await this.page.locator('[data-testid="chat-input"]').isVisible();
  }
}

// Re-export TEST_USER for convenience
export { TEST_USER };
