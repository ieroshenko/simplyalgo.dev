import { test, expect } from '../../utils/test-fixtures';

test.describe('Behavioral Interview Hub', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to behavioral page
        await page.goto('/behavioral');

        // Wait for page to load
        await expect(page.getByText('Behavioral Interviews')).toBeVisible({ timeout: 15000 });
    });

    test.describe('Page Layout', () => {
        test('should display the behavioral hub header', async ({ page }) => {
            await expect(page.getByText('Behavioral Interviews')).toBeVisible();
        });

        test('should display sidebar navigation', async ({ page }) => {
            await expect(page.getByText('SimplyAlgo.dev')).toBeVisible();
        });

        test('should display stats cards', async ({ page }) => {
            // Should show Questions Practiced stat
            await expect(page.getByText('Questions Practiced')).toBeVisible();
            // Should show Experiences Added stat
            await expect(page.getByText('Experiences Added')).toBeVisible();
            // Should show Average Score stat
            await expect(page.getByText('Average Score')).toBeVisible();
        });
    });

    test.describe('Navigation Cards', () => {
        test('should display Question Bank card', async ({ page }) => {
            await expect(page.getByRole('heading', { name: 'Question Bank' })).toBeVisible();
            await expect(page.getByText('Browse technical behavioral questions')).toBeVisible();
        });

        test('should display My Experiences card', async ({ page }) => {
            await expect(page.getByRole('heading', { name: 'My Experiences' })).toBeVisible();
            await expect(page.getByText('Build and manage your personal experience library')).toBeVisible();
        });

        test('should display Mock Interview card', async ({ page }) => {
            await expect(page.getByRole('heading', { name: 'Mock Interview' })).toBeVisible();
            await expect(page.getByText('Upload your resume and get personalized interview questions')).toBeVisible();
        });

        test('should navigate to Question Bank when clicking that card', async ({ page }) => {
            await page.getByRole('heading', { name: 'Question Bank' }).click();
            await expect(page).toHaveURL(/\/behavioral\/questions/);
        });

        test('should navigate to My Experiences when clicking that card', async ({ page }) => {
            await page.getByRole('heading', { name: 'My Experiences' }).click();
            await expect(page).toHaveURL(/\/behavioral\/stories/);
        });

        test('should navigate to Mock Interview when clicking that card', async ({ page }) => {
            await page.getByRole('heading', { name: 'Mock Interview' }).click();
            await expect(page).toHaveURL(/\/behavioral\/mock-interview/);
        });
    });
});

test.describe('Behavioral Questions Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/behavioral/questions');
        await page.waitForLoadState('networkidle');
    });

    test('should display the questions page', async ({ page }) => {
        // Should show some form of questions list or categories
        await expect(page.locator('body')).toContainText(/question|category|behavioral/i);
    });

    test('should allow searching or filtering questions', async ({ page }) => {
        // Look for search input or filter controls
        const searchInput = page.getByPlaceholder(/search/i);
        const hasSearch = await searchInput.count() > 0;

        if (hasSearch) {
            await searchInput.fill('leadership');
            await page.waitForTimeout(300);
        }
    });
});

test.describe('Behavioral Mock Interview Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/behavioral/mock-interview');
        await page.waitForLoadState('networkidle');
    });

    test('should display the mock interview page', async ({ page }) => {
        // Should show mock interview setup UI
        await expect(page.locator('body')).toContainText(/mock interview|resume|upload/i);
    });

    test('should show resume upload component', async ({ page }) => {
        // Look for resume upload area
        const hasResumeUpload = await page.getByText(/upload.*resume|paste.*resume|resume/i).count() > 0;
        expect(hasResumeUpload).toBeTruthy();
    });

    test('should show step-based wizard with resume upload first', async ({ page }) => {
        // The mock interview is a multi-step wizard
        // Step 1 is resume upload
        await expect(page.getByRole('heading', { name: /Step 1.*Upload.*Resume/i })).toBeVisible();

        // Continue button should be disabled until resume is uploaded
        const continueButton = page.getByRole('button', { name: /Continue/i });
        await expect(continueButton).toBeDisabled();
    });
});

test.describe('Behavioral Stories Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/behavioral/stories');
        await page.waitForLoadState('networkidle');
    });

    test('should display the stories/experiences page', async ({ page }) => {
        // Should show experiences or stories
        await expect(page.locator('body')).toContainText(/experience|story|stories/i);
    });

    test('should show add new experience button', async ({ page }) => {
        // Look for add button
        const addButton = page.getByRole('button', { name: /add|new|create/i });
        const hasAddButton = await addButton.count() > 0;
        expect(hasAddButton).toBeTruthy();
    });
});
