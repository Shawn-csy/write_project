
import { test, expect } from '@playwright/test';

test.describe('Gallery Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('**/api/public-scripts*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 's1',
                    title: 'Searchable Script',
                    author: { displayName: 'Author A' },
                    tags: ['tag1']
                }, {
                    id: 's2',
                    title: 'Other Script',
                    author: { displayName: 'Author B' },
                    tags: ['tag2']
                }])
            });
        });
        
        await page.route('**/api/public-personas', async route => {
             await route.fulfill({ 
                 status: 200, 
                 contentType: 'application/json', 
                 body: JSON.stringify([{
                     id: 'p1',
                     displayName: 'Famous Author',
                     tags: ['pro']
                 }]) 
             });
        });
        
        await page.route('**/api/public-organizations', async route => {
             await route.fulfill({ 
                 status: 200, 
                 contentType: 'application/json', 
                 body: JSON.stringify([{
                     id: 'o1',
                     name: 'Big Studio',
                     tags: ['studio']
                 }]) 
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
        // Assuming search bar is present
        const searchInput = page.getByPlaceholder('搜尋劇本...');
        await expect(searchInput).toBeVisible();
        
        // Type something
        await searchInput.fill('NonExistentScriptXYZ');
        
        // Expect empty state
        await expect(page.getByText('找不到符合條件的劇本')).toBeVisible();
        
        // Clear search
        await page.getByRole('button', { name: /清除篩選/ }).click();
        await expect(page.getByText('找不到符合條件的劇本')).not.toBeVisible();
    });
});
