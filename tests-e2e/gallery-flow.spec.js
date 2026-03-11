
import { test, expect } from '@playwright/test';

test.describe('Gallery Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses (current page uses /api/public-bundle)
        await page.route('**/api/public-bundle*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    scripts: [{
                        id: 's1',
                        title: 'Searchable Script',
                        persona: { id: 'p1', displayName: 'Author A' },
                        tags: ['tag1']
                    }, {
                        id: 's2',
                        title: 'Other Script',
                        persona: { id: 'p2', displayName: 'Author B' },
                        tags: ['tag2']
                    }],
                    personas: [{
                        id: 'p1',
                        displayName: 'Famous Author',
                        tags: ['pro']
                    }],
                    organizations: [{
                        id: 'o1',
                        name: 'Big Studio',
                        tags: ['studio']
                    }],
                    topTags: ['tag1', 'tag2']
                })
            });
        });

        await page.goto('/');
    });

    test('should switch views correctly', async ({ page }) => {
        // Default is Scripts (作品)
        // Switch to Authors
        await page.getByRole('button', { name: /作者/ }).click();
        await expect(page).toHaveURL(/view=authors/);
        
        // Switch to Orgs
        await page.getByRole('button', { name: /組織/ }).click();
        await expect(page).toHaveURL(/view=orgs/);
        
        // Switch back to Scripts
        await page.getByRole('button', { name: /作品/ }).click();
        await expect(page).toHaveURL(/view=scripts/);
    });

    test('should search and filter', async ({ page }) => {
        const searchInput = page.locator('aside input[placeholder="搜尋劇本..."]').first();
        await expect(searchInput).toBeVisible();
        
        // Type something that should not match
        await searchInput.fill('NonExistentScriptXYZ');
        
        // Expect empty state
        await expect(page.getByText('找不到符合條件的劇本')).toBeVisible();
        
        // Clear search and verify item returns
        await searchInput.fill('');
        await expect(page.getByRole('heading', { name: 'Searchable Script' }).first()).toBeVisible();
        await expect(page.getByText('找不到符合條件的劇本')).not.toBeVisible();
    });
});
