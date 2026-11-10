import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

beforeEach(() => {
  delete process.env.CF_STATIC_EXPORT;
  delete process.env.PREBUILD_PUBLIC_PAGES;
  vi.resetModules();
  apiFetch.mockReset();
});

afterEach(() => {
  delete process.env.CF_STATIC_EXPORT;
  delete process.env.PREBUILD_PUBLIC_PAGES;
});

it("builds the standalone server without fetching backend data", async () => {
  const params = await import("./staticParams");
  const values = await Promise.all([
    params.getStaticReadParams(),
    params.getStaticAuthorParams(),
    params.getStaticOrgParams(),
    params.getStaticExternalAuthorParams(),
    params.getStaticExternalOrgParams(),
    params.getStaticSeriesParams(),
    params.getStaticTagParams(),
  ]);
  expect(values).toEqual([[], [], [], [], [], [], []]);
  expect(apiFetch).not.toHaveBeenCalled();
});

it("still enumerates backend pages for static export", async () => {
  process.env.CF_STATIC_EXPORT = "1";
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "/public-personas") return [{ id: "author-1" }];
    if (path === "/public-organizations") return [{ id: "org-1" }];
    return { scripts: [{ id: "script-1", tags: [{ name: "奇幻" }] }], externalPublicScripts: [] };
  });
  const params = await import("./staticParams");
  expect(await params.getStaticReadParams()).toEqual([{ id: "script-1" }]);
  expect(await params.getStaticAuthorParams()).toEqual([{ id: "author-1" }]);
  expect(await params.getStaticOrgParams()).toEqual([{ id: "org-1" }]);
  expect(await params.getStaticTagParams()).toEqual([{ name: "奇幻" }]);
});
