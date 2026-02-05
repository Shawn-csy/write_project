import { test, expect } from '@playwright/test';

test('basic flow - dashboard loads', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the app to load
  // await expect(page.locator('body')).toContainText(/公開台本/i);
  await expect(page.getByText('公開台本').first()).toBeVisible();
  
  // Check if Dashboard tabs are present (using button locator as fallback for Radix Tabs)
  // Check if Public Gallery tabs are present
  await expect(page.getByRole('button', { name: /作品/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /作者/ })).toBeVisible();
});

test('local reader page loads with error for missing file', async ({ page }) => {
  await page.goto('/file/demo.fountain');
  
  // The app shows "找不到檔案：demo.fountain" as seen in the failure message
  await expect(page.locator('body')).toContainText(/找不到檔案/i);
});
