import { test, expect } from '@playwright/test';

test.describe('Reader Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public-terms-config*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: false,
          version: '',
          requiredChecks: [],
          sections: [],
        }),
      });
    });

    await page.route('**/api/public-bundle*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scripts: [
            {
              id: 'test-script-1',
              title: 'Test Script',
              content:
                'Title: Test Script\nAuthor: Test Author\nLicenseCommercial: allow\nLicenseDerivative: allow\nLicenseNotify: required\n\nINT. TEST ROOM - DAY\n\nThis is a test script content.',
              tags: ['drama'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          personas: [],
          organizations: [],
          topTags: ['drama'],
        }),
      });
    });

    await page.route('**/api/public-scripts/test-script-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-script-1',
          title: 'Test Script',
          content:
            'Title: Test Script\nAuthor: Test Author\nLicenseCommercial: allow\nLicenseDerivative: allow\nLicenseNotify: required\n\nINT. TEST ROOM - DAY\n\nThis is a test script content.',
          author: { displayName: 'Test Author' },
        }),
      });
    });
  });

  test('should navigate from home to reader correctly', async ({ page }) => {
    await page.goto('/');

    const targetCard = page.locator('div.group.relative:has(h3:has-text("Test Script"))').first();
    await expect(targetCard).toBeVisible();
    await targetCard.click();

    await expect(page).toHaveURL(/\/read\/test-script-1/);
    await expect(page.locator('.script-renderer')).toBeVisible();
    await expect(page.locator('[data-guide-id="public-guide-back"]')).toBeVisible();
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto('/read/test-script-1');
    await expect(page.locator('.script-renderer')).toBeVisible();

    const backButton = page.locator('[data-guide-id="public-guide-back"]').first();
    await expect(backButton).toBeVisible();
    await backButton.click();

    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(page.getByText('公開台本').first()).toBeVisible();
  });
});
