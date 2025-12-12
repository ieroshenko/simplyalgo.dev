import { test, expect, type Page } from '../../utils/test-fixtures';
import { ProblemHelper, NavigationHelper } from '../../utils/test-helpers';

test.describe('Problem Solving', () => {
  let problemHelper: ProblemHelper;
  let navHelper: NavigationHelper;

  test.use({ storageState: { cookies: [], origins: [] } }); // Use authenticated state

  test.beforeEach(async ({ authenticatedPage }: { authenticatedPage: Page }) => {
    problemHelper = new ProblemHelper(authenticatedPage);
    navHelper = new NavigationHelper(authenticatedPage);
  });

  test('should display problems list', async ({ authenticatedPage }: { authenticatedPage: Page }) => {
    await navHelper.navigateToProblems();
    
    // Should show problems grid
    await expect(authenticatedPage.locator('[data-testid="problems-grid"]')).toBeVisible();
    
    // Should show problem cards
    await expect(authenticatedPage.locator('[data-testid="problem-card"]').first()).toBeVisible();
  });

  test('should select and open problem', async ({ authenticatedPage }: { authenticatedPage: Page }) => {
    await navHelper.navigateToProblems();
    
    // Select first problem
    await problemHelper.selectProblem('Two Sum');
    
    // Should show problem description
    await expect(authenticatedPage.locator('[data-testid="problem-description"]')).toBeVisible();
    
    // Should show code editor
    await expect(authenticatedPage.locator('.monaco-editor')).toBeVisible();
    
    // Should show test cases
    await expect(authenticatedPage.locator('[data-testid="test-cases"]')).toBeVisible();
  });

  test('should allow writing code', async ({ authenticatedPage }: { authenticatedPage: Page }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    // Write a simple solution
    const solution = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;
    
    await problemHelper.writeCode(solution);
    
    // Code should appear in editor
    const editorContent = await authenticatedPage.locator('.monaco-editor').first().textContent();
    expect(editorContent).toContain('function twoSum');
  });

  test('should run code and show results', async ({ authenticatedPage }: { authenticatedPage: Page }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    // Write working solution
    const solution = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;
    
    await problemHelper.writeCode(solution);
    await problemHelper.runCode();
    
    // Should show test results
    await expect(authenticatedPage.locator('[data-testid="test-results"]')).toBeVisible();
    
    // Should show success message
    expect(await problemHelper.isCodeCorrect()).toBeTruthy();
  });

  test('should show test failures for incorrect code', async ({ authenticatedPage }: { authenticatedPage: Page }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    // Write incorrect solution
    const incorrectSolution = `function twoSum(nums, target) {
  return [0, 1]; // Always return first two indices
}`;
    
    await problemHelper.writeCode(incorrectSolution);
    await problemHelper.runCode();
    
    // Should show test results
    await expect(authenticatedPage.locator('[data-testid="test-results"]')).toBeVisible();
    
    // Should show failure message
    expect(await problemHelper.isCodeCorrect()).toBeFalsy();
  });
});
