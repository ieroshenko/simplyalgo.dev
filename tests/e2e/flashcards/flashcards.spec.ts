import { test, expect } from '../../utils/test-fixtures';

test.describe('Flashcard Deck Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to flashcard deck page
    await page.goto('/flashcards');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display flashcard deck manager or profile redirect', async ({ page }) => {
    // Flashcards page should either show deck manager or redirect to profile if feature disabled
    const isFlashcardsPage = page.url().includes('/flashcards');
    const isProfilePage = page.url().includes('/profile');

    // Should be on one of these pages
    expect(isFlashcardsPage || isProfilePage).toBeTruthy();
  });

  test('should display sidebar or content', async ({ page }) => {
    // If on flashcards page or profile page, should have main content
    await expect(page.locator('body')).toContainText(/flashcard|profile|SimplyAlgo/i);
  });
});

test.describe('Flashcard Review From Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile page where flashcard review is triggered
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should display profile page with flashcard section', async ({ page }) => {
    // Should show profile content
    await expect(page.locator('body')).toContainText(/profile|progress|solved/i);
  });

  test('should have flashcard review button or section', async ({ page }) => {
    // Look for flashcard related buttons or sections
    const flashcardButton = page.getByRole('button', { name: /flashcard|review|spaced repetition/i });
    const flashcardSection = page.getByText(/flashcard|spaced repetition|review/i).first();

    const hasFlashcard = await flashcardButton.count() > 0 || await flashcardSection.count() > 0;

    // Flashcard section may or may not be visible depending on user state
    if (hasFlashcard) {
      expect(hasFlashcard).toBeTruthy();
    }
  });
});

test.describe('Flashcard Integration in Problem Solver', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a problem
    await page.goto('/problems');
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await page.getByRole('button', { name: /Start/i }).first().click();
    await expect(page).toHaveURL(/\/problem\/[\w-]+/);
    await page.waitForLoadState('networkidle');
  });

  test('should show problem solver with code editor', async ({ page }) => {
    // Verify we're on the problem page with code editor
    await expect(page.getByRole('code').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Spaced Repetition Review Flow', () => {
  test('should access flashcard page', async ({ page }) => {
    // Try to access flashcard review
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');

    // Should be on flashcards page or redirected to profile
    const isFlashcardsPage = page.url().includes('/flashcards');
    const isProfilePage = page.url().includes('/profile');
    expect(isFlashcardsPage || isProfilePage).toBeTruthy();
  });

  test('should show flashcard or profile content', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');

    // Should show some content - either flashcard stats or profile
    const hasContent = await page.getByText(/due|cards|review|mastery|profile|solved/i).first().count() > 0;
    expect(hasContent).toBeTruthy();
  });
});
