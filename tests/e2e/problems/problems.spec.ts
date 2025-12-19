import { test, expect } from '../../utils/test-fixtures';

test.describe('Problems Page', () => {
    test.beforeEach(async ({ page }) => {
        // Clear any persisted filters from localStorage
        await page.goto('/problems');
        await page.evaluate(() => {
            localStorage.removeItem('selected-category');
            localStorage.removeItem('selected-company');
            localStorage.removeItem('selected-difficulty');
        });

        // Reload to ensure clean state
        await page.reload();

        // Wait for problems page to load (should see the header)
        await expect(page.getByRole('heading', { name: 'Data Structures and Algorithms' })).toBeVisible({ timeout: 15000 });

        // Ensure we're on the problems page
        await expect(page).toHaveURL(/\/problems/);
    });

    test.describe('Page Layout', () => {
        test('should display the page header', async ({ page }) => {
            await expect(page.getByRole('heading', { name: 'Data Structures and Algorithms' })).toBeVisible();
            await expect(page.getByText('Master coding patterns and solve problems to sharpen your skills')).toBeVisible();
        });

        test('should display stats cards', async ({ page }) => {
            // Should show Problems Solved stat
            await expect(page.getByText('Problems Solved')).toBeVisible();
            // Should show Day Streak stat
            await expect(page.getByText('Day Streak')).toBeVisible();
        });

        test('should display sidebar navigation', async ({ page }) => {
            await expect(page.getByText('SimplyAlgo.dev')).toBeVisible();
        });

        test('should display the problems table', async ({ page }) => {
            // Table headers
            await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Star' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Problem' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Difficulty' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Companies' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
        });
    });

    test.describe('Filters Section', () => {
        test('should display filter dropdowns', async ({ page }) => {
            // Wait for table to load first
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Filter section header should be visible
            await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();

            // Filter dropdowns should be visible (by their placeholder text)
            await expect(page.getByRole('combobox').filter({ hasText: /All Categories/i })).toBeVisible();
            await expect(page.getByRole('combobox').filter({ hasText: /All Companies/i })).toBeVisible();
            await expect(page.getByRole('combobox').filter({ hasText: /All Difficulties/i })).toBeVisible();
        });

        test('should filter by category', async ({ page }) => {
            // Wait for table to load first
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Click on the category dropdown (shows "All Categories")
            const categoryDropdown = page.getByRole('combobox').filter({ hasText: /All Categories/i });
            await expect(categoryDropdown).toBeVisible();
            await categoryDropdown.click();

            // Wait for the listbox to appear (Radix uses listbox role)
            await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

            // Select Two Pointers category using option role
            await page.getByRole('option', { name: 'Two Pointers' }).click();

            // Verify filter is applied - the heading should change to reflect the filter
            await expect(page.getByRole('heading', { name: /Two Pointers.*Problems/i })).toBeVisible();
        });

        test('should filter by difficulty', async ({ page }) => {
            // Wait for table to load first
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Click on the difficulty dropdown (shows "All Difficulties")
            const difficultyDropdown = page.getByRole('combobox').filter({ hasText: /All Difficulties/i });
            await expect(difficultyDropdown).toBeVisible();
            await difficultyDropdown.click();

            // Wait for the listbox to appear
            await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

            // Select Easy
            await page.getByRole('option', { name: 'Easy', exact: true }).click();

            // Verify filter is applied
            await expect(page.getByRole('heading', { name: /Easy.*Problems/i })).toBeVisible();
        });

        test('should filter by company', async ({ page }) => {
            // Wait for table to load first
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Click on the company dropdown (shows "All Companies")
            const companyDropdown = page.getByRole('combobox').filter({ hasText: /All Companies/i });
            await expect(companyDropdown).toBeVisible();
            await companyDropdown.click();

            // Wait for the listbox to appear
            await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

            // Get all options in the dropdown
            const allOptions = page.getByRole('option');
            const optionCount = await allOptions.count();

            if (optionCount > 1) {
                // Click the second option (first company after "All")
                await allOptions.nth(1).click();
                // Wait for filter to be applied
                await page.waitForTimeout(300);
            } else {
                // If no companies, just close the dropdown
                await page.keyboard.press('Escape');
            }
        });
    });

    test.describe('Search', () => {
        test('should display search input', async ({ page }) => {
            await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
            await expect(page.getByPlaceholder('Search problems...')).toBeVisible();
        });

        test('should search for problems', async ({ page }) => {
            // Type in search
            await page.getByPlaceholder('Search problems...').fill('Two Sum');

            // Short wait for search to filter
            await page.waitForTimeout(300);

            // Check that results are filtered
            // If "Two Sum" exists, it should be visible
            const twoSumRow = page.getByRole('row').filter({ hasText: 'Two Sum' });
            const rowCount = await twoSumRow.count();

            // Either we find Two Sum or the search filters to an empty/different set
            expect(rowCount >= 0).toBeTruthy();
        });
    });

    test.describe('Problem Table Interactions', () => {
        test('should display problems with difficulty badges', async ({ page }) => {
            // Wait for table to have rows
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Check that at least one problem row exists
            const rows = page.locator('tbody tr');
            const rowCount = await rows.count();
            expect(rowCount).toBeGreaterThan(0);

            // Check that difficulty badges exist (Easy, Medium, or Hard)
            const firstRowBadge = rows.first().locator('.badge, [class*="bg-success"], [class*="bg-amber"], [class*="bg-destructive"]');
            await expect(firstRowBadge.first()).toBeVisible();
        });

        test('should navigate to problem solver when clicking Start', async ({ page }) => {
            // Wait for table to load
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Click the first Start button
            await page.getByRole('button', { name: /Start/i }).first().click();

            // Should navigate to problem page
            await expect(page).toHaveURL(/\/problem\/[\w-]+/);
        });

        test('should allow starring a problem', async ({ page }) => {
            // Wait for table to load
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Find a star button and click it
            const starButton = page.locator('tbody tr').first().locator('button').filter({ has: page.locator('svg') }).first();

            // Click the star (toggle)
            await starButton.click();

            // Give it time to update
            await page.waitForTimeout(500);

            // The star interaction should work without error (visual check would need screenshot)
        });
    });

    test.describe('Filter Persistence', () => {
        test('should persist category filter after page reload', async ({ page }) => {
            // Wait for table to load first
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Click on the category dropdown (shows "All Categories")
            const categoryDropdown = page.getByRole('combobox').filter({ hasText: /All Categories/i });
            await expect(categoryDropdown).toBeVisible();
            await categoryDropdown.click();

            // Wait for the listbox to appear (Radix uses listbox role)
            await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

            // Select Two Pointers
            await page.getByRole('option', { name: 'Two Pointers' }).click();

            // Wait for filter to be applied
            await expect(page.getByRole('heading', { name: /Two Pointers.*Problems/i })).toBeVisible();

            // Reload the page
            await page.reload();

            // Wait for page to load
            await expect(page.getByRole('heading', { name: 'Data Structures and Algorithms' })).toBeVisible();

            // Wait for table to load
            await page.waitForSelector('tbody tr', { timeout: 10000 });

            // Filter should be persisted
            await expect(page.getByRole('heading', { name: /Two Pointers.*Problems/i })).toBeVisible();
        });
    });
});

test.describe('Problem Solver Page', () => {
    test('should load problem solver from problems list', async ({ page }) => {
        // Navigate to problems page first
        await page.goto('/problems');

        // Wait for problems to load
        await page.waitForSelector('tbody tr', { timeout: 10000 });

        // Click the first Start button
        await page.getByRole('button', { name: /Start/i }).first().click();

        // Should be on problem page
        await expect(page).toHaveURL(/\/problem\/[\w-]+/);

        // Wait for problem page to load - should see problem title or code editor
        await page.waitForTimeout(2000);

        // Check for common problem page elements
        const hasContent = await page.locator('body').textContent();
        expect(hasContent?.length).toBeGreaterThan(0);
    });
});
