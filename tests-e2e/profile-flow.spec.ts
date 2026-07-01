import { test, expect } from '@playwright/test';

test.describe('Profile Pages Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('request', request => console.log('>>', request.method(), request.url()));
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        // Mock API responses for author profile
        await page.route('**/*public-personas/author-1*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'author-1',
                    displayName: 'Mock Author Writer',
                    bio: 'This is a mock author bio.',
                    tags: ['Pro writer']
                })
            });
        });

        // Mock API responses for author's scripts
        await page.route('**/*public-scripts*personaId=author-1*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'script-1',
                    title: 'Author mock script'
                }])
            });
        });

        // Mock API responses for org profile
        await page.route('**/*public-organizations/org-1*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'org-1',
                    name: 'Mock Studio Enter',
                    description: 'This is a mock studio description.',
                    website: 'https://mockstudio.test',
                    tags: ['Studio Elite']
                })
            });
        });
        
        // Mock scripts for org
        await page.route('**/*public-scripts*organizationId=org-1*', async route => {
             await route.fulfill({
                 status: 200,
                 contentType: 'application/json',
                 body: JSON.stringify([])
             });
         });
    });

    test('should render Author Profile correctly', async ({ page }) => {
        await page.goto('/author/author-1');
        
        // Wait for the mock author name to appear in the DOM
        await expect(page.locator('text=Mock Author Writer')).toBeVisible({ timeout: 15000 });
        
        // Should show author name
        await expect(page.getByRole('heading', { name: /Mock Author Writer/i })).toBeVisible();
        // Should show author bio
        await expect(page.getByText('This is a mock author bio.')).toBeVisible();
        // Should show tag
        await expect(page.getByText('Pro writer')).toBeVisible();
        // Should show script
        await expect(page.getByRole('heading', { name: 'Author mock script' })).toBeVisible();
    });

    test('should render Organization Profile correctly', async ({ page }) => {
        await page.goto('/org/org-1');
        
        // Wait for the mock org name to appear in the DOM
        await expect(page.locator('text=Mock Studio Enter')).toBeVisible({ timeout: 15000 });

        // Should show org name
        await expect(page.getByRole('heading', { name: /Mock Studio Enter/i })).toBeVisible();
        // Should show org description
        await expect(page.getByText('This is a mock studio description.')).toBeVisible();
        // Should show tag
        await expect(page.getByText('Studio Elite')).toBeVisible();
        // Should show website link
        await expect(page.locator('a[href="https://mockstudio.test"]')).toBeVisible();
    });
});
