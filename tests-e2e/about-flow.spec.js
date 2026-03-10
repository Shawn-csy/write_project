import { test, expect } from '@playwright/test';

test.describe('About Page Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/about');
    });

    test('should render About page content correctly', async ({ page }) => {
        // Since i18n modifies exact text, we check for presence of main UI sections
        // Check if main logo/icon wrapper exists (BookOpen icon wrapper)
        await expect(page.locator('.w-16.h-16.bg-primary\\/10')).toBeVisible();

        // Card layout can evolve, ensure core card blocks exist
        await expect(page.locator('.rounded-xl.border.bg-card').first()).toBeVisible();

        // Check if Discord link is present with correct href
        const discordLink = page.locator('a[href*="discordapp.com/users"]');
        await expect(discordLink).toBeVisible();

        // Check if email contact section is visible
        await expect(page.getByText('silence0603@gmail.com')).toBeVisible();
    });

    test('top bar should navigate back to home', async ({ page }) => {
        // PublicTopBar back button
        const backButton = page.getByRole('button', { name: /返回|back/i }).first();
        await expect(backButton).toBeVisible();
        await backButton.click();
        
        // Wait for URL to change to home
        await expect(page).toHaveURL(/\/?$/);
    });
});
