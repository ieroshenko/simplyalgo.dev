import { test, expect } from '../../utils/test-fixtures';
import { ProblemHelper, NavigationHelper } from '../../utils/test-helpers';

test.describe('Flashcards', () => {
  let problemHelper: ProblemHelper;
  let navHelper: NavigationHelper;

  test.use({ storageState: { cookies: [], origins: [] } }); // Use authenticated state

  test.beforeEach(async ({ authenticatedPage }) => {
    problemHelper = new ProblemHelper(authenticatedPage);
    navHelper = new NavigationHelper(authenticatedPage);
  });

  test('should add problem to flashcards', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    // Click add to flashcards button
    await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    
    // Should show success message
    await expect(authenticatedPage.locator('[data-testid="flashcard-success"]')).toBeVisible();
    
    // Navigate to flashcards
    await navHelper.navigateToFlashcards();
    
    // Should see the problem in flashcards
    await expect(authenticatedPage.locator('[data-testid="flashcard-deck"]').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Two Sum')).toBeVisible();
  });

  test('should show flashcard deck manager', async ({ authenticatedPage }) => {
    await navHelper.navigateToFlashcards();
    
    // Should show deck manager
    await expect(authenticatedPage.locator('[data-testid="flashcard-deck-manager"]')).toBeVisible();
    
    // Should show deck statistics
    await expect(authenticatedPage.locator('[data-testid="deck-stats"]')).toBeVisible();
    
    // Should show due cards count
    await expect(authenticatedPage.locator('[data-testid="due-cards"]')).toBeVisible();
  });

  test('should start flashcard review session', async ({ authenticatedPage }) => {
    // First add a problem to flashcards
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    
    // Navigate to flashcards and start review
    await navHelper.navigateToFlashcards();
    await authenticatedPage.locator('[data-testid="start-review"]').click();
    
    // Should show review interface
    await expect(authenticatedPage.locator('[data-testid="flashcard-review"]')).toBeVisible();
    
    // Should show problem title
    await expect(authenticatedPage.getByText('Two Sum')).toBeVisible();
    
    // Should show solution initially hidden
    await expect(authenticatedPage.locator('[data-testid="solution-content"]')).not.toBeVisible();
  });

  test('should reveal solution and rate difficulty', async ({ authenticatedPage }) => {
    // Add problem and start review
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    
    await navHelper.navigateToFlashcards();
    await authenticatedPage.locator('[data-testid="start-review"]').click();
    
    // Reveal solution
    await authenticatedPage.locator('[data-testid="reveal-solution"]').click();
    
    // Should show solution
    await expect(authenticatedPage.locator('[data-testid="solution-content"]')).toBeVisible();
    
    // Should show difficulty rating buttons
    await expect(authenticatedPage.locator('[data-testid="difficulty-buttons"]')).toBeVisible();
    
    // Rate difficulty as "Good"
    await authenticatedPage.locator('[data-testid="rate-good"]').click();
    
    // Should move to next card or end session
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should complete review session', async ({ authenticatedPage }) => {
    // Add problem and complete review
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    
    await navHelper.navigateToFlashcards();
    await authenticatedPage.locator('[data-testid="start-review"]').click();
    
    // Reveal and rate
    await authenticatedPage.locator('[data-testid="reveal-solution"]').click();
    await authenticatedPage.locator('[data-testid="rate-good"]').click();
    
    // Should show completion message
    await expect(authenticatedPage.locator('[data-testid="review-complete"]')).toBeVisible();
    
    // Should show session statistics
    await expect(authenticatedPage.locator('[data-testid="session-stats"]')).toBeVisible();
  });

  test('should remove flashcard from deck', async ({ authenticatedPage }) => {
    // Add problem to flashcards
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    
    // Navigate to flashcards and remove
    await navHelper.navigateToFlashcards();
    await authenticatedPage.locator('[data-testid="flashcard-menu"]').first().click();
    await authenticatedPage.locator('[data-testid="remove-flashcard"]').click();
    
    // Confirm removal
    await authenticatedPage.locator('[data-testid="confirm-remove"]').click();
    
    // Should show success message
    await expect(authenticatedPage.locator('[data-testid="remove-success"]')).toBeVisible();
    
    // Problem should no longer be in flashcards
    await expect(authenticatedPage.getByText('Two Sum')).not.toBeVisible();
  });

  test('should show spaced repetition scheduling', async ({ authenticatedPage }) => {
    // Add problem and complete review
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    
    await navHelper.navigateToFlashcards();
    await authenticatedPage.locator('[data-testid="start-review"]').click();
    await authenticatedPage.locator('[data-testid="reveal-solution"]').click();
    await authenticatedPage.locator('[data-testid="rate-easy"]').click(); // Easy rating = longer interval
    
    // Check deck manager for next review date
    await navHelper.navigateToFlashcards();
    
    // Should show next review date
    await expect(authenticatedPage.locator('[data-testid="next-review-date"]')).toBeVisible();
    
    // Should show mastery level
    await expect(authenticatedPage.locator('[data-testid="mastery-level"]')).toBeVisible();
  });

  test('should filter and search flashcards', async ({ authenticatedPage }) => {
    // Add multiple problems
    const problems = ['Two Sum', 'Binary Search', 'Linked List'];
    
    for (const problem of problems) {
      await navHelper.navigateToProblems();
      await problemHelper.selectProblem(problem);
      await authenticatedPage.locator('[data-testid="add-to-flashcards"]').click();
    }
    
    // Navigate to flashcards
    await navHelper.navigateToFlashcards();
    
    // Should show all cards
    await expect(authenticatedPage.locator('[data-testid="flashcard-deck"]')).toHaveCount(3);
    
    // Search for specific problem
    await authenticatedPage.locator('[data-testid="search-flashcards"]').fill('Two Sum');
    
    // Should filter results
    await expect(authenticatedPage.locator('[data-testid="flashcard-deck"]')).toHaveCount(1);
    await expect(authenticatedPage.getByText('Two Sum')).toBeVisible();
  });
});
