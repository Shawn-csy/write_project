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

test('unknown file route redirects to public gallery', async ({ page }) => {
  await page.goto('/file/demo.fountain');
  
  // Local reader route is removed; unauthenticated should land on public gallery
  await expect(page.getByText('公開台本').first()).toBeVisible();
});
