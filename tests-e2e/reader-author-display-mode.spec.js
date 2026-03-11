import { test, expect } from "@playwright/test";

const mockPublicScript = (id, authorDisplayMode) => ({
  id,
  title: `Display Mode ${authorDisplayMode}`,
  content: [
    `Title: Display Mode ${authorDisplayMode}`,
    "Author: 覆蓋作者A",
    `AuthorDisplayMode: ${authorDisplayMode}`,
    "",
    "INT. TEST ROOM - DAY",
    "",
    "This is a test script content.",
  ].join("\n"),
  persona: {
    id: "persona-1",
    displayName: "原作者P",
    avatarUrl: "",
  },
  organization: {
    id: "org-1",
    name: "測試組織O",
    logoUrl: "",
  },
  markerThemeId: "default",
  tags: [],
});

test.describe("Reader Author Display Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("public-reader-guide-seen-v1", "1");
    });

    await page.route("**/api/public-scripts/override-script", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPublicScript("override-script", "override")),
      });
    });

    await page.route("**/api/public-scripts/badge-script", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPublicScript("badge-script", "badge")),
      });
    });

    await page.route("**/api/themes/public", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });

    await page.route("**/api/public-bundle", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ scripts: [], personas: [], organizations: [], topTags: [] }),
      });
    });
  });

  test("override mode should only show overridden author badge", async ({ page }) => {
    await page.goto("/read/override-script");

    await expect(page.locator(".script-renderer")).toBeVisible();
    await expect(page.getByText("覆蓋作者A").first()).toBeVisible();
    await expect(page.getByText("原作者P")).toHaveCount(0);
    await expect(page.getByText("測試組織O")).toHaveCount(0);
  });

  test("badge mode should show original persona and organization badges", async ({ page }) => {
    await page.goto("/read/badge-script");

    await expect(page.locator(".script-renderer")).toBeVisible();
    await expect(page.getByText("原作者P")).toBeVisible();
    await expect(page.getByText("測試組織O")).toBeVisible();
    await expect(page.getByText("覆蓋作者A")).toHaveCount(0);
  });
});

