/**
 * Phase 6 — Homepage hero ultra-wide black-band smoke test
 *
 * Renders the public homepage hero at 2560×900 and checks that the ACTIVE
 * slide's left and right edge bands (20px wide) are not predominantly black.
 * A mostly-dark edge band is the visual symptom of either a missing ultra-wide
 * crop on an image banner or a brand slide whose full-frame backdrop does not
 * cover the carousel edge.
 *
 * This is a smoke test, not a full visual QA. It catches the specific failure
 * class described in docs/homepage-hero-banner-placement-plan.md: edge bands
 * that are >85% dark pixels. It does NOT catch subtler composition issues
 * (dark subject near an edge, blur-fill not activated, etc.) — those require
 * the manual QA checklist in the plan doc.
 *
 * Requirements:
 *   PUBLIC_APP_URL or PLAYWRIGHT_BASE_URL env var must point to a running
 *   public Next.js instance.
 *
 * Skipped when neither env var is set so it never blocks CI that only runs the
 * Vite admin dev server.
 *
 * To run:
 *   PUBLIC_APP_URL=http://localhost:3000 npx playwright test hero-banner-ultra-wide
 */

import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? '';

/** Band width in logical pixels sampled from each edge. */
const BAND_WIDTH = 20;
/** Max fraction of sampled pixels that may be dark before the test fails. */
const MAX_DARK_FRACTION = 0.85;
/** A pixel is "dark" when all RGB channels are below this value (0–255). */
const DARK_THRESHOLD = 30;

/** Parse a PNG buffer and count the fraction of pixels that are dark. */
function darkFractionFromPng(buf: Buffer): number {
  const png = PNG.sync.read(buf);
  let dark = 0;
  const total = png.width * png.height;
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    if (r < DARK_THRESHOLD && g < DARK_THRESHOLD && b < DARK_THRESHOLD) dark++;
  }
  return total > 0 ? dark / total : 0;
}

test.describe('Homepage hero — ultra-wide black-band smoke test', () => {
  test.skip(!PUBLIC_APP_URL, 'PUBLIC_APP_URL/PLAYWRIGHT_BASE_URL not set — skipping public-app e2e');

  test('active slide has no black side bands at 2560px width', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 900 });
    await page.goto(PUBLIC_APP_URL);

    // Wait for the ACTIVE slide frame (data-active="true" set by PublicHeroMarquee).
    const activeFrame = page.locator('[data-testid="hero-slide-frame"][data-active="true"]');
    await expect(activeFrame).toBeVisible({ timeout: 10_000 });

    // Wait for images inside the ACTIVE slide only. Brand slides may contain no
    // images; those should still be inspected for black side bands.
    await page.waitForFunction(() => {
      const frame = document.querySelector('[data-testid="hero-slide-frame"][data-active="true"]');
      if (!frame) return false;
      const imgs = frame.querySelectorAll('img');
      return imgs.length === 0 || Array.from(imgs).every((img) => (img as HTMLImageElement).complete);
    }, undefined, { timeout: 15_000 });

    const box = await activeFrame.boundingBox();
    if (!box) throw new Error('Active hero-slide-frame has no bounding box');

    const clipHeight = Math.min(Math.round(box.height), 800);
    const leftX = Math.round(box.x);
    const rightX = Math.round(box.x + box.width) - BAND_WIDTH;
    const topY = Math.round(box.y);

    const [leftBand, rightBand] = await Promise.all([
      page.screenshot({ clip: { x: leftX, y: topY, width: BAND_WIDTH, height: clipHeight } }),
      page.screenshot({ clip: { x: rightX, y: topY, width: BAND_WIDTH, height: clipHeight } }),
    ]);

    const leftDark = darkFractionFromPng(leftBand);
    const rightDark = darkFractionFromPng(rightBand);

    expect(
      leftDark,
      `Left edge band is ${(leftDark * 100).toFixed(0)}% dark pixels. ` +
      `For image slides, set 超寬焦點 or switch to 模糊補邊. For brand slides, fix the full-frame backdrop.`,
    ).toBeLessThan(MAX_DARK_FRACTION);

    expect(
      rightDark,
      `Right edge band is ${(rightDark * 100).toFixed(0)}% dark pixels. ` +
      `For image slides, set 超寬焦點 or switch to 模糊補邊. For brand slides, fix the full-frame backdrop.`,
    ).toBeLessThan(MAX_DARK_FRACTION);
  });
});
