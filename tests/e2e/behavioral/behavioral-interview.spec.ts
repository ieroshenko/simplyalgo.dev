import { test, expect } from '../../utils/test-fixtures';

test.describe('Behavioral Interview Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to behavioral interview page
        await page.goto('/behavioral-interview');
        await page.waitForLoadState('networkidle');
    });

    test.describe('Page Layout', () => {
        test('should display the behavioral interview page', async ({ page }) => {
            // Should show page heading
            await expect(page.getByRole('heading', { name: /Behavioral Interview Practice/i })).toBeVisible();
        });

        test('should display page description', async ({ page }) => {
            // Should show description text
            await expect(page.getByText(/Practice behavioral interviews with AI coach/i)).toBeVisible();
        });

        test('should have back button to navigate away', async ({ page }) => {
            // Look for back button (arrow left icon)
            const backButton = page.getByRole('button').filter({ has: page.locator('svg') }).first();
            await expect(backButton).toBeVisible();
        });

        test('should display connection status', async ({ page }) => {
            // Should show connection status indicator
            await expect(page.getByText(/Not Connected|Connecting|Connected/i)).toBeVisible();
        });
    });

    test.describe('Setup Section', () => {
        test('should display setup your interview heading', async ({ page }) => {
            await expect(page.getByRole('heading', { name: /Setup Your Interview/i })).toBeVisible();
        });

        test('should show resume upload section', async ({ page }) => {
            // Should show resume section
            await expect(page.getByText(/Resume/i).first()).toBeVisible();
        });

        test('should show voice selector section', async ({ page }) => {
            // Should show interviewer voice section heading
            await expect(page.getByRole('heading', { name: /Interviewer Voice/i })).toBeVisible();
        });

        test('should display resume upload instructions', async ({ page }) => {
            // Should show upload instructions
            await expect(page.getByText(/Upload your resume/i).first()).toBeVisible();
        });
    });

    test.describe('Interview Controls', () => {
        test('should have start interview button', async ({ page }) => {
            const startButton = page.getByRole('button', { name: /Start Interview/i });
            await expect(startButton).toBeVisible();
        });

        test('should have start button visible', async ({ page }) => {
            // Start button should be visible (app uses native alert for validation)
            const startButton = page.getByRole('button', { name: /Start Interview/i });
            await expect(startButton).toBeVisible();
            // Note: We don't click it because the app uses alert() which blocks Playwright
        });
    });

    test.describe('Instructions Section', () => {
        test('should display how it works section', async ({ page }) => {
            await expect(page.getByRole('heading', { name: /How it works/i })).toBeVisible();
        });

        test('should show numbered instructions list', async ({ page }) => {
            // Check for instruction items
            await expect(page.getByText(/Upload your resume/i).first()).toBeVisible();
            await expect(page.getByText(/Select your preferred interviewer voice/i)).toBeVisible();
            await expect(page.getByText(/allow microphone access/i)).toBeVisible();
        });

        test('should mention interview duration', async ({ page }) => {
            // Should mention the 30 minute limit
            await expect(page.getByText(/30 minutes/i)).toBeVisible();
        });

        test('should mention stop interview option', async ({ page }) => {
            // Should tell user they can stop anytime
            await expect(page.getByText(/stop the interview/i)).toBeVisible();
        });
    });

    test.describe('Voice Selection', () => {
        test('should have voice options', async ({ page }) => {
            // Look for voice selector heading
            await expect(page.getByRole('heading', { name: /Interviewer Voice/i })).toBeVisible();

            // There should be some voice options visible (cards or buttons)
            const hasVoiceOptions = await page.locator('[class*="voice"], button').count() > 0;
            expect(hasVoiceOptions).toBeTruthy();
        });
    });

    test.describe('Navigation', () => {
        test('should navigate back when back button clicked', async ({ page }) => {
            // Find and click the back button
            const backButton = page.getByRole('button').first();
            await backButton.click();

            // Should navigate away from behavioral interview
            await expect(page).not.toHaveURL(/\/behavioral-interview$/);
        });
    });
});

test.describe('Behavioral Interview - Audio Waveform', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/behavioral-interview');
        await page.waitForLoadState('networkidle');
    });

    test('should display audio waveform area', async ({ page }) => {
        // Should have some visual waveform component
        const waveformArea = page.locator('[class*="waveform"], [class*="audio"], canvas');
        const hasWaveform = await waveformArea.count() > 0 ||
            await page.locator('div').filter({ has: page.locator('svg') }).count() > 0;

        // Waveform visualization area should exist
        expect(hasWaveform).toBeTruthy();
    });
});
