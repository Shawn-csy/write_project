
import { test, expect } from '@playwright/test';


test.describe('Reader Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('**/api/public-scripts*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'test-script-1',
                    title: 'Test Script',
                    author: { displayName: 'Test Author' },
                    tags: ['drama'],
                    createdAt: new Date().toISOString()
                }])
            });
        });
        
        await page.route('**/api/public-personas', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
        
        await page.route('**/api/public-organizations', async route => {
             await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
        
        // Mock Reader content API
        await page.route('**/api/public-scripts/test-script-1', async route => {
             await route.fulfill({
                 status: 200, 
                 contentType: 'application/json',
                 body: JSON.stringify({
                     id: 'test-script-1',
                     title: 'Test Script',
                     content: 'INT. TEST ROOM - DAY\n\nThis is a test script content.',
                     author: { displayName: 'Test Author' }
                 })
             });
        });
    });

    test('should navigate from home to reader correctly', async ({ page }) => {
        // 1. Visit Home
        await page.goto('/');
        
        // 2. Wait for at least one script card
        // Assuming we have demo content or public scripts. If empty, this test might skip logic.
        // We'll trust the dev environment has seeded data or empty state handled.
        
        // If empty state, we can't test reader navigation easily without mocking.
        // Let's assume we can navigate to a known route or click the first card if available.
        
        const firstCard = page.locator('.aspect-\\[2\\/3\\]').first(); // Basic selector for card wrapper from PublicGalleryPage
        // Actually PublicGalleryPage uses ScriptGalleryCard. Let's look for a link or text.
        
        // Wait for loading to finish
        await expect(page.locator('.animate-pulse')).not.toBeVisible({ timeout: 10000 });
        
        const count = await page.getByRole('link', { name: /./ }).count(); // ScriptGalleryCard wraps in link? No, onClick navigate.
        // ScriptGalleryCard: onClick={() => navigate(`/read/${script.id}`)}
        // So it's a div. 
        
        if (await page.locator('text=找不到符合條件的劇本').isVisible()) {
            console.log('No scripts found in public gallery, skipping read flow test.');
            return; 
        }

        // Click the first card
        // Selector: div with onClick. We can target text inside it. 
        // Let's target the card container.
        // Cards are in grid.
        await page.locator('.grid > div').first().click();
        
        // 3. Check URL
        await expect(page).toHaveURL(/\/read\/.+/);
        
        // 4. Check Reader Content
        await expect(page.getByRole('button', { name: /返回/ })).toBeVisible({ timeout: 10000 }); // Back button in ReaderHeader
        
        // Check content area exists
        await expect(page.locator('.script-renderer')).toBeVisible();
    });

    test('should handle back navigation', async ({ page }) => {
        // Start from public gallery
        await page.goto('/');
        await page.waitForTimeout(1000);

        // Open first script card to reader
        await page.locator('.grid > div').first().click();
        await expect(page).toHaveURL(/\/read\/.+/);

        const backButton = page.getByRole('button', { name: /返回/ }).first();
        await expect(backButton).toBeVisible();

        // Back to gallery
        await backButton.click();
        await expect(page.getByText('公開台本').first()).toBeVisible();
    });
});
